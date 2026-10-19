var assert = require('assert');
require('./setup-globals');
var mod = require('../src-lite/calendar-card-pro.js');
var CalendarCardPro = mod.CalendarCardPro;

mod.setActiveTimeZone('UTC');

/* Saved Sun 2026-10-18 14:05 UTC */
var SAVED = Date.UTC(2026, 9, 18, 14, 5);
var SAME_DAY = Date.UTC(2026, 9, 18, 20, 0);
var NEXT_DAY = Date.UTC(2026, 9, 19, 8, 0);

/* ── buildStatusText ── */
assert.strictEqual(mod.buildStatusText('stale', SAVED, SAME_DAY, true), "Couldn't refresh · saved 14:05");
assert.strictEqual(mod.buildStatusText('stale', SAVED, NEXT_DAY, true), "Couldn't refresh · saved Sun 14:05");
assert.strictEqual(mod.buildStatusText('stale', 'x', SAME_DAY, true), "Couldn't refresh");
assert.strictEqual(mod.buildStatusText('stale', NaN, SAME_DAY, true), "Couldn't refresh");
assert.strictEqual(mod.buildStatusText('updating', SAVED, SAME_DAY, true), 'Updating… · saved 14:05');
assert.strictEqual(mod.buildStatusText('updating', null, SAME_DAY, true), 'Updating…');
assert.strictEqual(mod.buildStatusText('bogus', SAVED, SAME_DAY, true), '');
/* future savedAt (clock skew) must not throw */
assert.strictEqual(typeof mod.buildStatusText('stale', NEXT_DAY, SAVED, true), 'string');
console.log('PASS: buildStatusText');

/* ── oldestSavedAt ── */
(function () {
  var now = Date.now();
  var cache = {
    a: { savedAt: now - 1000 },
    b: { savedAt: now - 5000 },
    c: { savedAt: 'x' },
    d: null,
    e: { savedAt: now - 8 * 24 * 60 * 60 * 1000 }
  };
  assert.strictEqual(mod.oldestSavedAt(cache, ['a', 'b', 'c', 'd', 'e', 'missing']), now - 5000);
  assert.strictEqual(mod.oldestSavedAt(cache, ['c', 'd', 'e']), null);
  assert.strictEqual(mod.oldestSavedAt(null, ['a']), null);
  console.log('PASS: oldestSavedAt');
})();

/* ── component ── */
function makeCard(callApiImpl, extraCfg, entities) {
  var card = new CalendarCardPro();
  card._container = { firstChild: null, appendChild: function () {}, removeChild: function () {} };
  card._statusEl = { textContent: '' };
  var cfg = { type: 'custom:calendar-card-pro', entities: entities || ['calendar.a', 'calendar.b'], time_24h: true };
  Object.keys(extraCfg || {}).forEach(function (k) { cfg[k] = extraCfg[k]; });
  card.setConfig(cfg);
  card._hass = { callApi: callApiImpl };
  card._render = function () {};
  card._renderMessage = function (t) { card._lastMessage = t; };
  return card;
}

function ev() {
  return { summary: 'E', start: { dateTime: '2026-10-18T10:00:00' }, end: { dateTime: '2026-10-18T11:00:00' } };
}

function seed(card, names, savedAt) {
  card._eventCache = {};
  names.forEach(function (n) { card._eventCache[n] = { savedAt: savedAt, events: [ev()] }; });
}

var tests = [
  function success() {
    var card = makeCard(function () { return Promise.resolve([ev()]); });
    return card._fetchAndRender().then(function () {
      assert.strictEqual(card._statusEl.textContent, '');
    });
  },
  function oneOfTwoFails() {
    var card = makeCard(function (method, path) {
      return /calendar\.b/.test(path) ? Promise.reject(new Error('timeout')) : Promise.resolve([ev()]);
    });
    seed(card, ['calendar.b'], SAVED);
    return card._fetchAndRender().then(function () {
      assert.strictEqual(card._statusEl.textContent.indexOf("Couldn't refresh · saved"), 0);
    });
  },
  function coldStart() {
    var card = makeCard(function () { return new Promise(function () {}); });
    var rendered = 0;
    card._render = function () { rendered++; };
    seed(card, ['calendar.a', 'calendar.b'], SAVED);
    card._fetchAndRender();
    assert.strictEqual(card._statusEl.textContent.indexOf('Updating…'), 0);
    assert.strictEqual(rendered, 1, 'cached events rendered');
    return Promise.resolve();
  },
  function successThenTotalFailure() {
    var n = 0;
    var card = makeCard(function () {
      n++;
      return n <= 2 ? Promise.resolve([ev()]) : Promise.reject(new Error('timeout'));
    });
    return card._fetchAndRender().then(function () {
      card._eventCache = {};
      return card._fetchAndRender();
    }).then(function () {
      assert.strictEqual(card._statusEl.textContent.indexOf("Couldn't refresh"), 0);
      assert.notStrictEqual(card._lastMessage, 'Calendar data unavailable');
      card._hass.callApi = function () { return Promise.resolve([ev()]); };
      return card._fetchAndRender();
    }).then(function () {
      assert.strictEqual(card._statusEl.textContent, '', 'next success clears');
    });
  },
  function disabled() {
    var card = makeCard(function () { return Promise.reject(new Error('timeout')); }, { show_cache_status: false });
    seed(card, ['calendar.a', 'calendar.b'], SAVED);
    return card._fetchAndRender().then(function () {
      assert.strictEqual(card._statusEl.textContent, '');
    });
  },
  function neverHadData() {
    var card = makeCard(function () { return Promise.reject(new Error('timeout')); });
    card._eventCache = {};
    return card._fetchAndRender().then(function () {
      assert.strictEqual(card._lastMessage, 'Calendar data unavailable');
      assert.strictEqual(card._statusEl.textContent, '');
    });
  },
  function badSavedAt() {
    var card = makeCard(function () { return Promise.reject(new Error('timeout')); });
    seed(card, ['calendar.a', 'calendar.b'], 'x');
    return card._fetchAndRender().then(function () {
      assert.ok(card._statusEl.textContent === '' || card._statusEl.textContent === "Couldn't refresh");
    });
  },
  function noLocalStorage() {
    assert.strictEqual(typeof localStorage, 'undefined');
    var card = makeCard(function () { return Promise.resolve([ev()]); });
    return card._fetchAndRender().then(function () {
      assert.strictEqual(card._statusEl.textContent, '');
    });
  }
];

tests.reduce(function (p, t) {
  return p.then(t).then(function () { console.log('PASS: ' + t.name); });
}, Promise.resolve()).catch(function (err) {
  console.error('FAIL:', err);
  process.exitCode = 1;
});
