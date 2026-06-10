var assert = require('assert');

function parseDate(str) {
  var parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function eventStart(ev) {
  if (!ev || !ev.start) return null;
  if (ev.start.dateTime) {
    var d = new Date(ev.start.dateTime);
    if (isNaN(d.getTime())) { return null; }
    return d;
  }
  if (ev.start.date) return parseDate(ev.start.date);
  return null;
}

function eventEnd(ev) {
  if (!ev || !ev.end) return null;
  if (ev.end.dateTime) {
    var d = new Date(ev.end.dateTime);
    if (isNaN(d.getTime())) { return null; }
    return d;
  }
  if (ev.end.date) {
    var d = parseDate(ev.end.date);
    d.setDate(d.getDate() - 1);
    return d;
  }
  return null;
}

/* Universally-unparseable string (NaN on all JS engines) */
var badEv = { start: { dateTime: 'not-a-date' }, end: { dateTime: 'not-a-date' } };
assert.strictEqual(eventStart(badEv), null, 'eventStart should return null for unparseable dateTime');
assert.strictEqual(eventEnd(badEv), null, 'eventEnd should return null for unparseable dateTime');

/* Valid ISO format should still work */
var goodEv = { start: { dateTime: '2026-06-09T14:00:00' }, end: { dateTime: '2026-06-09T15:00:00' } };
assert.ok(eventStart(goodEv) instanceof Date, 'eventStart should return Date for valid ISO datetime');
assert.ok(eventEnd(goodEv) instanceof Date, 'eventEnd should return Date for valid ISO datetime');

/* All-day event */
var allDayEv = { start: { date: '2026-06-09' }, end: { date: '2026-06-10' } };
assert.ok(eventStart(allDayEv) instanceof Date, 'eventStart should handle date-only events');
assert.ok(eventEnd(allDayEv) instanceof Date, 'eventEnd should subtract 1 day from iCal exclusive end');
assert.strictEqual(eventEnd(allDayEv).getDate(), 9, 'all-day end should be June 9 (exclusive June 10 - 1)');

/* Missing ev.end */
var noEndEv = { start: { dateTime: '2026-06-09T14:00:00' } };
assert.strictEqual(eventEnd(noEndEv), null, 'eventEnd should return null when ev.end is missing');

console.log('PASS: all NaN guard tests');
