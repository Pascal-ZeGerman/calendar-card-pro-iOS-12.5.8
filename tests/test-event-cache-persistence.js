var assert = require('assert');
require('./setup-globals');
var CalendarCardPro = require('../src-lite/calendar-card-pro.js').CalendarCardPro;

/* Regression tests for the "iPad blank again after the fix" bug:
   the in-memory last-known-good events from the first fetch-fallback fix are
   lost on every page reload / iOS tab eviction, and a CalDAV backend that
   times out (up to 120s) leaves the card with nothing to show.

   Events are therefore cached per entity in localStorage so that
   - a freshly loaded card paints cached events immediately,
   - a failing calendar falls back to its own last-good events while other
     calendars keep updating,
   - stale cache entries are ignored and storage errors never break the card. */

function installStorage() {
  var data = {};
  global.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
    setItem: function (k, v) { data[k] = String(v); },
    removeItem: function (k) { delete data[k]; },
    _data: data
  };
  return global.localStorage;
}

function makeCard(entities, callApiImpl) {
  var card = new CalendarCardPro();
  card._container = { firstChild: null, appendChild: function () {}, removeChild: function () {} };
  card.setConfig({ type: 'custom:calendar-card-pro', entities: entities });
  card._hass = { callApi: callApiImpl };
  card._renders = 0;
  card._messages = [];
  card._render = function () { card._renders++; };
  card._renderMessage = function (text) { card._messages.push(text); };
  return card;
}

function ev(summary) {
  return {
    summary: summary,
    start: { dateTime: '2026-01-01T10:00:00' },
    end: { dateTime: '2026-01-01T11:00:00' }
  };
}

function summaries(card) {
  return card._events.map(function (e) { return e.summary; }).sort();
}

var tests = [];
function test(name, fn) { tests.push({ name: name, fn: fn }); }

/* ── 1. success is persisted; a new card instance with a failing backend shows cached events ── */
test('cached events survive a reload and are shown when the backend fails', function () {
  installStorage();
  var first = makeCard(['calendar.shared'], function () {
    return Promise.resolve([ev('Dentist')]);
  });
  return first._fetchAndRender().then(function () {
    assert.strictEqual(first._events.length, 1);

    /* "Reload": brand new card, nothing in memory, backend times out */
    var second = makeCard(['calendar.shared'], function () {
      return Promise.reject(new Error('Read timed out'));
    });
    return second._fetchAndRender().then(function () {
      assert.deepStrictEqual(summaries(second), ['Dentist']);
      assert.strictEqual(second._messages.indexOf('Calendar data unavailable'), -1,
        'unavailable message must not be shown when a cache exists');
      assert.ok(second._renders >= 1, 'cached events are rendered');
      assert.ok(second._events[0]._entityConfig && second._events[0]._entityConfig.entity === 'calendar.shared',
        '_entityConfig is re-attached to cached events');
    });
  });
});

/* ── 2. cached events paint immediately, before a slow fetch settles ── */
test('cached events are rendered before a slow fetch completes', function () {
  installStorage();
  var seed = makeCard(['calendar.shared'], function () { return Promise.resolve([ev('Dentist')]); });
  return seed._fetchAndRender().then(function () {
    var resolveFetch;
    var slow = makeCard(['calendar.shared'], function () {
      return new Promise(function (resolve) { resolveFetch = resolve; });
    });
    var pending = slow._fetchAndRender();
    assert.deepStrictEqual(summaries(slow), ['Dentist'], 'cache hydrates synchronously');
    assert.strictEqual(slow._renders, 1, 'rendered once from cache');
    assert.strictEqual(slow._messages.indexOf('Loading…'), -1, 'no Loading… flash when cache exists');
    resolveFetch([ev('Fresh')]);
    return pending.then(function () {
      assert.deepStrictEqual(summaries(slow), ['Fresh'], 'fresh data replaces cache');
    });
  });
});

/* ── 3. per-entity fallback: one failing calendar keeps its own last-good events ── */
test('a failing calendar falls back to its own cached events while others update', function () {
  installStorage();
  var phase = 1;
  var card = makeCard(['calendar.a', 'calendar.b'], function (method, path) {
    var isA = path.indexOf('calendars/calendar.a') === 0;
    if (phase === 1) return Promise.resolve([ev(isA ? 'A-old' : 'B-old')]);
    if (isA) return Promise.reject(new Error('Read timed out'));
    return Promise.resolve([ev('B-new')]);
  });
  return card._fetchAndRender().then(function () {
    assert.deepStrictEqual(summaries(card), ['A-old', 'B-old']);
    phase = 2;
    return card._fetchAndRender();
  }).then(function () {
    assert.deepStrictEqual(summaries(card), ['A-old', 'B-new'],
      'A keeps last-good events, B is updated');
  });
});

/* ── 4. stale cache is ignored ── */
test('cache entries older than the max age are ignored', function () {
  var storage = installStorage();
  var seed = makeCard(['calendar.shared'], function () { return Promise.resolve([ev('Old')]); });
  return seed._fetchAndRender().then(function () {
    var key = Object.keys(storage._data)[0];
    assert.ok(key, 'something was persisted');
    var parsed = JSON.parse(storage._data[key]);
    Object.keys(parsed).forEach(function (entity) {
      parsed[entity].savedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    });
    storage._data[key] = JSON.stringify(parsed);

    var card = makeCard(['calendar.shared'], function () { return Promise.reject(new Error('timeout')); });
    return card._fetchAndRender().then(function () {
      assert.strictEqual(card._events.length, 0);
      assert.ok(card._messages.indexOf('Calendar data unavailable') !== -1);
    });
  });
});

/* ── 5. storage failures never break the card ── */
test('throwing localStorage does not break fetch or render', function () {
  global.localStorage = {
    getItem: function () { throw new Error('SecurityError'); },
    setItem: function () { throw new Error('QuotaExceededError'); },
    removeItem: function () { throw new Error('SecurityError'); }
  };
  var card = makeCard(['calendar.shared'], function () { return Promise.resolve([ev('X')]); });
  return card._fetchAndRender().then(function () {
    assert.deepStrictEqual(summaries(card), ['X']);
  });
});

/* ── 6. corrupt cache JSON is tolerated ── */
test('corrupt cache contents are ignored', function () {
  var storage = installStorage();
  var seed = makeCard(['calendar.shared'], function () { return Promise.resolve([ev('Y')]); });
  return seed._fetchAndRender().then(function () {
    var key = Object.keys(storage._data)[0];
    storage._data[key] = '{not json';
    var card = makeCard(['calendar.shared'], function () { return Promise.reject(new Error('timeout')); });
    return card._fetchAndRender().then(function () {
      assert.ok(card._messages.indexOf('Calendar data unavailable') !== -1);
    });
  });
});

/* ── 7. no localStorage at all (Node default) still behaves like before ── */
test('works when localStorage is not defined', function () {
  delete global.localStorage;
  var card = makeCard(['calendar.shared'], function () { return Promise.resolve([ev('Z')]); });
  return card._fetchAndRender().then(function () {
    assert.deepStrictEqual(summaries(card), ['Z']);
  });
});

/* ── runner (sequential: tests mutate global.localStorage) ── */
var chain = Promise.resolve();
tests.forEach(function (t) {
  chain = chain.then(function () {
    return Promise.resolve().then(t.fn).then(function () {
      console.log('PASS: ' + t.name);
    });
  });
});
chain.catch(function (err) {
  console.error('FAIL:', err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
