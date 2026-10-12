var assert = require('assert');
require('./setup-globals');

/* Kiosk iPad (iOS 12.5.8) regression: the JS runtime can be INCONSISTENT —
   Date's local getters/constructor follow the device zone (New York) while
   Intl.DateTimeFormat's *default* zone is UTC. The card built "zoned-local"
   Dates correctly but then formatted them with Intl's default zone, so every
   time was shown in UTC (+4h in EDT) even with the time_zone fix.

   The model below reproduces that runtime: process TZ = New York, and every
   Intl.DateTimeFormat created WITHOUT an explicit timeZone silently uses UTC. */

process.env.TZ = 'America/New_York';
var RealDTF = Intl.DateTimeFormat;
function PatchedDTF(locale, opts) {
  var o = {};
  var k;
  if (opts) for (k in opts) o[k] = opts[k];
  if (o.timeZone === undefined) o.timeZone = 'UTC';
  return new RealDTF(locale, o);
}
PatchedDTF.prototype = RealDTF.prototype;
PatchedDTF.supportedLocalesOf = RealDTF.supportedLocalesOf;
Intl.DateTimeFormat = PatchedDTF;

var m = require('../src-lite/calendar-card-pro.js');
var NY = 'America/New_York';
var EV = {
  summary: 'Dinner',
  start: { dateTime: '2026-10-13T19:00:00-04:00' },
  end: { dateTime: '2026-10-13T20:00:00-04:00' }
};

/* sanity: the model really is inconsistent */
assert.strictEqual(new Date(2026, 9, 13, 19, 0).getHours(), 19, 'Date local getters are New York');
assert.strictEqual(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false })
  .format(new Date(2026, 9, 13, 19, 0)), '23', 'Intl default zone is UTC in this model');

/* 1. with the HA zone resolved: 7 PM EDT must display as 19:00 / 7:00 PM */
m.setActiveTimeZone(NY);
var s = m.eventStart(EV);
var e = m.eventEnd(EV);
assert.strictEqual(m.formatTime(s, true), '19:00', '24h start shows New York time');
assert.strictEqual(m.formatTime(e, true), '20:00', '24h end');
assert.ok(/^7:00\s?pm$/i.test(m.formatTime(s, false)), '12h start, got ' + m.formatTime(s, false));
assert.ok(/^8:00\s?pm$/i.test(m.formatTime(e, false)), '12h end, got ' + m.formatTime(e, false));
console.log('PASS: times render in the HA zone even when Intl defaults to UTC');

/* 2. profile=local (no zone resolved): fall back to the JS Date zone, still not UTC */
m.setActiveTimeZone(null);
var s2 = m.eventStart(EV);
assert.ok(/^7:00\s?pm$/i.test(m.formatTime(s2, false)), 'no resolved zone: device zone via Date getters');
console.log('PASS: with no resolved zone the Date zone is used, not Intl default');

/* 3. an event near UTC midnight keeps the right day name */
m.setActiveTimeZone(NY);
var late = { start: { dateTime: '2026-10-13T21:30:00-04:00' }, end: { dateTime: '2026-10-13T22:30:00-04:00' } };
var ls = m.eventStart(late);
assert.strictEqual(m.weekdayShort(ls), 'Tue', 'weekday from wall clock, not UTC (Wed)');
assert.strictEqual(m.monthShort(ls), 'Oct');
console.log('PASS: weekday/month names follow the wall clock');

/* 4. resolved zone equal to the reported browser zone must still convert */
Intl.DateTimeFormat = RealDTF;                 /* consistent runtime, NY */
m.setActiveTimeZone(NY);
assert.strictEqual(m.formatTime(m.eventStart(EV), true), '19:00');
assert.strictEqual(m.resolveTimeZone({ config: { time_zone: NY }, locale: { time_zone: 'server' } }, {}), NY,
  'zone is returned even when it matches the browser zone');
console.log('PASS: same-zone browsers are not special-cased');
m.setActiveTimeZone(null);
