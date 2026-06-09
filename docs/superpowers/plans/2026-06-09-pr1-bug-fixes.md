# PR #1 Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 10 bugs found in the PR #1 code review of `src-lite/calendar-card-pro.js` — the vanilla JS rewrite for iOS 12.5.8 / Safari 12 compatibility.

**Architecture:** Approach B — two extracted helpers (`renderEventTimeText`, `_renderMessage`) plus surgical per-function fixes. All changes land in `src-lite/calendar-card-pro.js`, `scripts/verify-bundle.sh`, and `src/utils/helpers.ts`. Six atomic commits.

**Tech Stack:** Vanilla ES2015 JS (no build needed for source edits), Node.js built-in `assert` module for pure-function tests, `git checkout` to work on PR branch.

> **Line numbers:** Each task inserts or removes lines, shifting all subsequent references. Line numbers in later tasks are approximate — always match by the code snippet shown, not the number alone.

---

## Pre-flight: switch to the PR branch

- [ ] **Checkout the PR branch**

```bash
git checkout gsd/phase-01-build-pipeline
```

Expected: `Switched to branch 'gsd/phase-01-build-pipeline'`

Verify you are on the right branch and the source file exists:

```bash
git branch --show-current
wc -l src-lite/calendar-card-pro.js
```

Expected output:
```
gsd/phase-01-build-pipeline
     844 src-lite/calendar-card-pro.js
```

---

## Task 1: NaN date guards in `eventStart` and `eventEnd` (C3)

**Files:**
- Modify: `src-lite/calendar-card-pro.js:270-288`
- Create: `tests/test-nan-guards.js`

**Why:** Safari 12's `Date` parser is strict. `new Date("2026-06-09 14:00")` (space instead of `T`) silently produces `Invalid Date`. The `eventStart(ev) !== null` filter at line 383 then correctly drops the event — but only if `eventStart` returns `null` for bad dates, not a Date object that `.getTime()` returns `NaN` on. Currently it returns the Invalid Date object.

- [ ] **Step 1: Write the failing test**

Create `tests/test-nan-guards.js`:

```js
var assert = require('assert');

/* Minimal stubs of the two functions being fixed — buggy versions */
function eventStart(ev) {
  if (!ev || !ev.start) return null;
  if (ev.start.dateTime) return new Date(ev.start.dateTime);
  return null;
}

function eventEnd(ev) {
  if (!ev || !ev.end) return null;
  if (ev.end.dateTime) return new Date(ev.end.dateTime);
  return null;
}

/* Use a universally-unparseable string (NaN on all engines including Node/V8).
   Note: '2026-06-09 14:00' (space-format) is the Safari 12 real-world trigger,
   but V8 parses it successfully — so we test the NaN-guard mechanism with
   a string that's invalid everywhere. */
var badEv = { start: { dateTime: 'not-a-date' }, end: { dateTime: 'not-a-date' } };

/* Buggy stubs return an Invalid Date object (not null) — assertion should fail */
assert.strictEqual(eventStart(badEv), null,
  'eventStart should return null for unparseable dateTime');
assert.strictEqual(eventEnd(badEv), null,
  'eventEnd should return null for unparseable dateTime');

console.log('PASS: NaN guard tests');
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node tests/test-nan-guards.js
```

Expected: `AssertionError: eventStart should return null for unparseable dateTime` — the buggy stub returns an Invalid Date object, not `null`.

- [ ] **Step 3: Fix `eventStart` in `src-lite/calendar-card-pro.js:270-275`**

Replace lines 270–275:

```js
/** Get event start as Date, or null if malformed */
function eventStart(ev) {
  if (!ev || !ev.start) return null;
  if (ev.start.dateTime) return new Date(ev.start.dateTime);
  if (ev.start.date) return parseDate(ev.start.date);
  return null;
}
```

With:

```js
/** Get event start as Date, or null if malformed */
function eventStart(ev) {
  if (!ev || !ev.start) return null;
  if (ev.start.dateTime) {
    var d = new Date(ev.start.dateTime);
    if (isNaN(d.getTime())) { console.warn('Calendar Card Pro: unparseable dateTime', ev); return null; }
    return d;
  }
  if (ev.start.date) return parseDate(ev.start.date);
  return null;
}
```

- [ ] **Step 4: Fix `eventEnd` in `src-lite/calendar-card-pro.js:277-288`**

Replace lines 277–288:

```js
/** Get event end as Date, or null if malformed */
function eventEnd(ev) {
  if (!ev || !ev.end) return null;
  if (ev.end.dateTime) return new Date(ev.end.dateTime);
  if (ev.end.date) {
    /* iCal: all-day end date is exclusive, subtract 1 day */
    var d = parseDate(ev.end.date);
    d.setDate(d.getDate() - 1);
    return d;
  }
  return null;
}
```

With:

```js
/** Get event end as Date, or null if malformed */
function eventEnd(ev) {
  if (!ev || !ev.end) return null;
  if (ev.end.dateTime) {
    var d = new Date(ev.end.dateTime);
    if (isNaN(d.getTime())) { console.warn('Calendar Card Pro: unparseable dateTime', ev); return null; }
    return d;
  }
  if (ev.end.date) {
    /* iCal: all-day end date is exclusive, subtract 1 day */
    var d = parseDate(ev.end.date);
    d.setDate(d.getDate() - 1);
    return d;
  }
  return null;
}
```

- [ ] **Step 5: Update test stubs to match fixed versions and verify they pass**

Replace the two stub functions in `tests/test-nan-guards.js` with the fixed implementations:

```js
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
```

```bash
node tests/test-nan-guards.js
```

Expected: `PASS: all NaN guard tests`

- [ ] **Step 6: Commit**

```bash
git add src-lite/calendar-card-pro.js tests/test-nan-guards.js
git commit -m "fix: guard eventStart/eventEnd against NaN dates (Safari 12 strict parser)"
```

---

## Task 2: Extract `renderEventTimeText` helper; fix `renderCard` (C2, C4)

**Files:**
- Modify: `src-lite/calendar-card-pro.js:290` (insert after `monthShort`) and `src-lite/calendar-card-pro.js:549-563`
- Create: `tests/test-time-text.js`

**Why:** The existing `renderCard` time block (lines 549–563) accesses `ev.end.dateTime` without checking `ev.end` first (C2), uses a duplicate `new Date()` call instead of going through `eventEnd` (now NaN-guarded after Task 1), and renders the event's original start/end times on every day of a multi-day span regardless of which day is being rendered (C4).

- [ ] **Step 1: Write the failing test**

Create `tests/test-time-text.js`:

```js
var assert = require('assert');

/* Paste the helper functions renderEventTimeText depends on */

function parseDate(str) {
  var parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function dateKey(d) {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
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

/* Stub of the function to be written — should fail before implementation */
function renderEventTimeText(ev, bucketDate, cfg, use24h) {
  throw new Error('not implemented');
}

var cfg_show = { show_end_time: true };
var cfg_hide = { show_end_time: false };

/* Same-day timed event */
var sameDay = {
  start: { dateTime: '2026-06-09T14:00:00' },
  end:   { dateTime: '2026-06-09T15:00:00' }
};
var bucketMon = new Date(2026, 5, 9); /* June 9 */
var result = renderEventTimeText(sameDay, bucketMon, cfg_show, false);
assert.ok(result.includes('-'), 'same-day with show_end_time should include dash: ' + result);

console.log('PASS: time text tests (should not reach here before implementation)');
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node tests/test-time-text.js
```

Expected: `Error: not implemented`

- [ ] **Step 3: Add `renderEventTimeText` to `src-lite/calendar-card-pro.js` after line 324 (after `monthShort`)**

Insert the following block after the closing `}` of `monthShort` (after line 324, before the section 4 banner):

```js
/** Return the time-cell display string for a timed event.
 * Handles continuation days of multi-day timed events so each day shows
 * contextually correct time rather than the original start/end on every row. */
function renderEventTimeText(ev, bucketDate, cfg, use24h) {
  var evStart = eventStart(ev);
  var evEnd = eventEnd(ev);
  if (!evStart) return '';

  var startDayKey = dateKey(new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate()));
  var bucketKey = dateKey(new Date(bucketDate.getFullYear(), bucketDate.getMonth(), bucketDate.getDate()));
  var isContinuationDay = startDayKey !== bucketKey;

  if (isContinuationDay) {
    /* On a day this event spans but did not start on */
    if (evEnd && cfg.show_end_time) {
      var endDayKey = dateKey(new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate()));
      if (endDayKey === bucketKey) {
        return '→ ' + formatTime(evEnd, use24h); /* last day: "→ HH:MM" */
      }
    }
    return 'All day'; /* middle continuation day */
  }

  /* Start day */
  var startTime = formatTime(evStart, use24h);
  if (evEnd && cfg.show_end_time) {
    var evEndDayKey = dateKey(new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate()));
    if (evEndDayKey === startDayKey) {
      return startTime + ' - ' + formatTime(evEnd, use24h); /* same-day end */
    }
    return startTime + ' →'; /* multi-day: "HH:MM →" signals it continues */
  }
  return startTime;
}
```

- [ ] **Step 4: Replace the time block in `renderCard` at lines 549–563**

Replace the block from `/* Time */` through the closing `}` of the `else if (isAllDay(ev))` opening brace — specifically the `show_time` branch lines 549–563:

```js
        /* Time */
        if (cfg.show_time && !isAllDay(ev)) {
          var timeDiv = el('div', 'time');
          var icon = document.createElement('ha-icon');
          icon.setAttribute('icon', 'mdi:clock-outline');
          timeDiv.appendChild(icon);
          var timeSpan = document.createElement('span');
          var startTime = formatTime(eventStart(ev), use24h);
          if (cfg.show_end_time && ev.end.dateTime) {
            var endTime = formatTime(new Date(ev.end.dateTime), use24h);
            timeSpan.textContent = startTime + ' - ' + endTime;
          } else {
            timeSpan.textContent = startTime;
          }
          timeDiv.appendChild(timeSpan);
          tlContainer.appendChild(timeDiv);
        } else if (isAllDay(ev)) {
```

With:

```js
        /* Time */
        if (cfg.show_time && !isAllDay(ev)) {
          var timeDiv = el('div', 'time');
          var icon = document.createElement('ha-icon');
          icon.setAttribute('icon', 'mdi:clock-outline');
          timeDiv.appendChild(icon);
          var timeSpan = document.createElement('span');
          timeSpan.textContent = renderEventTimeText(ev, dayDate, cfg, use24h);
          timeDiv.appendChild(timeSpan);
          tlContainer.appendChild(timeDiv);
        } else if (isAllDay(ev)) {
```

- [ ] **Step 5: Update test stubs and run full test suite**

Replace the `renderEventTimeText` stub in `tests/test-time-text.js` with the full implementation and add comprehensive assertions:

```js
var assert = require('assert');

function parseDate(str) {
  var parts = str.split('-');
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
}

function dateKey(d) {
  var y = d.getFullYear();
  var m = d.getMonth() + 1;
  var day = d.getDate();
  return y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
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

function renderEventTimeText(ev, bucketDate, cfg, use24h) {
  var evStart = eventStart(ev);
  var evEnd = eventEnd(ev);
  if (!evStart) return '';

  var startDayKey = dateKey(new Date(evStart.getFullYear(), evStart.getMonth(), evStart.getDate()));
  var bucketKey = dateKey(new Date(bucketDate.getFullYear(), bucketDate.getMonth(), bucketDate.getDate()));
  var isContinuationDay = startDayKey !== bucketKey;

  if (isContinuationDay) {
    if (evEnd && cfg.show_end_time) {
      var endDayKey = dateKey(new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate()));
      if (endDayKey === bucketKey) {
        return '→ ' + formatTime(evEnd, use24h);
      }
    }
    return 'All day';
  }

  var startTime = formatTime(evStart, use24h);
  if (evEnd && cfg.show_end_time) {
    var evEndDayKey = dateKey(new Date(evEnd.getFullYear(), evEnd.getMonth(), evEnd.getDate()));
    if (evEndDayKey === startDayKey) {
      return startTime + ' - ' + formatTime(evEnd, use24h);
    }
    return startTime + ' →';
  }
  return startTime;
}

var cfg_show = { show_end_time: true };
var cfg_hide = { show_end_time: false };

/* Same-day timed event, show_end_time true */
var sameDayEv = { start: { dateTime: '2026-06-09T14:00:00' }, end: { dateTime: '2026-06-09T15:00:00' } };
var bucketMon = new Date(2026, 5, 9);
var r = renderEventTimeText(sameDayEv, bucketMon, cfg_show, true);
assert.ok(r.includes('-'), 'same-day + show_end_time → includes dash: ' + r);

/* Same-day, show_end_time false */
var r2 = renderEventTimeText(sameDayEv, bucketMon, cfg_hide, true);
assert.ok(!r2.includes('-') && !r2.includes('→'), 'same-day + hide end → start time only: ' + r2);

/* Multi-day event on start day */
var multiEv = {
  start: { dateTime: '2026-06-09T14:00:00' },
  end:   { dateTime: '2026-06-11T10:00:00' }
};
var r3 = renderEventTimeText(multiEv, new Date(2026, 5, 9), cfg_show, true);
assert.ok(r3.includes('→') && !r3.startsWith('→'), 'start day of multi-day → "HH:MM →": ' + r3);

/* Multi-day event on middle continuation day */
var r4 = renderEventTimeText(multiEv, new Date(2026, 5, 10), cfg_show, true);
assert.strictEqual(r4, 'All day', 'middle continuation day → "All day": ' + r4);

/* Multi-day event on last day, show_end_time */
var r5 = renderEventTimeText(multiEv, new Date(2026, 5, 11), cfg_show, true);
assert.ok(r5.startsWith('→'), 'last day of multi-day → starts with →: ' + r5);

/* Multi-day event on last day, hide_end_time */
var r6 = renderEventTimeText(multiEv, new Date(2026, 5, 11), cfg_hide, true);
assert.strictEqual(r6, 'All day', 'last day + hide end time → "All day": ' + r6);

/* Event with missing/null evStart */
var noStartEv = { start: { dateTime: 'not-a-date' }, end: { dateTime: '2026-06-09T15:00:00' } };
var r7 = renderEventTimeText(noStartEv, new Date(2026, 5, 9), cfg_show, true);
assert.strictEqual(r7, '', 'null evStart → empty string: ' + r7);

/* Event with no end (evEnd is null) */
var noEndEv = { start: { dateTime: '2026-06-09T14:00:00' } };
var r8 = renderEventTimeText(noEndEv, new Date(2026, 5, 9), cfg_show, true);
assert.ok(!r8.includes('-') && !r8.includes('→'), 'no end → start time only: ' + r8);

console.log('PASS: all renderEventTimeText tests');
```

```bash
node tests/test-time-text.js
```

Expected: `PASS: all renderEventTimeText tests`

- [ ] **Step 6: Commit**

```bash
git add src-lite/calendar-card-pro.js tests/test-time-text.js
git commit -m "fix: extract renderEventTimeText helper, fix multi-day time display and ev.end guard"
```

---

## Task 3: Add `_renderMessage`; fix fetch-failure error surface (C1, I1)

**Files:**
- Modify: `src-lite/calendar-card-pro.js:330-361` (`fetchCalendarEvents`)
- Modify: `src-lite/calendar-card-pro.js:738-751` (`_fetchAndRender`)
- Modify: `src-lite/calendar-card-pro.js` — insert `_renderMessage` method before `_fetchAndRender`

**Why:** C1: the `.catch` at line 749 only `console.error`s — the card stays blank with no visible signal. I1: per-entity fetch failures return `[]` so a total failure of all calendars is indistinguishable from "no events". `_renderMessage` is a shared method for both loading placeholder and error state.

- [ ] **Step 1: Add `_renderMessage` method**

In `src-lite/calendar-card-pro.js`, find the `_startRefreshTimer` method (around line 729). Insert the following new method immediately **after** the closing `}` of `_startRefreshTimer` and **before** `_fetchAndRender`:

```js
  _renderMessage(msg, isError) {
    if (!this._container) return;
    var cfg = this._config || {};
    while (this._container.firstChild) {
      this._container.removeChild(this._container.firstChild);
    }
    var table = el('table', 'day-table');
    var tbody = document.createElement('tbody');
    var tr = document.createElement('tr');
    var td = el('td', 'event event-first event-last');
    td.setAttribute('colspan', '2');
    td.style.borderLeft = (cfg.vertical_line_width || '2px') + ' solid ' + (isError ? '#e44' : (cfg.accent_color || '#03a9f4'));
    var content = el('div', 'event-content');
    var title = el('div', 'event-title');
    var icon = document.createElement('ha-icon');
    icon.setAttribute('icon', isError ? 'mdi:alert-circle' : 'mdi:clock-outline');
    title.appendChild(icon);
    var span = document.createElement('span');
    span.textContent = ' ' + msg;
    title.appendChild(span);
    content.appendChild(title);
    td.appendChild(content);
    tr.appendChild(td);
    tbody.appendChild(tr);
    table.appendChild(tbody);
    this._container.appendChild(table);
  }
```

- [ ] **Step 2: Update `fetchCalendarEvents` to use null sentinel (I1)**

Replace lines 330–361 (`fetchCalendarEvents` function body):

```js
function fetchCalendarEvents(hass, entities, start, end) {
  var startISO = start.toISOString();
  var endISO = end.toISOString();
  var fetched = {};
  var promises = [];

  entities.forEach(function (ec) {
    if (fetched[ec.entity]) return;
    fetched[ec.entity] = true;

    var path = 'calendars/' + ec.entity + '?start=' + startISO + '&end=' + endISO;
    var p = hass.callApi('GET', path).then(function (events) {
      if (!events || !Array.isArray(events)) return [];
      return events.map(function (ev) {
        ev._entityConfig = ec;
        return ev;
      });
    }).catch(function (err) {
      console.error('Calendar Card Pro: fetch failed for ' + ec.entity + ':', err);
      return null; /* sentinel: this entity failed */
    });
    promises.push(p);
  });

  return Promise.all(promises).then(function (results) {
    var failCount = results.filter(function (r) { return r === null; }).length;
    if (failCount === results.length) {
      throw new Error('All calendar entities failed to load');
    }
    if (failCount > 0) {
      console.warn('Calendar Card Pro: ' + failCount + ' of ' + results.length + ' calendar entities failed to load');
    }
    var all = [];
    results.forEach(function (arr) {
      if (arr !== null) all = all.concat(arr);
    });
    return all;
  });
}
```

- [ ] **Step 3: Update `_fetchAndRender` `.catch` to call `_renderMessage` (C1)**

Find the `.catch` at lines 749–751:

```js
    }).catch(function (err) {
      console.error('Calendar Card Pro: render failed:', err);
    });
```

Replace with:

```js
    }).catch(function (err) {
      console.error('Calendar Card Pro: render failed:', err);
      self._renderMessage('Could not load events. Check entity IDs and HA connection.', true);
    });
```

- [ ] **Step 4: Verify manually**

In a browser with the built card, simulate an entity failure by temporarily changing an entity ID in the config to a non-existent string (e.g., `calendar.does_not_exist`). The card should display a red-bordered row with the alert icon and the message "Could not load events. Check entity IDs and HA connection." rather than going blank.

If you cannot test in a browser at this point, verify visually after all tasks are complete.

- [ ] **Step 5: Commit**

```bash
git add src-lite/calendar-card-pro.js
git commit -m "fix: surface fetch/render failures as visible card error state"
```

---

## Task 4: Loading placeholder, expand-state persistence, stale-hass re-render (I2, I3, I4, I6)

**Files:**
- Modify: `src-lite/calendar-card-pro.js:382-385` (`groupEventsByDay` drop warning — I2)
- Modify: `src-lite/calendar-card-pro.js:787-791` (`setConfig` expand state — I3)
- Modify: `src-lite/calendar-card-pro.js:800-806` (`set hass` — I4)
- Modify: `src-lite/calendar-card-pro.js:754-755` (`_render` loading guard — I6)

- [ ] **Step 1: Add drop-count warning in `groupEventsByDay` (I2)**

Find lines 382–385:

```js
  /* HA may return placeholder events with no start — drop them to avoid phantom entries */
  events = events.filter(function (ev) {
    return eventStart(ev) !== null;
  });
```

Replace with:

```js
  /* HA may return placeholder events with no start — drop them to avoid phantom entries */
  var beforeFilter = events.length;
  events = events.filter(function (ev) {
    return eventStart(ev) !== null;
  });
  if (events.length < beforeFilter) {
    console.warn('Calendar Card Pro: dropped ' + (beforeFilter - events.length) + ' events with no valid start');
  }
```

- [ ] **Step 2: Fix expand-state reset in `setConfig` (I3)**

Find lines 787–791:

```js
    cfg._entities = normaliseEntities(cfg.entities);
    cfg._currentDays = cfg.compact_days_to_show;

    this._config = cfg;
    this._isExpanded = false;
```

Replace with:

```js
    cfg._entities = normaliseEntities(cfg.entities);
    cfg._currentDays = this._isExpanded ? cfg.days_to_show : cfg.compact_days_to_show;

    this._config = cfg;
    /* _isExpanded intentionally not reset — tap state survives HA UI config edits */
```

- [ ] **Step 3: Fix `set hass` to re-render on every update (I4)**

Find lines 800–806:

```js
  set hass(value) {
    var firstSet = !this._hass;
    this._hass = value;
    if (firstSet && this._config) {
      this._fetchAndRender();
    }
  }
```

Replace with:

```js
  set hass(value) {
    var firstSet = !this._hass;
    this._hass = value;
    if (this._config) {
      if (firstSet) { this._fetchAndRender(); } else { this._render(); }
    }
  }
```

- [ ] **Step 4: Add loading placeholder to `_render` (I6)**

Find lines 754–755:

```js
  _render() {
    if (!this._container || !this._events) return;
```

Replace with:

```js
  _render() {
    if (!this._container) return;
    if (!this._events) { this._renderMessage('Loading…', false); return; }
```

- [ ] **Step 5: Verify manually**

Reload the card. Before the first successful fetch completes, the card should briefly show a clock icon with "Loading…" rather than an empty shell.

After tapping to expand (7-day view), open the HA card editor and change a cosmetic setting (e.g., title). The card should stay expanded after saving — it should not collapse back to 3-day view.

- [ ] **Step 6: Commit**

```bash
git add src-lite/calendar-card-pro.js
git commit -m "fix: loading placeholder, expand-state persistence, stale-hass re-render"
```

---

## Task 5: Validate entity entries; throw on zero valid entities (I5)

**Files:**
- Modify: `src-lite/calendar-card-pro.js:229-235` (`normaliseEntities`)
- Modify: `src-lite/calendar-card-pro.js:787` (`setConfig` — add post-normalise check)
- Create: `tests/test-normalise.js`

**Why:** `normaliseEntities` currently accepts `{color: 'red'}` (no entity ID), produces `{entity: undefined, ...}`. This builds a request URL `calendars/undefined?...` which the HA API rejects, the per-entity catch swallows, and the user sees "no events" with no explanation.

- [ ] **Step 1: Write the failing test**

Create `tests/test-normalise.js`:

```js
var assert = require('assert');

/* Current (buggy) stub */
function normaliseEntities(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map(function (e) {
    if (typeof e === 'string') return { entity: e, color: null, label: null };
    return { entity: e.entity, color: e.color || null, label: e.label || null };
  });
}

var result = normaliseEntities([{ color: 'red' }]);  /* missing entity */
assert.strictEqual(result.length, 0, 'Entry with no entity ID should be dropped, got: ' + JSON.stringify(result));
```

- [ ] **Step 2: Run test to verify it fails**

```bash
node tests/test-normalise.js
```

Expected: `AssertionError` — current implementation returns `[{entity: undefined, ...}]` length 1, not 0.

- [ ] **Step 3: Fix `normaliseEntities` in `src-lite/calendar-card-pro.js:229-235`**

Replace lines 229–235:

```js
/** Normalise entity config to array of {entity, color, label} */
function normaliseEntities(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map(function (e) {
    if (typeof e === 'string') return { entity: e, color: null, label: null };
    return { entity: e.entity, color: e.color || null, label: e.label || null };
  });
}
```

With:

```js
/** Normalise entity config to array of {entity, color, label}; drops entries with no entity ID */
function normaliseEntities(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  var result = [];
  raw.forEach(function (e) {
    if (typeof e === 'string') {
      result.push({ entity: e, color: null, label: null });
      return;
    }
    if (!e || !e.entity) {
      console.warn('Calendar Card Pro: skipping entity entry with no entity ID:', e);
      return;
    }
    result.push({ entity: e.entity, color: e.color || null, label: e.label || null });
  });
  return result;
}
```

- [ ] **Step 4: Add zero-entity guard in `setConfig`**

After `cfg._entities = normaliseEntities(cfg.entities);` (now around line 787), add:

```js
    if (!cfg._entities.length) {
      throw new Error('Calendar Card Pro: no valid entity IDs found in "entities" config');
    }
```

The final block should look like:

```js
    cfg._entities = normaliseEntities(cfg.entities);
    if (!cfg._entities.length) {
      throw new Error('Calendar Card Pro: no valid entity IDs found in "entities" config');
    }
    cfg._currentDays = this._isExpanded ? cfg.days_to_show : cfg.compact_days_to_show;
```

- [ ] **Step 5: Update test and run**

Replace the test stubs in `tests/test-normalise.js` with the full implementation and run comprehensive assertions:

```js
var assert = require('assert');

function normaliseEntities(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  var result = [];
  raw.forEach(function (e) {
    if (typeof e === 'string') {
      result.push({ entity: e, color: null, label: null });
      return;
    }
    if (!e || !e.entity) {
      return; /* dropped */
    }
    result.push({ entity: e.entity, color: e.color || null, label: e.label || null });
  });
  return result;
}

/* String entity */
var r1 = normaliseEntities(['calendar.foo']);
assert.strictEqual(r1.length, 1);
assert.strictEqual(r1[0].entity, 'calendar.foo');
assert.strictEqual(r1[0].color, null);

/* Object entity with all fields */
var r2 = normaliseEntities([{ entity: 'calendar.bar', color: 'red', label: 'Work' }]);
assert.strictEqual(r2[0].entity, 'calendar.bar');
assert.strictEqual(r2[0].color, 'red');
assert.strictEqual(r2[0].label, 'Work');

/* Object entry with no entity ID — should be dropped */
var r3 = normaliseEntities([{ color: 'red' }]);
assert.strictEqual(r3.length, 0, 'no entity ID → dropped');

/* Mixed: one valid string, one invalid object */
var r4 = normaliseEntities(['calendar.foo', { color: 'blue' }]);
assert.strictEqual(r4.length, 1, 'only valid entry kept');
assert.strictEqual(r4[0].entity, 'calendar.foo');

/* null / undefined entries */
var r5 = normaliseEntities([null, undefined, 'calendar.foo']);
assert.strictEqual(r5.length, 1, 'null/undefined entries dropped');

/* Empty array */
var r6 = normaliseEntities([]);
assert.strictEqual(r6.length, 0);

/* Not an array */
var r7 = normaliseEntities('calendar.foo');
assert.strictEqual(r7.length, 0);

console.log('PASS: all normaliseEntities tests');
```

```bash
node tests/test-normalise.js
```

Expected: `PASS: all normaliseEntities tests`

- [ ] **Step 6: Commit**

```bash
git add src-lite/calendar-card-pro.js tests/test-normalise.js
git commit -m "fix: validate entity entries, throw on zero valid entities after normalisation"
```

---

## Task 6: Comment fixes (verify-bundle.sh, helpers.ts, calendar-card-pro.js)

**Files:**
- Modify: `scripts/verify-bundle.sh:30,49`
- Modify: `src/utils/helpers.ts:67-70,117`
- Modify: `src-lite/calendar-card-pro.js:52,622`

- [ ] **Step 1: Fix `verify-bundle.sh` line 30 — remove meaningless `???` reference**

Find line 30:
```bash
# 2. Nullish coalescing — exclude ??= (nullish assignment) and ??? edge cases
```

Replace with:
```bash
# 2. Nullish coalescing — exclude ??= (nullish assignment)
```

- [ ] **Step 2: Fix `verify-bundle.sh` line 49 — accurate Unicode property escape comment**

Find line 49:
```bash
# 4. Unicode property escapes — esbuild never transforms these; must be fixed in source
```

Replace with:
```bash
# 4. Unicode property escapes — \p{Emoji} throws at runtime on iOS 12.5.8 despite partial
#    property-escape support in Safari 12's regex engine; esbuild never transforms these
```

- [ ] **Step 3: Fix `helpers.ts` — move Safari 12 rationale to `isEmoji` definition**

Find the JSDoc above `isEmoji` at lines 65–70:
```ts
/**
 * Check if a string is a single emoji character
 *
 * @param str String to check
 * @returns True if the string is an emoji
 */
export function isEmoji(str: string): boolean {
```

Replace with:
```ts
/**
 * Check if a string is a single emoji character.
 * Uses explicit Unicode ranges instead of \p{Emoji} — Safari 12.5.8 throws on \p{Emoji}
 * despite partial Unicode property escape support in its regex engine.
 *
 * @param str String to check
 * @returns True if the string is an emoji
 */
export function isEmoji(str: string): boolean {
```

Then find the call site comment at line 117:
```ts
    // Check if it's an emoji using isEmoji() helper (uses explicit Unicode ranges, Safari 12 compatible)
```

Replace with:
```ts
    // Check if it's an emoji
```

- [ ] **Step 4: Fix `calendar-card-pro.js` line 52 — remove misleading calc comment**

Find line 52:
```js
  var borderRadius = '5px'; /* fallback for calc(var(--ha-card-border-radius,10px)/2) */
```

Replace with:
```js
  var borderRadius = '5px';
```

- [ ] **Step 5: Fix `calendar-card-pro.js` line 622 — de-Safari-specific class comment**

Find (approximately line 622 after earlier insertions shift line numbers):
```js
/* ================================================
   7. COMPONENT (ES2015 class — required by Custom Elements v1 in Safari 12)
   ================================================ */
```

Replace with:
```js
/* ================================================
   7. COMPONENT (ES2015 class — required by Custom Elements v1 in all browsers)
   ================================================ */
```

- [ ] **Step 6: Commit**

```bash
git add scripts/verify-bundle.sh src/utils/helpers.ts src-lite/calendar-card-pro.js
git commit -m "fix: correct inaccurate comments in verify-bundle.sh, helpers.ts, calendar-card-pro.js"
```

---

## Post-implementation verification

- [ ] **Run all test scripts**

```bash
node tests/test-nan-guards.js && node tests/test-time-text.js && node tests/test-normalise.js
```

Expected: Three `PASS:` lines, no errors.

- [ ] **Run the bundle verification script** (requires a build first)

```bash
npm run build && bash scripts/verify-bundle.sh
```

Expected: all five checks `PASS`.

- [ ] **Review the complete diff**

```bash
git log --oneline main..HEAD
git diff main..HEAD -- src-lite/calendar-card-pro.js | head -200
```

Confirm: 6 commits on top of `main`, all changes within expected files.

- [ ] **Push the branch to update PR #1**

```bash
git push origin gsd/phase-01-build-pipeline
```
