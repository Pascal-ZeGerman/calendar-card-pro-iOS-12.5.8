var assert = require('assert');
require('./setup-globals');
var m = require('../src-lite/calendar-card-pro.js');

/* Regression tests for the "kiosk shows UTC" bug: the card used the *browser*
   time zone for display, day bucketing and the fetch window, ignoring Home
   Assistant's configured / profile time zone. HA sends every event dateTime
   with its own offset, so only presentation and the query window were wrong.

   `time_zone` card option: 'auto' (default) | 'server' | 'local' | IANA name.
   auto => follow hass.locale.time_zone ('server' => hass.config.time_zone). */

var NY = 'America/New_York';

function setBrowserTz(tz) {
  process.env.TZ = tz;
  /* sanity: make sure Node really switched zones */
  var probe = new Date(2026, 0, 15, 12, 0, 0).toISOString();
  var expected = {
    'UTC': '2026-01-15T12:00:00.000Z',
    'America/New_York': '2026-01-15T17:00:00.000Z',
    'Pacific/Auckland': '2026-01-14T23:00:00.000Z' /* NZDT, +13:00 */
  }[tz];
  assert.strictEqual(probe, expected, 'process TZ switched to ' + tz);
}

function hhmm(d) {
  return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
}
function ymd(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

var EV = {
  summary: 'Dentist',
  start: { dateTime: '2026-10-10T22:30:00-04:00' },
  end: { dateTime: '2026-10-10T23:30:00-04:00' }
};

/* ── 1. resolveTimeZone ── */
(function () {
  setBrowserTz('UTC');
  var hassServer = { config: { time_zone: NY }, locale: { time_zone: 'server' } };
  var hassLocal = { config: { time_zone: NY }, locale: { time_zone: 'local' } };

  assert.strictEqual(m.resolveTimeZone(hassServer, {}), NY, 'auto + profile server => HA zone');
  assert.strictEqual(m.resolveTimeZone(hassServer, { time_zone: 'auto' }), NY);
  assert.strictEqual(m.resolveTimeZone(hassLocal, {}), null, 'auto + profile local => browser');
  assert.strictEqual(m.resolveTimeZone(hassLocal, { time_zone: 'server' }), NY, 'explicit server');
  assert.strictEqual(m.resolveTimeZone(hassServer, { time_zone: 'local' }), null, 'explicit local');
  assert.strictEqual(m.resolveTimeZone(hassLocal, { time_zone: 'Europe/Berlin' }), 'Europe/Berlin', 'explicit IANA');
  assert.strictEqual(m.resolveTimeZone(hassLocal, { time_zone: 'Not/AZone' }), null, 'invalid IANA falls back to browser');
  assert.strictEqual(m.resolveTimeZone(null, {}), null, 'no hass');
  assert.strictEqual(m.resolveTimeZone({}, { time_zone: 'server' }), null, 'server requested but hass has no config');
  setBrowserTz(NY);
  assert.strictEqual(m.resolveTimeZone(hassServer, {}), null, 'zone equal to browser zone is a no-op');
  console.log('PASS: resolveTimeZone matrix');
})();

/* ── 2. baseline: without a zone the browser zone is used (documents the bug) ── */
(function () {
  setBrowserTz('UTC');
  m.setActiveTimeZone(null);
  var s = m.eventStart(EV);
  assert.strictEqual(hhmm(s), '02:30', 'UTC browser, no HA zone: shifted');
  assert.strictEqual(ymd(s), '2026-10-11', 'and lands on the next day');
  console.log('PASS: baseline (no zone) still follows the browser');
})();

/* ── 3. HA zone applied: event shown in New York time on the right day ── */
(function () {
  ['UTC', 'Pacific/Auckland'].forEach(function (browser) {
    setBrowserTz(browser);
    m.setActiveTimeZone(NY);
    var s = m.eventStart(EV);
    var e = m.eventEnd(EV);
    assert.strictEqual(hhmm(s), '22:30', browser + ': start wall-clock');
    assert.strictEqual(hhmm(e), '23:30', browser + ': end wall-clock');
    assert.strictEqual(ymd(s), '2026-10-10', browser + ': day bucket');
    assert.strictEqual(m.formatTime(s, true), '22:30', browser + ': formatted 24h');
  });
  m.setActiveTimeZone(null);
  console.log('PASS: events display in the HA zone regardless of browser zone');
})();

/* ── 4. all-day events are wall-clock dates and must not shift ── */
(function () {
  setBrowserTz('Pacific/Auckland');
  m.setActiveTimeZone(NY);
  var ev = { summary: 'Holiday', start: { date: '2026-10-12' }, end: { date: '2026-10-13' } };
  assert.strictEqual(ymd(m.eventStart(ev)), '2026-10-12');
  assert.strictEqual(ymd(m.eventEnd(ev)), '2026-10-12', 'exclusive end date minus one day');
  m.setActiveTimeZone(null);
  console.log('PASS: all-day events do not shift');
})();

/* ── 5. fromZonedLocal / toZonedLocal round-trip incl. DST boundaries ── */
(function () {
  setBrowserTz('UTC');
  m.setActiveTimeZone(NY);
  function midnightISO(y, mo, d) { return m.fromZonedLocal(new Date(y, mo, d, 0, 0, 0, 0)).toISOString(); }
  assert.strictEqual(midnightISO(2026, 9, 10), '2026-10-10T04:00:00.000Z', 'EDT midnight');
  assert.strictEqual(midnightISO(2026, 0, 15), '2026-01-15T05:00:00.000Z', 'EST midnight');
  assert.strictEqual(midnightISO(2026, 2, 8), '2026-03-08T05:00:00.000Z', 'day before spring-forward is EST');
  assert.strictEqual(midnightISO(2026, 2, 9), '2026-03-09T04:00:00.000Z', 'day after spring-forward is EDT');
  assert.strictEqual(midnightISO(2026, 10, 1), '2026-11-01T04:00:00.000Z', 'fall-back day starts EDT');
  assert.strictEqual(midnightISO(2026, 10, 2), '2026-11-02T05:00:00.000Z', 'day after fall-back is EST');

  var back = m.toZonedLocal(new Date('2026-11-02T05:00:00.000Z'));
  assert.strictEqual(hhmm(back), '00:00');
  assert.strictEqual(ymd(back), '2026-11-2');
  m.setActiveTimeZone(null);
  console.log('PASS: zoned <-> instant conversion incl. DST days');
})();

/* ── 6. the fetch window is New York midnight, not browser midnight ── */
(function () {
  setBrowserTz('UTC');
  var paths = [];
  var card = new m.CalendarCardPro();
  card._container = { firstChild: null, appendChild: function () {}, removeChild: function () {} };
  card.setConfig({ type: 'custom:calendar-card-pro', entities: ['calendar.shared'], days_to_show: 3 });
  card._render = function () {};
  card._renderMessage = function () {};
  card._hass = {
    config: { time_zone: NY },
    locale: { time_zone: 'server' },
    callApi: function (method, path) { paths.push(path); return Promise.resolve([]); }
  };
  card._fetchAndRender().then(function () {
    assert.strictEqual(paths.length, 1);
    var start = /start=([^&]+)/.exec(paths[0])[1];
    var end = /end=([^&]+)/.exec(paths[0])[1];
    assert.ok(/T0[45]:00:00\.000Z$/.test(start), 'start is NY midnight (04:00Z/05:00Z), got ' + start);
    assert.ok(/T0[34]:59:59\.999Z$/.test(end), 'end is NY 23:59:59.999 (03:59Z/04:59Z next day), got ' + end);

    /* profile 'local' => unchanged behaviour: UTC browser midnight */
    var paths2 = [];
    var card2 = new m.CalendarCardPro();
    card2._container = card._container;
    card2.setConfig({ type: 'custom:calendar-card-pro', entities: ['calendar.shared'], days_to_show: 3 });
    card2._render = function () {};
    card2._renderMessage = function () {};
    card2._hass = {
      config: { time_zone: NY },
      locale: { time_zone: 'local' },
      callApi: function (method, path) { paths2.push(path); return Promise.resolve([]); }
    };
    return card2._fetchAndRender().then(function () {
      var start2 = /start=([^&]+)/.exec(paths2[0])[1];
      assert.ok(/T00:00:00\.000Z$/.test(start2), 'local profile keeps browser midnight, got ' + start2);
      console.log('PASS: fetch window uses the resolved zone (auto => profile)');
    });
  }).catch(function (err) {
    console.error('FAIL:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  });
})();
