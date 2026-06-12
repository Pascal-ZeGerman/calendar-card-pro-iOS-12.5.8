var assert = require('assert');
require('./setup-globals');
var fns = require('../src-lite/calendar-card-pro.js');
var renderEventTimeText = fns.renderEventTimeText;

/* ── fixtures ── */

var allDayEv = { start: { date: '2026-06-09' }, end: { date: '2026-06-10' } };
var timedEv  = { start: { dateTime: '2026-06-09T14:00:00' }, end: { dateTime: '2026-06-09T15:30:00' } };
var badEndEv = { start: { dateTime: '2026-06-09T14:00:00' }, end: { dateTime: 'not-a-date' } };
var noEndEv  = { start: { dateTime: '2026-06-09T14:00:00' } };

var cfgFull = { show_end_time: true };
var cfgNoEnd = { show_end_time: false };

/* ── tests ── */

/* All-day always returns 'All day' */
assert.strictEqual(
  renderEventTimeText(allDayEv, cfgFull, 'system', false),
  'All day',
  'all-day event returns "All day"'
);

/* Continuation flag takes priority over time rendering */
assert.strictEqual(
  renderEventTimeText(timedEv, cfgFull, 'system', true),
  'Continues',
  'continuation day returns "Continues"'
);

/* Timed event: start only when show_end_time is false */
var startOnlyText = renderEventTimeText(timedEv, cfgNoEnd, 'system', false);
assert.ok(startOnlyText.length > 0, 'timed event with show_end_time=false returns non-empty text');
assert.ok(startOnlyText.indexOf('–') === -1, 'no em-dash when show_end_time is false');

/* Timed event: start + end separator present when show_end_time is true */
var withEndText = renderEventTimeText(timedEv, cfgFull, 'system', false);
assert.ok(withEndText.indexOf('–') !== -1, 'em-dash present when show_end_time is true and end exists');

/* NaN end-dateTime falls back gracefully — no crash, no em-dash */
var nanEndText = renderEventTimeText(badEndEv, cfgFull, 'system', false);
assert.ok(nanEndText.length > 0, 'NaN end still returns start time');
assert.ok(nanEndText.indexOf('–') === -1, 'no em-dash when eventEnd() returns null (NaN guard)');

/* Missing ev.end — should show start only */
var noEndText = renderEventTimeText(noEndEv, cfgFull, 'system', false);
assert.ok(noEndText.length > 0, 'missing end still returns start time');
assert.ok(noEndText.indexOf('–') === -1, 'no em-dash when ev.end is absent');

/* Null start → empty string */
var nullStartEv = { start: { dateTime: 'not-a-date' } };
assert.strictEqual(
  renderEventTimeText(nullStartEv, cfgFull, 'system', false),
  '',
  'unparseable start returns empty string'
);

console.log('PASS: all renderEventTimeText tests');
