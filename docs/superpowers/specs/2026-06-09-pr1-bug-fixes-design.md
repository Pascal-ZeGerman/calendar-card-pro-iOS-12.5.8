# PR #1 Bug Fix Design — calendar-card-pro iOS 12.5.8

**Date:** 2026-06-09
**Branch target:** `gsd/phase-01-build-pipeline` (PR #1)
**File in scope:** `src-lite/calendar-card-pro.js` (844 lines), `scripts/verify-bundle.sh`, `src/utils/helpers.ts`

---

## Context

PR #1 replaces the Lit 2.x bundle with a hand-written vanilla JS custom element to fix iOS 12.5.8 / Safari 12 compatibility. A code review identified 4 Critical and 6 Important bugs. This spec covers their resolution using Approach B: two extracted helpers + surgical per-function fixes.

---

## Architecture

### Two new additions

#### `renderEventTimeText(ev, bucketDate, cfg, use24h) → string`

Pure function, placed in the helpers section (section 4 of the file). Centralises C2, C3, and C4.

**Inputs:**
- `ev` — HA calendar event object
- `bucketDate` — the calendar day this event row is being rendered under (not necessarily the event's own start day)
- `cfg` — resolved card config
- `use24h` — resolved boolean/`'system'` value

**Logic:**
```
evStart = eventStart(ev)
evEnd   = eventEnd(ev)

isContinuationDay = dateKey(floor(evStart)) !== dateKey(bucketDate)
isLastDay         = evEnd && dateKey(floor(evEnd)) === dateKey(bucketDate)

Start day, same-day end and show_end_time   → "HH:MM - HH:MM"
Start day, multi-day end                    → "HH:MM →"   (→ is a continuation indicator, not an end time — shown regardless of show_end_time)
Start day, no end or end time hidden        → "HH:MM"
Continuation day, not last                  → "All day"   (display label for a timed event on a non-start day — not a true all-day event)
Last day of multi-day, show_end_time        → "→ HH:MM"
Last day of multi-day, end time hidden      → "All day"
```

`renderCard` replaces its ~12-line time block with:
```js
timeSpan.textContent = renderEventTimeText(ev, dayDate, cfg, use24h);
```

#### `_renderMessage(msg, isError)` — method on `CalendarCardPro`

Renders a single-row placeholder into `this._container` (clearing it first). Used for both loading state and error state.

- Guards with `if (!this._container) return;` — called from both `_render` and `_fetchAndRender`'s catch
- Icon: `mdi:alert-circle` when `isError`, `mdi:clock-outline` otherwise
- Border-left colour: `#e44` when `isError`, `this._config.accent_color` otherwise
- Matches the empty-day row structure so it fits the existing card layout

---

## Per-Bug Changes

### C3 — NaN date guard (`eventStart`, `eventEnd`)

After each `new Date(ev.*.dateTime)` call, add:
```js
if (isNaN(d.getTime())) {
  console.warn('Calendar Card Pro: unparseable dateTime', ev);
  return null;
}
```
Events with unparseable datetimes get dropped by the existing `eventStart(ev) !== null` filter — no additional callsite changes needed.

### C2 + C3 + C4 — Time display (`renderCard`)

Replace the ~12-line time render block (the `show_time && !isAllDay(ev)` branch) with:
```js
timeSpan.textContent = renderEventTimeText(ev, dayDate, cfg, use24h);
```
The `ev.end.dateTime` direct access and duplicate `new Date()` call both disappear with the old code.

### C1 — Blank card on fetch failure (`_fetchAndRender`)

```js
}).catch(function (err) {
  console.error('Calendar Card Pro: render failed:', err);
  self._renderMessage('Could not load events. Check entity IDs and HA connection.', true);
});
```

### I1 — All-entities-fail silent (`fetchCalendarEvents`)

Per-entity `.catch` returns `null` (sentinel) instead of `[]`. After `Promise.all`:
- All null → `throw new Error('All calendar entities failed to load')` — surfaces through C1's catch
- Some null → `console.warn('N of M calendar entities failed to load')` — partial results rendered normally

### I2 — Dropped events silent (`groupEventsByDay`)

After the `events.filter(eventStart !== null)` call, compare count before/after:
```js
if (dropped > 0) console.warn('Calendar Card Pro: dropped ' + dropped + ' events with no valid start');
```

### I3 — Expand state reset on `setConfig`

Remove `this._isExpanded = false` from `setConfig`. Compute `_currentDays` from existing state:
```js
cfg._currentDays = this._isExpanded ? cfg.days_to_show : cfg.compact_days_to_show;
```
Expand state now survives config updates pushed from the HA UI editor.

### I4 — Stale hass, no re-render (`set hass`)

```js
set hass(value) {
  var firstSet = !this._hass;
  this._hass = value;
  if (this._config) {
    if (firstSet) { this._fetchAndRender(); } else { this._render(); }
  }
}
```
Every hass update triggers a cheap synchronous re-render so "past event" styling stays current. Full re-fetch only on first set, timer tick, or visibility change.

### I5 — Malformed entity entries (`normaliseEntities` + `setConfig`)

In `normaliseEntities`: filter entries where resolved `entity` is falsy, `console.warn` each dropped entry.

In `setConfig`: throw if `cfg._entities.length === 0` after normalisation:
```js
if (!cfg._entities.length) {
  throw new Error('Calendar Card Pro: no valid entity IDs found in "entities" config');
}
```

### I6 — No loading state (`_render`)

```js
_render() {
  if (!this._container) return;
  if (!this._events) { this._renderMessage('Loading…', false); return; }
  // ... existing clear + renderCard
}
```

---

## Comment Fixes

| File | Location | Fix |
|------|----------|-----|
| `verify-bundle.sh` | Line 49 | Reword `\p{...}` comment: Safari 12.5.8 throws on `\p{Emoji}` despite partial property-escape support — explain actual failure mode |
| `verify-bundle.sh` | Line 30 | Remove meaningless "`???` edge cases" from nullish-coalescing regex comment |
| `calendar-card-pro.js` | Line 52 | Fix or remove misleading `calc(var(--ha-card-border-radius))` claim — code uses hardcoded `5px` |
| `calendar-card-pro.js` | Line 622 | Reword "required by Custom Elements v1 in Safari 12" → "required by Custom Elements v1 in all browsers" |
| `helpers.ts` | Line 117 | Move Safari-12 rationale from call site to `isEmoji` definition |

---

## Commit Structure

| # | Commit message | Changes |
|---|----------------|---------|
| 1 | `fix: guard eventStart/eventEnd against NaN dates (Safari 12 strict parser)` | `eventStart`, `eventEnd` NaN checks (C3 — base functions) |
| 2 | `fix: extract renderEventTimeText helper, fix multi-day time display` | New helper + `renderCard` swap; removes duplicate `new Date()` at render layer (C2, C4; C3 render-layer cleanup) |
| 3 | `fix: surface fetch/render failures as visible card error state` | `_renderMessage`, C1, I1 (`fetchCalendarEvents` sentinel) |
| 4 | `fix: loading placeholder, expand-state persistence, stale-hass render` | I2 warn, I3 `setConfig`, I4 `set hass`, I6 `_render` |
| 5 | `fix: validate entity entries, throw on zero valid entities` | I5 `normaliseEntities` + `setConfig` |
| 6 | `fix: correct inaccurate comments in verify-bundle.sh, helpers.ts, calendar-card-pro.js` | Comment-only changes |

---

## What Is Not Changed

- Build pipeline (`rollup.config.mjs`, `package.json`, `tsconfig.json`)
- `dist/` — rebuilt from source after fixes, not hand-edited
- All CSS (`buildStyles`) — no layout changes
- The `verify-bundle.sh` logic — comment-only change
- Any file on the current `fix/ios12-no-events-visible` branch — that work is independent

---

## Success Criteria

- Card renders a visible error row (not blank) on total fetch failure
- Card renders correct times for multi-day timed events on each day they span
- Tapping to expand survives an HA config update without collapsing
- `setConfig` throws a clear error on `entities: [{color: 'red'}]` (no entity ID)
- Safari 12: `new Date("2026-06-09 14:00")` (space instead of T) drops the event with a `console.warn` rather than producing a phantom "Invalid Date" row
- All existing single-day event rendering is unchanged
