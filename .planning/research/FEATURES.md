# Features — iOS 12.5.8 Compatibility Backport

**Research Date:** 2026-02-23
**Research Type:** Project Research — Features dimension
**Milestone:** Subsequent (existing codebase, iOS 12 backport scoping)

---

## Summary

This document categorizes the calendar card's existing features by feasibility on iOS 12.5.8 Safari (WebKit 606.x). iOS 12 is roughly ES2015/ES6 baseline with some ES2017 gaps, limited Web Components support, and restricted Pointer Events API. The three categories below drive requirements scoping: what must work, what is worth attempting, and what should be explicitly deferred.

---

## Table Stakes (Must Have — Card Is Useless Without These)

These features must work for the card to have any value on iOS 12. If any of these fail, the entire backport fails.

### 1. Card Loads Without JS Errors

**What it does:** The bundled ES module is loaded by Home Assistant's Lovelace frontend, the Web Component registers, and `setConfig()` + `hass` property setter run without throwing.

**iOS 12 complexity: HIGH**

Current problem: The build target is ES2017, which iOS 12 Safari partially supports but not completely. Specific gaps:
- Optional chaining (`?.`) — not supported; used heavily in `updated()`, `safeHass` getter, weather config checks
- Nullish coalescing (`??`) — not supported; used throughout config defaults
- `Object.fromEntries()` — not supported; may appear in bundled dependencies
- `Array.flatMap()` — not supported; may appear in bundled dependencies
- Lit 2.x uses `globalThis`, class fields, and private fields (`#`) — none supported in Safari 12

Lit 2.x with Web Components polyfills (webcomponents/polyfills) can work on Safari 12, but Lit 2.x itself requires:
- Custom Elements v1 (Safari 10.3+) — available
- Shadow DOM v1 (Safari 10.1+) — available
- `<template>` element — available
- ES2015 classes — available

The remaining block is the JS syntax: the TypeScript/esbuild output must be downleveled to ES2015 (not ES2017) and syntax transforms must cover optional chaining and nullish coalescing. Without this, the script throws a SyntaxError on parse and nothing renders.

**Required work:** Change esbuild target to ES2015 (`es6`), enable Babel or esbuild transforms for `?.` and `??`, add Web Components polyfill loader.

---

### 2. Events Display in Default (Collapsed) View

**What it does:** After loading, the card fetches calendar events via `hass.callApi()`, processes them through `fetchEventData()` → `groupEventsByDay()`, and renders the day-table layout with date column (weekday/day/month) and event rows (title, time, location).

**iOS 12 complexity: MEDIUM**

The rendering pipeline itself (Lit templates, table-based layout, CSS custom properties) is broadly compatible. Key concerns:

**CSS custom properties:** Fully supported in Safari 10+. All `var(--calendar-card-*)` usage works.

**CSS Flexbox:** Fully supported in Safari 9+ (with `-webkit-` prefix in older versions, but unprefixed works in Safari 12). The `.event-content`, `.summary-row`, `.time`, `.location`, `.time-location` flex layouts will work.

**CSS Grid:** Not used in the main card layout — the card uses HTML `<table>` elements for the day/event grid. This is a key architectural advantage: the table-based layout avoids CSS Grid entirely, which would have been a significant compatibility concern. CSS Grid basic support is present in Safari 10.1+ but subgrid is not; since subgrid isn't used, this is not a problem.

**`color-mix()` function:** Used in two places — `.progress-bar` background and `--calendar-card-empty-day-color` default value. `color-mix()` is NOT supported in Safari 12 (it requires Safari 15+). These specific properties will silently fail on iOS 12, meaning the progress bar background becomes transparent and empty day text may lose its opacity effect. This is visually degraded but not broken.

**`scrollbar-width: none` / `-ms-overflow-style: none`:** Not supported in Safari (Safari hides scrollbars via `::-webkit-scrollbar { display: none }`). The scrollbar hiding in `.content-container` will need the WebKit prefix form; without it, scrollbars may appear on the scroll container.

**`hyphens: auto`:** Supported in Safari 12 with `-webkit-hyphens: auto`. The current code uses unprefixed `hyphens: auto` which will silently not apply.

**`@keyframes` pulse animation:** Supported in Safari 9+. Works without prefix.

**`filter: drop-shadow`:** The glow today-indicator uses this. Supported in Safari 9.1+. Works.

**Required work:** Fix `color-mix()` usage (use `rgba()` fallback or remove for iOS 12 path), add WebKit scrollbar hiding.

---

### 3. Tap-to-Expand/Collapse Card View

**What it does:** User taps the card body; `_handlePointerDown` + `_handlePointerUp` fire, `toggleExpanded()` is called, `isExpanded` reactive property flips, `groupEventsByDay()` re-runs with new state, Lit re-renders.

**iOS 12 complexity: HIGH**

The current implementation uses the Pointer Events API exclusively:
- `@pointerdown` on `ha-card`
- `@pointerup` on `ha-card`
- `@pointercancel` on `ha-card`
- `@pointerleave` on `ha-card`

Pointer Events (Level 2) are NOT supported in iOS 12 Safari. Safari added Pointer Events support in Safari 13 (iOS 13). On iOS 12, pointer events simply do not fire — the card will be completely non-interactive.

Touch Events ARE supported on iOS 12:
- `touchstart` (equivalent to pointerdown)
- `touchend` (equivalent to pointerup)
- `touchcancel` (equivalent to pointercancel)

The tap action flow (`_handlePointerDown` → `_handlePointerUp` → `handleAction` → `toggleExpanded`) needs to be rewritten or augmented to use Touch Events on iOS 12.

The `PointerEvent` type is also used in `createHoldIndicator()` in `feedback.ts` — the `event.pageX`/`event.pageY` and `event.pointerType` properties won't exist on a `TouchEvent`, requiring adaptation.

**Required work:** Add Touch Event fallback handlers that mirror the Pointer Event logic. Detect iOS 12 (or absence of `window.PointerEvent`) and attach `touchstart`/`touchend` listeners instead of (or in addition to) pointer listeners.

---

### 4. Tap-on-Event to Show/Hide Event Details

**What it does:** Individual events in the rendered list have click/tap handlers. Tapping an event expands it to show time, location, and description details. This is a per-event interaction, not the whole-card toggle.

**iOS 12 complexity: HIGH**

Same root cause as item 3 — event detail toggling in the render layer uses pointer events on individual event rows. The rendering in `render.ts` binds handlers (likely `@click` or `@pointerdown`) to event rows. On iOS 12, pointer events don't fire.

However, `@click` events DO work on iOS 12 Safari, with a known caveat: click events on non-interactive elements (divs, tds) require either `cursor: pointer` CSS or the element to be a button/anchor. The `ha-card` element and event rows would need `cursor: pointer` to be clickable, which is already set on `ha-card` (`cursor: pointer` in the styles).

There is also a known 300ms tap delay on iOS Safari for click events (fast-tap elimination). This is mostly resolved in iOS 13+ but may still apply on iOS 12 for elements without `touch-action: manipulation`. Adding `touch-action: manipulation` to interactive elements eliminates this delay.

**Required work:** Ensure event row interactions use `@click` (which works on iOS 12) or add touch event fallbacks. Add `touch-action: manipulation` to interactive elements. Verify `cursor: pointer` is set.

---

### 5. Core Styling Renders Acceptably (No Layout Breakage)

**What it does:** The visual layout — date column, vertical accent line, event rows, typography — renders without collapse, overlap, or invisible text.

**iOS 12 complexity: LOW-MEDIUM**

The table-based layout (`<table>`, `<tr>`, `<td>`) is very broadly compatible. CSS custom properties work. The primary concerns are:

- `color-mix()`: Two uses will silently fail (progress bar, empty day color) — visual degradation only
- Unprefixed `hyphens: auto`: Will not apply — words won't hyphenate but no layout breakage
- Shadow DOM styles scoped to `:host`: Lit's shadow DOM usage requires the Shadow DOM v1 polyfill on iOS 12, but the polyfill handles style scoping correctly
- `ha-card` and `ha-ripple` are Home Assistant custom elements: `ha-card` renders as a styled div; if Web Components polyfills are loaded, both will render. `ha-ripple` failing to register will create an empty DOM node with no visual impact
- `@supports (-webkit-touch-callout: none)` query: Used in the week-number Safari alignment adjustment. This query correctly targets iOS Safari and will apply the `padding-top` fix. This is already correct behavior

**Required work:** Minimal. Address `color-mix()` fallbacks and scrollbar WebKit prefix. Most layout will work.

---

## Differentiators (Good to Have — Not Blocking)

These features enhance the card but failure does not make it useless. They should be attempted after table stakes work, with acceptance that they may behave differently on iOS 12.

### 6. Multi-Language / Locale Support

**What it does:** `getEffectiveLanguage()` reads `hass.locale`, dayjs locale files are loaded, date formatting uses locale-appropriate month/weekday names.

**iOS 12 complexity: LOW**

dayjs itself is ES5-compatible and will work on iOS 12 once the build is downleveled. Locale detection from `hass.locale` uses basic property access. The `Intl` API (used optionally for some date operations) has partial support in iOS 12 — `Intl.DateTimeFormat` works but `Intl.ListFormat` and `Intl.RelativeTimeFormat` do not. Given dayjs handles most formatting internally, this is a low-risk feature.

**Required work:** Verify dayjs locale imports bundle correctly in the downleveled build. No other changes expected.

---

### 7. Configurable Styling via CSS Custom Properties

**What it does:** User-configured colors, font sizes, spacing are applied via CSS custom properties set as inline styles on `ha-card` via `styleMap()`. The `generateCustomPropertiesObject()` function outputs a key-value map.

**iOS 12 complexity: LOW**

CSS custom properties have been supported since Safari 9.1. The `styleMap()` directive from Lit sets inline styles, which also predates custom property support concerns. This feature should work on iOS 12 without modification.

One note: the `--ha-ripple-*` properties set for the `ha-ripple` element are irrelevant if that custom element doesn't render on iOS 12 — they'll just be ignored.

**Required work:** None specific to iOS 12.

---

### 8. Tap Action — More Info / Navigate / URL / Service Call

**What it does:** When `tap_action` is configured in the card YAML, tapping the card fires Home Assistant actions: `more-info` dispatches a `hass-more-info` DOM event, `navigate` pushes history state, `url` calls `window.open()`, `call-service` calls `hass.callService()`.

**iOS 12 complexity: MEDIUM**

The action dispatch itself (CustomEvent, history API, window.open) all work on iOS 12. The blocker is how the tap is detected — once Touch Events are plumbed in (Table Stakes item 3), tap actions will work through the same handler chain.

`CustomEvent` with `bubbles: true, composed: true` works in Shadow DOM on iOS 12 with polyfills. `window.history.pushState()` works on iOS 12. `window.open()` works.

**Required work:** Depends on Touch Events fix (item 3). No additional work once interactions are fixed.

---

### 9. Today Indicator (Dot/Icon/Emoji/Image)

**What it does:** Configurable visual indicator on the current day's date cell. Supports multiple types: `ha-icon` element, emoji span, image, glow/pulse variants.

**iOS 12 complexity: LOW-MEDIUM**

- `ha-icon` element: Works if Web Components polyfills load the element correctly. Since `ha-icon` is a Home Assistant custom element (not bundled with this card), it depends on Home Assistant having loaded it first — which is expected since this card runs inside Home Assistant's frontend.
- Emoji and text spans: Fully compatible.
- Image (`<img>`): Fully compatible.
- Glow (`filter: drop-shadow`): Works in Safari 9.1+.
- Pulse (`@keyframes` animation): Works in Safari 9+. `animation: pulse-animation 2s infinite ease-in-out` — supported.

**Required work:** None specific. Depends on Web Components polyfills being loaded for `ha-icon`.

---

### 10. Week Number Separators / Month Separators

**What it does:** Horizontal separator lines and week number pills rendered between day groups. Uses `<table>` layout for week row alignment. The `@supports (-webkit-touch-callout: none)` block applies iOS-specific padding.

**iOS 12 complexity: LOW**

Table layout for week rows is broadly compatible. The iOS-specific `@supports` detection already handles the vertical alignment fix for iOS. Inline `border-radius: 999px` and `display: inline-flex` on week number pills work in Safari 12.

**Required work:** None. Already has iOS-specific handling.

---

### 11. Progress Bar (Event Time Progress)

**What it does:** Renders a progress bar on current/ongoing events showing how far through the event time window the current time is.

**iOS 12 complexity: MEDIUM**

The HTML structure (two divs with width percentages) is compatible. The concern is `color-mix()` used for the unfilled bar background:
```css
background-color: color-mix(in srgb, var(--calendar-card-progress-bar-color) 20%, transparent);
```
This will silently fail on iOS 12 (Safari 15+ required), meaning the unfilled track background becomes transparent — the bar is invisible until it has fill. The filled portion itself renders correctly.

This is visual degradation, not a hard failure.

**Required work:** Replace `color-mix()` with an `rgba()` fallback for the unfilled track, or accept the visual degradation for iOS 12.

---

## Anti-Features (Explicitly Not Attempted on iOS 12)

These features should be explicitly excluded from the iOS 12 scope. Attempting them would create complexity that risks destabilizing the table stakes features.

### 12. Hold Action (Long-Press Gesture)

**What it does:** After 500ms of continuous pointer contact, `_holdTimer` fires, `_holdTriggered = true`, `createHoldIndicator()` renders a ripple animation, and on pointer release, the `hold_action` is executed instead of `tap_action`.

**Why not on iOS 12:**

The hold detection in `_handlePointerDown` / `_handlePointerUp` uses:
1. Pointer Events API — not available on iOS 12
2. `event.pointerId` tracking to match down and up events — no equivalent in Touch Events without custom implementation
3. `event.pointerType === 'touch'` to size the hold indicator — not available in Touch Events
4. CSS `transition` on the hold indicator ripple (`transform` + `opacity`) — these work, but the surrounding logic doesn't

Even if Touch Events were plumbed in as a fallback, the hold detection state machine (`_activePointerId`, `_holdTriggered`, `_holdTimer`, `_holdIndicator`) is marked as fragile in CONCERNS.md with no existing test coverage. Attempting to port this to Touch Events risks breaking the simpler tap interactions.

Additionally, the PROJECT.md already lists this as "Out of Scope":
> Hold action on iOS 12 — complex gesture, defer if needed

**Decision: Do not attempt. Explicitly disable hold action on iOS 12 (treat it as `none`).**

---

### 13. Weather Integration

**What it does:** Subscribes to Home Assistant weather entities via WebSocket (`hass.connection.subscribeMessage()`), receives daily/hourly forecast data, renders weather icons and temperature in date columns and/or event rows.

**Why not on iOS 12:**

Three compounding problems:

1. **WebSocket subscription complexity:** `hass.connection.subscribeMessage()` is a Home Assistant-specific WebSocket protocol layer. While WebSockets themselves work on iOS 12, the subscription management and callback pattern involves Promise chains and async patterns that are harder to downlevel correctly.

2. **`ha-icon` for weather icons:** Weather icons use `ha-icon` (Material Design Icons). While this may work with polyfills, the weather rendering layer adds significant template complexity, increasing surface area for rendering bugs.

3. **Scope:** PROJECT.md explicitly lists this as "Out of Scope":
> Weather integration on iOS 12 — complex feature, deprioritized

**Decision: Do not attempt. Weather config in YAML should be ignored gracefully (already handled — weather subscription setup checks for `this.config?.weather?.entity` before subscribing).**

---

### 14. Card Editor UI (Lovelace Dashboard Editor)

**What it does:** The visual configuration editor (`CalendarCardProEditor` in `src/rendering/editor.ts`) provides a GUI for configuring the card from within the Home Assistant dashboard. It uses `ha-entity-picker`, `ha-form`, and other Home Assistant custom elements loaded dynamically.

**Why not on iOS 12:**

1. This is an admin-only tool accessed through the Lovelace edit mode, not the end-user view
2. `editor.ts` is 2149 lines and uses `ha-entity-picker` loaded via dynamic `customElements.whenDefined()` — fragile even on modern browsers (noted in CONCERNS.md)
3. PROJECT.md explicitly lists this as "Out of Scope":
> Card editor UI on iOS 12 — admin tool, not end-user critical

**Decision: Do not attempt. The editor should register its custom element without crashing, but its actual functionality on iOS 12 is explicitly out of scope.**

---

### 15. `ha-ripple` Hover/Press Visual Feedback

**What it does:** `<ha-ripple>` is a Home Assistant custom element that provides Material Design ripple effects on hover and press. CSS custom properties `--ha-ripple-hover-*` and `--ha-ripple-pressed-*` configure its appearance.

**Why not on iOS 12:**

`ha-ripple` is a Home Assistant internal component that may or may not register on iOS 12 depending on the HA frontend's own polyfill strategy. More importantly, hover states (`:hover`) are not reliably triggerable on iOS touch screens — hover only fires on touch-and-hold, not on tap. The `ha-ripple` interaction model is pointer-based and visual-only; its absence does not affect functionality.

**Decision: Do not attempt. Accept that `ha-ripple` renders as an empty element or does nothing on iOS 12. Do not invest engineering effort here.**

---

## iOS 12-Specific Limitations Reference

| Capability | iOS 12 Status | Impact |
|---|---|---|
| Pointer Events API | NOT SUPPORTED (Safari 13+) | CRITICAL — all interactions broken without fallback |
| Web Components (Custom Elements v1) | Supported (Safari 10.3+) | OK with polyfills for edge cases |
| Shadow DOM v1 | Supported (Safari 10.1+) | OK with polyfills |
| CSS Custom Properties | Supported (Safari 9.1+) | OK |
| CSS Flexbox | Supported (Safari 9+, unprefixed) | OK |
| CSS Grid (basic) | Supported (Safari 10.1+) | OK — but not used in main layout |
| CSS Grid subgrid | NOT SUPPORTED (Safari 16+) | N/A — not used |
| `color-mix()` | NOT SUPPORTED (Safari 15+) | Minor visual degradation only |
| `@keyframes` animations | Supported (Safari 9+) | OK |
| CSS `transition` | Supported | OK |
| `filter: drop-shadow` | Supported (Safari 9.1+) | OK |
| `hyphens: auto` (unprefixed) | NOT SUPPORTED — needs `-webkit-hyphens` | Minor: words won't hyphenate |
| `scrollbar-width: none` | NOT SUPPORTED — needs `::-webkit-scrollbar` | Minor: scrollbars may show |
| Optional chaining (`?.`) | NOT SUPPORTED | CRITICAL — SyntaxError without transpilation |
| Nullish coalescing (`??`) | NOT SUPPORTED | CRITICAL — SyntaxError without transpilation |
| `Array.flatMap()` | NOT SUPPORTED | CRITICAL if used; needs polyfill |
| `Object.fromEntries()` | NOT SUPPORTED | CRITICAL if used; needs polyfill |
| `globalThis` | NOT SUPPORTED (Safari 12.1+) | CRITICAL if Lit 2.x uses it directly |
| Private class fields (`#`) | NOT SUPPORTED (Safari 14.1+) | CRITICAL if in bundled output |
| Class fields (public) | NOT SUPPORTED in some forms | MEDIUM — needs Babel class-properties |
| Touch Events | Supported | OK — the fallback path for Pointer Events |
| `CustomEvent` | Supported | OK |
| WebSocket | Supported | OK |
| `localStorage` | Supported | OK |
| `window.history.pushState` | Supported | OK |
| `Promise` | Supported (Safari 8+) | OK |
| `async/await` | Supported (Safari 10.1+) | OK — this is ES2017 and actually works |
| `Intl.DateTimeFormat` | Partial support | OK for basic usage |
| `Intl.RelativeTimeFormat` | NOT SUPPORTED | N/A — not used directly |
| Web Animations API | NOT SUPPORTED | N/A — not used (CSS transitions only) |
| `touch-action: manipulation` | Supported | OK — eliminates 300ms tap delay |
| `pointer-events: none` (CSS) | Supported | OK |

---

## Feature Summary Table

| Feature | Category | iOS 12 Complexity | Primary Blocker |
|---|---|---|---|
| Card loads without JS errors | Table Stakes | HIGH | ES2017+ syntax not transpiled |
| Events display in default view | Table Stakes | MEDIUM | `color-mix()` degradation; Shadow DOM polyfills |
| Tap-to-expand/collapse card | Table Stakes | HIGH | Pointer Events not supported |
| Tap-event-for-details | Table Stakes | HIGH | Pointer Events not supported |
| Core styling renders acceptably | Table Stakes | LOW-MEDIUM | `color-mix()`, `-webkit-hyphens` |
| Multi-language / locale | Differentiator | LOW | None specific to iOS 12 |
| CSS custom property styling | Differentiator | LOW | None — fully supported |
| Tap actions (more-info, navigate, url) | Differentiator | MEDIUM | Depends on Touch Events fix |
| Today indicator | Differentiator | LOW-MEDIUM | `ha-icon` polyfill dependency |
| Week/month separators | Differentiator | LOW | None — already has iOS fix |
| Progress bar | Differentiator | MEDIUM | `color-mix()` visual degradation |
| Hold action | Anti-Feature | N/A | Complex gesture, no Pointer Events |
| Weather integration | Anti-Feature | N/A | Complex, explicitly out of scope |
| Card editor UI | Anti-Feature | N/A | Admin tool, explicitly out of scope |
| `ha-ripple` visual feedback | Anti-Feature | N/A | Pointer-based, hover unreliable on touch |

---

## Recommended "Core Features Only" Definition

For iOS 12, "core features only" means:

**In:** Card loads, events display, taps work (expand/collapse + event details), basic styling holds, locale-appropriate date formatting works, tap actions dispatch to Home Assistant.

**Out:** Hold action, weather, editor UI, `ha-ripple` ripple effects, `color-mix()` visual polish on progress bar and empty day color.

**Accept degraded:** Progress bar has no background track (unfilled portion transparent). Text in empty day rows may not have the 60% opacity effect. Scrollbars may appear briefly on the content container. Long words won't hyphenate.

---

*Research: 2026-02-23*
