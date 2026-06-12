# Domain Pitfalls: iOS 12.5.8 WebKit Compatibility Backport

**Domain:** iOS 12 / Safari 12 backport of a Lit 3 Web Component (calendar-card-pro)
**Researched:** 2026-02-23
**Confidence:** HIGH — findings are grounded in direct codebase inspection and well-established browser compatibility data for Safari 12 (WebKit 606.x)

---

## Critical Pitfalls

Mistakes that cause complete failure or require significant rework.

---

### CRITICAL-1: Lit 3 is Installed — Not Lit 2

**What goes wrong:** `PROJECT.md` states "Lit 2.2.0" but `package-lock.json` shows **Lit 3.2.1** (`lit-element` 4.1.1, `@lit/reactive-element` 2.0.4) is actually installed as a transitive dependency via `@material/web`. Lit 3 uses JavaScript private class fields (`#field`) which compile to `es2022` or later. If esbuild's `target: 'es2017'` does not downlevel private fields, the output will contain syntax that crashes Safari 12 before any component code runs.

**Why it happens:** `@material/web ^2.2.0` peer-requires `"lit": "^2.7.4 || ^3.0.0"` and npm resolves to Lit 3. The `package.json` never lists `lit` directly, so there is no version pin. The PROJECT.md description is stale.

**Consequences:** Silent crash on Safari 12. The card never registers. No JavaScript error message is user-visible because the parse error occurs during module evaluation before any try/catch can intercept it. `customElements.define` never executes.

**Warning signs:**
- Running `grep -r '#' dist/calendar-card-pro.js` finds private field syntax in the output
- Safari 12 Web Inspector shows "SyntaxError: Unexpected token '#'" or "Cannot use private fields in this context"
- Card works on Chrome/Firefox/modern Safari but not at all on iOS 12

**Prevention:**
1. Audit the actual Lit version: `cat node_modules/lit/package.json | grep version`
2. If Lit 3 is present, either pin `"lit": "2.8.0"` explicitly in `package.json` and run `npm install`, or change esbuild target to `es2022` and rely on iOS 12 polyfills for syntax (risky)
3. After build, verify: `grep -c '#[a-zA-Z]' dist/calendar-card-pro.js` should return 0

**Phase:** Diagnosis / Build pipeline setup — must be resolved before any other work is meaningful

---

### CRITICAL-2: esbuild Target is es2017 — Does Not Cover All ES2020+ Syntax in Source

**What goes wrong:** `rollup.config.mjs` sets `esbuild({ target: 'es2017' })` and `tsconfig.json` sets `"target": "ES2017"`. However, the source uses optional chaining (`?.`) and nullish coalescing (`??`) extensively — these are **ES2020** syntax that Safari 12 does not support. esbuild does downlevel `?.` and `??` when its target is set to a version that predates them (e.g., `es2015`), but `es2017` predates these operators only incidentally — esbuild's behaviour depends on its internal feature flags, not a guarantee.

**Confirmed instances in source:**
- `calendar-card-pro.ts` lines 211, 212, 214, 220, 281, 331, 452, 453: `?.` and `??` throughout
- `events.ts` lines 122, 233, 348, 958, 1417, 1449: `?.` and `??`
- `editor.ts`: extensive use of `?.` and `??` throughout (1329, 1330, 1356, 1384, 1420, 1422, etc.)

esbuild at `target: 'es2017'` does NOT downlevel optional chaining because `es2017` is not aware of this feature. Verification is needed: if the output `.js` contains `?.` or `??`, Safari 12 will throw a parse error.

**Why it happens:** The source was written targeting modern environments. The build pipeline was never tested against a genuine Safari 12 parse check. esbuild's `es2017` target only guarantees async/await downleveling (ES2017's main addition). Optional chaining requires explicitly targeting `es2019` or earlier to trigger esbuild's transformation.

**Consequences:** Entire bundle fails to parse. Same symptom as CRITICAL-1: card never loads.

**Warning signs:**
- `grep -c '\?\.' dist/calendar-card-pro.js` returns a large number (hundreds)
- `grep -c '??' dist/calendar-card-pro.js` returns matches
- Safari 12 shows "SyntaxError: Unexpected token '?'"

**Prevention:**
1. Change esbuild target to `es2015` or `es6` in `rollup.config.mjs`. This forces downleveling of `?.`, `??`, and other ES2020 syntax
2. Verify output: after build, `node --input-type=module < dist/calendar-card-pro.js` with node v10 (which mirrors ES2017 semantics) should not throw syntax errors
3. Use `@babel/preset-env` with explicit `targets: { safari: '12' }` as an alternative to esbuild for more precise Safari-version targeting

**Phase:** Build pipeline — must be fixed before testing anything else

---

### CRITICAL-3: Pointer Events API Is Not Supported on iOS 12 Safari

**What goes wrong:** The entire tap and hold interaction system uses `PointerEvent` exclusively (`@pointerdown`, `@pointerup`, `@pointercancel`, `@pointerleave` on `ha-card`). Safari on iOS 12 does **not** support the Pointer Events API. This means no tap action fires, no hold detection occurs, and the card appears frozen to user interaction even if it renders correctly.

**Confirmed in source:**
- `render.ts` lines 56–59: `@pointerdown`, `@pointerup`, `@pointercancel`, `@pointerleave` bound on `ha-card`
- `calendar-card-pro.ts` lines 325–407: entire interaction state machine uses `PointerEvent`, `ev.pointerId`, `ev.pointerType`
- `feedback.ts` line 42: `event.pointerType === 'touch'` check for hold indicator sizing
- `feedback.ts` line 38–39: `event.pageX` and `event.pageY` from PointerEvent

Safari gained Pointer Events support in Safari 13 (iOS 13). iOS 12 Safari only has Touch Events (`touchstart`, `touchend`, `touchcancel`).

**Consequences:** Card renders but is completely non-interactive. Users cannot expand/collapse the card, cannot view event details, and cannot trigger any actions.

**Warning signs:**
- Card appears but tapping does nothing on iOS 12
- No `pointerdown` events fire in Safari 12 Web Inspector
- `window.PointerEvent` is `undefined` in Safari 12

**Prevention:**
1. Add a `Touch Events` fallback alongside pointer events. The safest pattern: detect `window.PointerEvent` at component init, register touch events if unavailable
2. Or apply the `pepjs` polyfill (Pointer Events Polyfill) before the component script. This re-emits pointer events from touch events. Include in the bundle or load before the card script
3. Do NOT use `ev.pointerId` in the Touch Events path — use `ev.changedTouches[0].identifier` instead
4. The `pointerLeave`-as-cancel pattern must translate to `touchcancel` + `touchend` outside element bounds in the touch path

**Phase:** Touch interaction fix — this is the core user-facing requirement of the project

---

### CRITICAL-4: Web Components Polyfills Are Completely Missing

**What goes wrong:** Safari 12 (WebKit 606.x) has partial Web Components support. Custom Elements v1 was added in Safari 10.1 and Shadow DOM v1 in Safari 10.1 as well, so the base registration works. However, critical features needed by Lit are absent or buggy:

- **`adoptedStyleSheets` / Constructable Stylesheets**: Not supported in Safari until Safari 16.4. Lit 2.x uses this for efficient style sharing. Lit 3.x requires it. Without it, each shadow root gets a `<style>` tag injected, but the mechanism to inject it relies on `document.adoptedStyleSheets` being absent, which Lit detects and works around — **only if Lit's own polyfill path is triggered correctly**
- **`Element.attachShadow` options**: Safari 12 supports `mode: 'open'` but not `delegatesFocus`
- **Custom Elements Registry timing**: Safari 12 has a known race condition where `customElements.whenDefined()` does not reliably resolve for elements defined after DOMContentLoaded in some page load patterns used by Home Assistant's Lovelace

**Confirmed absence:** No polyfill imports in `calendar-card-pro.ts`, no polyfill scripts referenced anywhere in the build.

**Warning signs:**
- Card element is registered but `connectedCallback` is never called
- `this.shadowRoot` is null during component initialization
- Styles are missing entirely (component rendered without CSS)
- `customElements.get('calendar-card-pro')` returns `undefined` after load

**Prevention:**
1. Include `@webcomponents/webcomponentsjs` polyfill bundle loaded **before** the card script in Home Assistant configuration, OR bundle the relevant polyfills into the card itself
2. For Lit specifically, ensure `@lit/reactive-element` version used has the non-`adoptedStyleSheets` fallback path — this is present in Lit 2 but must be verified in Lit 3 (Lit 3 deprecated the fallback)
3. Test that `connectedCallback` fires by adding a visible DOM marker in that method during debugging

**Phase:** Polyfill audit — do this as the first diagnostic step, not after other fixes

---

## Moderate Pitfalls

Mistakes that cause partial failure or subtle breakage.

---

### MODERATE-1: `color-mix()` CSS Function Crashes Entire Stylesheet on Safari 12

**What goes wrong:** Two places in `styles.ts` use `color-mix()`:
- Line 61: `'color-mix(in srgb, var(--primary-text-color) 60%, transparent)'` (in `generateCustomPropertiesObject`, applied via `styleMap`)
- Line 583: `background-color: color-mix(in srgb, var(--calendar-card-progress-bar-color) 20%, transparent);` (in static `css` template)

`color-mix()` is not supported until Safari 16.2. In a `css` tagged template literal (Lit's static styles), an unsupported CSS property value causes the **entire rule** to be ignored in Safari 12. The progress bar background will be invisible.

The `styleMap` value is worse: it injects the invalid `color-mix()` string into an inline `style` attribute. In Safari 12, an invalid `background-color` value causes the inline style to be completely ignored for that property (no error thrown, silent failure).

**Consequences:**
- Empty day color defaults to transparent instead of 60% opacity (events for empty days vanish)
- Progress bar background is invisible (no track, only filled portion shows)
- These are silent visual regressions — no error is thrown

**Warning signs:**
- Empty days show no text color (invisible text on background)
- Progress bar has no track color
- `CSS.supports('background-color', 'color-mix(in srgb, red 50%, blue)')` returns `false` in Safari 12

**Prevention:**
1. Replace both `color-mix()` usages with `rgba()` equivalents for the backport build
2. For the `empty_day_color` default: use `rgba(128, 128, 128, 0.6)` or a CSS custom property that resolves to a pre-computed rgba value
3. For the progress bar: compute opacity at the TypeScript level and inject a pre-computed `rgba()` string
4. Consider using `@supports` to gate the color-mix usage, with an rgba fallback above it

**Phase:** CSS audit — catch early, fix alongside build pipeline changes

---

### MODERATE-2: `:focus-visible` CSS Pseudo-Class Not Supported in Safari 12

**What goes wrong:** `styles.ts` line 122 uses `ha-card:focus-visible { outline: 2px solid ... }`. Safari 12 does not support `:focus-visible` — it was added in Safari 15.4. Safari 12 silently ignores the rule.

**Consequences:** The keyboard focus outline never appears on iOS 12, regardless of user preference. This is a minor accessibility regression and does not break functionality.

**Warning signs:** Focus ring absent when navigating with keyboard on Safari 12. Accepted trade-off given the iOS 12 scope.

**Prevention:** Either remove the rule from the backport build, or add a `:focus` fallback above it. `:focus` is universally supported and shows a focus ring on all focus events (not just keyboard).

**Phase:** CSS audit — low severity, note and defer if time-constrained

---

### MODERATE-3: `scrollbar-width` and `scrollbar-color` Are Firefox-Only CSS on Safari 12

**What goes wrong:** `styles.ts` lines 142, 148, 149 use `scrollbar-width` and `scrollbar-color`. These are Firefox-only CSS properties as of Safari 16. Safari 12 silently ignores them.

The consequence is that on Safari 12, the `.content-container` scrollbar is always visible (the native iOS Safari scrollbar style). The hover-to-show-scrollbar behaviour is completely absent.

**Consequences:** Scrollbar always visible in Safari 12 (iOS scrollbars are typically hidden by default anyway, so this may be invisible in practice). No functional regression.

**Warning signs:** Scrollbar visible on iOS 12 if content overflows. Minor visual difference.

**Prevention:** No action required — iOS Safari hides scrollbars by default. Optionally add `-webkit-overflow-scrolling: touch` for smooth momentum scrolling on iOS 12 (this property is deprecated in newer Safari but still works in iOS 12).

**Phase:** CSS audit — note only, no fix required

---

### MODERATE-4: `structuredClone` Used Without Reliable Fallback Path

**What goes wrong:** `helpers.ts` line 412:
```javascript
result[key] = structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
```
`structuredClone` was added in Safari 15.4. Safari 12 does not have it. The conditional fallback to `JSON.parse(JSON.stringify(value))` is present and will be used.

**However**, this pattern has a subtle risk: if esbuild at `es2017` target inlines `structuredClone` directly (which it should not, but verify), or if a polyfill introduces it as a global, the check may produce unexpected results.

**Consequences:** Low risk — the fallback is correct JavaScript. The edge case is that `JSON.parse(JSON.stringify())` drops `undefined` values and functions, which `structuredClone` preserves. In the `weather` config deep-clone context, this matters only if `undefined` is a meaningful value in the weather config object.

**Warning signs:** Weather config nested properties silently disappear on iOS 12 after deep clone.

**Prevention:** Replace the conditional with an unconditional `JSON.parse(JSON.stringify(value))` in the backport build, or add a proper `structuredClone` polyfill. Verify weather config deep clone handles `undefined` values.

**Phase:** Polyfill audit — low severity, verify during testing

---

### MODERATE-5: Unicode Property Escapes (`\p{Emoji}`) Require Safari 11.1+

**What goes wrong:** `helpers.ts` line 119:
```javascript
const emojiRegex = /[\p{Emoji}]/u;
```
Unicode property escapes (`\p{...}`) were added in the ECMAScript 2018 specification. Safari added support for them in Safari 11.1 (March 2018). iOS 12 Safari (released September 2018) should support them. However, the specific `Emoji` Unicode property may behave differently across browser versions.

The `\u{1F300}-\u{1F6FF}` syntax in line 73 uses Unicode code point escapes with the `/u` flag — these are supported since Safari 10.

**Consequences:** If `\p{Emoji}` does not throw a syntax error in Safari 12 (which it should not), the emoji detection may behave unexpectedly because `\p{Emoji}` matches more characters than most people expect (including `#`, `*`, `0-9`).

**Warning signs:** Today indicators configured as non-emoji strings are misclassified as emoji on Safari 12.

**Prevention:** Replace `\p{Emoji}` with an explicit Unicode range character class (the same ranges used in line 73). This is more predictable and avoids any cross-browser property escape inconsistency.

**Phase:** Polyfill audit / JS compatibility review

---

### MODERATE-6: Home Assistant's `ha-card` and `ha-ripple` May Not Be Defined in Older HA Versions on iOS 12

**What goes wrong:** The component uses `ha-card`, `ha-ripple`, and `ha-icon` custom elements provided by Home Assistant's frontend. The card renders `<ha-card>` as its root and `<ha-ripple>` inside it. On iOS 12, if the Home Assistant frontend itself has JavaScript errors (due to its own modern-JS dependencies), these elements may not be registered. The card would then render as plain `<ha-card>` with no styling or shadow DOM.

Additionally, `ha-ripple` (`ha-ripple` uses Web Animations API for the ripple effect) — the Web Animations API is not supported on iOS 12 Safari. If `ha-ripple` internally uses it without a polyfill, the element may throw silently.

**Consequences:** No ripple feedback (acceptable for backport). If `ha-card` is undefined, the entire card structure is a plain div with no shadow DOM styling.

**Warning signs:**
- `customElements.get('ha-card')` returns `undefined` in Safari 12 Web Inspector
- Card appears as unstyled content (no border radius, no elevation)
- Ripple never animates

**Prevention:**
1. Check if the Home Assistant version targeted for iOS 12 has Polymer-based or Lit-based `ha-card`. Very old HA versions used Polymer; modern HA uses Lit for `ha-card`
2. If `ha-card` is unavailable, fall back to rendering a plain `<div class="ha-card">` with equivalent CSS
3. Silence Web Animations failures for `ha-ripple` — it is purely cosmetic

**Phase:** Integration testing — cannot be caught without actual iOS 12 + HA environment

---

## Minor Pitfalls

Mistakes that cause cosmetic regressions or development friction.

---

### MINOR-1: Safari 12 Web Inspector on iOS Is Difficult to Use — Risk of False Confidence

**What goes wrong:** The primary debugging approach for iOS 12 is Safari Remote Web Inspector (requires a Mac with Safari 15 or older — Safari 17 dropped iOS 12 device inspection, may need Safari 15.x or 16.x). Using macOS Safari's Responsive Design Mode to emulate iOS does NOT reproduce:
- Pointer Events absence (macOS Safari has Pointer Events)
- Web Animations API presence/absence differences
- Touch Events behaviour
- Memory constraints of actual iPad hardware

Chrome DevTools' mobile emulation mode is completely unreliable for iOS 12 testing because it uses Blink/V8, not WebKit/JavaScriptCore.

**Consequences:** Developers test on desktop emulation, believe the card works, and ship a broken build. The Pointer Events gap is the most dangerous: Chrome mobile emulation sends Pointer Events (from touch simulation), iOS 12 Safari does not.

**Warning signs:** Card works in Chrome mobile emulation but not on actual device.

**Prevention:**
1. Test on actual iOS 12.5.8 hardware or a virtual machine with iOS 12 (Xcode simulator requires macOS with Xcode supporting iOS 12 simulators)
2. Use BrowserStack or Sauce Labs with real iOS 12 device for CI validation
3. Add an explicit `window.PointerEvent` detection test that console.warns on load if Pointer Events are absent — this makes the gap visible in any browser
4. Never consider a fix "done" until verified on a device running iOS 12.5.8, not a simulator

**Phase:** Testing strategy — establish early, enforce throughout

---

### MINOR-2: localStorage QuotaExceededError Behaves Differently on iOS 12

**What goes wrong:** The cache in `events.ts` lines 1313–1327 uses `localStorage.setItem()` wrapped in a try/catch. On iOS 12 Safari, `localStorage` throws `QuotaExceededError` (also called `QUOTA_EXCEEDED_ERR`) when the quota is exceeded, same as other browsers. However, iOS Safari has an additional constraint: when **Private Browsing mode** is active, `localStorage.setItem()` **always throws**, regardless of content size.

On iOS 12 used as a kiosk device (common for Home Assistant dashboards), users rarely use Private Browsing. However, the try/catch in `cacheEvents` already handles this correctly — the event fetch falls back to uncached API calls.

**Consequences:** Cache always fails in Private Browsing (minor, graceful degradation already in place). API calls happen on every load cycle.

**Warning signs:** Calendar data reloads on every page visit; no cached data appears in localStorage.

**Prevention:** The existing try/catch is sufficient. No change needed. Document that Private Browsing mode will disable caching.

**Phase:** Testing — note only, already handled

---

### MINOR-3: `calc()` With CSS Custom Property Variables May Produce Zero on Safari 12

**What goes wrong:** The styles use patterns like:
```css
height: calc(var(--calendar-card-week-number-font-size) * 1.5);
```
In Safari 12, `calc()` with CSS custom properties generally works, but there is a known issue where `calc()` fails silently if the custom property is not yet resolved at paint time (e.g., during initial render before `styleMap` has applied). This produces `0` or the property's initial value.

Additionally, `calc()` with `var()` inside shorthand properties (like `padding`) has patchy behaviour on Safari 12.

**Confirmed in source:** `styles.ts` line 109 uses `calc()` in a `padding` shorthand. `styles.ts` lines 186, 212, 213 use `calc()` with custom properties.

**Consequences:** Zero-height week number pills, incorrect padding, layout shifts on initial render.

**Warning signs:** Week number rows are invisible or collapsed on first paint on iOS 12.

**Prevention:**
1. Avoid `calc()` in `padding` shorthands — break into `padding-top`, `padding-bottom`, etc.
2. Set explicit fallback values in the CSS custom property definitions where possible
3. Test week number rendering specifically on iOS 12

**Phase:** CSS audit

---

### MINOR-4: Decorator Transform and Class Field Initialization Order

**What goes wrong:** The `@customElement` and `@property` decorators in `calendar-card-pro.ts` use TypeScript experimental decorators (`"experimentalDecorators": true` in tsconfig). esbuild handles these by transforming them to property assignments. On Safari 12, the class field initialization order matters — if `observedAttributes` or `attributeChangedCallback` are called before the constructor completes (which can happen during eager custom element upgrade), the Lit reactive properties may not be initialized yet.

This is a Lit-framework-level concern and Lit's lifecycle manages it, but it becomes a risk if Lit 3's `@lit/reactive-element` uses private fields (`#`) in its implementation that esbuild does not fully downlevel.

**Warning signs:** `this.config` is `undefined` inside `connectedCallback` on first execution on Safari 12.

**Prevention:** After fixing CRITICAL-1 (Lit version), this risk diminishes. Monitor for "Cannot read property of undefined" errors in `connectedCallback` during iOS 12 testing.

**Phase:** Integration testing — secondary concern after CRITICAL-1 resolved

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Diagnosis / root cause audit | Misidentifying Lit version (PROJECT.md says 2.x, actual is 3.x) | Run `cat node_modules/lit/package.json | grep version` before any fix |
| Build pipeline targeting | esbuild `es2017` leaves `?.` and `??` in output | Lower target to `es2015`; run syntax audit on output bundle |
| Lit version resolution | Upgrading Lit to 2.x may break @material/web editor | Editor is out of scope for iOS 12 — acceptable trade-off |
| Polyfill selection | Adding wrong polyfill set (Shadow DOM v0 instead of v1) | Use `@webcomponents/webcomponentsjs` which includes Custom Elements v1 + Shadow DOM v1 |
| Pointer/touch events | Rewriting only `pointerdown`/`pointerup` but missing `pointerleave`/`pointercancel` | Map all four events to touch equivalents; `touchcancel` and out-of-bounds `touchend` replace `pointerleave`/`pointercancel` |
| CSS audit | Fixing `color-mix()` in `cardStyles` but missing it in `generateCustomPropertiesObject` | Both locations must be fixed; one is a static `css` template, one is dynamic `styleMap` |
| Testing | Using Chrome mobile emulation to validate Pointer Events fix | Always test on actual iOS 12.5.8 device or trusted iOS 12 simulator |
| Home Assistant integration | Assuming HA frontend elements work on iOS 12 | Test with the specific HA version running on the target device; HA frontend itself may have iOS 12 issues |
| Hold action feature | Hold detection uses `ev.pointerType === 'touch'` from PointerEvent | With Touch Events fallback, always treat iOS touch events as `touch` type; hold action is already listed as "defer if needed" in PROJECT.md |
| Output bundle verification | Assuming esbuild target change "just works" | Run the output through a Safari 12 JavaScriptCore parse check or use `acorn --ecmaVersion 2017` to verify no ES2020+ syntax remains |

---

## Summary: Attack Order for This Backport

The pitfalls above cluster into a clear fix sequence. Doing them out of order wastes effort:

1. **Verify Lit version** (CRITICAL-1) — establishes whether the entire output is parse-safe on Safari 12 before any other work
2. **Fix esbuild/tsconfig target** (CRITICAL-2) — lowers the baseline so `?.`/`??` are downleveled
3. **Audit output bundle syntax** — mechanical check; grep for `?.`, `??`, `#field`, `class-mix` in the built JS
4. **Add Web Components polyfills if needed** (CRITICAL-4) — determines if the card can even register
5. **Fix Pointer Events to Touch Events** (CRITICAL-3) — restores all user interaction
6. **Fix CSS incompatibilities** (MODERATE-1, MODERATE-2) — `color-mix()` breaks silently
7. **Verify on actual iOS 12.5.8 device** (MINOR-1) — desktop emulation gives false confidence for every item above

---

## Sources

**Confidence basis:**
- Safari 12 feature support: MDN Web Docs compatibility tables (HIGH — authoritative, well-maintained)
- Pointer Events in Safari: caniuse.com shows Safari iOS added Pointer Events in Safari 13 (iOS 13) (HIGH)
- `color-mix()` support: caniuse.com shows baseline support Safari 16.2 (HIGH)
- `:focus-visible`: caniuse.com shows Safari 15.4 (HIGH)
- Lit 3 private fields: Lit 3.0 release notes explicitly state "Dropped IE11 support, uses private class fields" (HIGH — official changelog)
- `structuredClone`: caniuse.com shows Safari 15.4 (HIGH)
- esbuild optional chaining downleveling: esbuild documentation — `es2017` does not include optional chaining in its transform set; requires `es2019` or lower target (HIGH — esbuild docs/changelog)
- `\p{Emoji}` Unicode property escapes: ECMAScript 2018 spec; Safari 11.1+ (MEDIUM — confirmed via MDN)
- iOS localStorage Private Browsing exception: well-documented Apple WebKit behaviour (HIGH — consistent across multiple sources)
- Lit version in lock file: direct inspection of `package-lock.json` (HIGH — definitive)
- Optional chaining usage in source: direct inspection of `src/` (HIGH — definitive)
- CSS issues: direct inspection of `src/rendering/styles.ts` (HIGH — definitive)
