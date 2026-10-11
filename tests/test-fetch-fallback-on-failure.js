var assert = require('assert');
require('./setup-globals');
var CalendarCardPro = require('../src-lite/calendar-card-pro.js').CalendarCardPro;

/* Regression test for the "iPad shows no events" bug:
   a transient/total fetch failure (e.g. backend CalDAV timeout) must NOT
   wipe out previously-fetched, successfully-rendered events. Only the very
   first fetch (no prior data) should fall back to the "unavailable" message. */

function makeCard(callApiImpl) {
  var card = new CalendarCardPro();
  card._container = {
    firstChild: null,
    appendChild: function () {},
    removeChild: function () {}
  };
  card.setConfig({ type: 'custom:calendar-card-pro', entities: ['calendar.shared'] });
  card._hass = { callApi: callApiImpl };
  return card;
}

function sampleEvent() {
  return {
    summary: 'Event A',
    start: { dateTime: '2026-01-01T10:00:00' },
    end: { dateTime: '2026-01-01T11:00:00' }
  };
}

/* ── Test 1: success, then total failure — prior events preserved, no "unavailable" ── */
(function () {
  var callCount = 0;
  var card = makeCard(function () {
    callCount++;
    if (callCount === 1) return Promise.resolve([sampleEvent()]);
    return Promise.reject(new Error('Read timed out'));
  });

  var renderCalls = 0;
  var messages = [];
  card._render = function () { renderCalls++; };
  card._renderMessage = function (text) { messages.push(text); };

  card._fetchAndRender().then(function () {
    assert.strictEqual(renderCalls, 1, 'first successful fetch calls _render once');
    assert.strictEqual(card._events.length, 1, 'events populated after first successful fetch');

    return card._fetchAndRender();
  }).then(function () {
    assert.strictEqual(card._events.length, 1, 'events preserved (not wiped) after a subsequent total failure');
    assert.strictEqual(
      messages.indexOf('Calendar data unavailable'),
      -1,
      '"Calendar data unavailable" is NOT shown when previously-good events exist'
    );
    console.log('PASS: total fetch failure after success keeps last known-good events');
    runTest2();
  }).catch(function (err) {
    console.error('FAIL (test 1):', err);
    process.exitCode = 1;
  });
})();

/* ── Test 2: first fetch ever fails — still show "unavailable" (no prior data to fall back on) ── */
function runTest2() {
  var card = makeCard(function () {
    return Promise.reject(new Error('Read timed out'));
  });

  var messages = [];
  card._renderMessage = function (text) { messages.push(text); };

  card._fetchAndRender().then(function () {
    assert.strictEqual(card._events.length, 0, 'events is empty after a first-ever failed fetch');
    assert.ok(
      messages.indexOf('Calendar data unavailable') !== -1,
      '"Calendar data unavailable" IS shown when there was never any prior data'
    );
    console.log('PASS: first-ever fetch failure (no prior data) still shows unavailable message');
  }).catch(function (err) {
    console.error('FAIL (test 2):', err);
    process.exitCode = 1;
  });
}
