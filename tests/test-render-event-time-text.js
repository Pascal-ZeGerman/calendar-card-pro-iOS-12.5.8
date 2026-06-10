var assert = require('assert');

/* ── inline stubs matching src-lite/calendar-card-pro.js ── */

function parseDate(str) {
  var parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function isAllDay(ev) {
  return !!(ev && ev.start && ev.start.date && !ev.start.dateTime);
}

function eventStart(ev) {
  if (!ev || !ev.start) return null;
  if (ev.start.dateTime) {
    var d = new Date(ev.start.dateTime);
    if (isNaN(d.getTime())) return null;
    return d;
  }
  if (ev.start.date) return parseDate(ev.start.date);
  return null;
}

function eventEnd(ev) {
  if (!ev || !ev.end) return null;
  if (ev.end.dateTime) {
    var d = new Date(ev.end.dateTime);
    if (isNaN(d.getTime())) return null;
    return d;
  }
  if (ev.end.date) {
    var d = parseDate(ev.end.date);
    d.setDate(d.getDate() - 1);
    return d;
  }
  return null;
}

function formatTime(date, use24h) {
  var opts = { hour: 'numeric', minute: '2-digit' };
  if (use24h === true) opts.hour12 = false;
  else if (use24h === false) opts.hour12 = true;
  try {
    return new Intl.DateTimeFormat(undefined, opts).format(date);
  } catch (e) {
    var h = date.getHours();
    var min = date.getMinutes();
    return h + ':' + (min < 10 ? '0' : '') + min;
  }
}

function renderEventTimeText(ev, cfg, use24h, isContinuation) {
  if (isAllDay(ev)) return 'All day';
  if (isContinuation) return 'Continues';
  var start = eventStart(ev);
  if (!start) return '';
  var text = formatTime(start, use24h);
  if (cfg.show_end_time) {
    var end = eventEnd(ev);
    if (end) text = text + ' – ' + formatTime(end, use24h);
  }
  return text;
}

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
