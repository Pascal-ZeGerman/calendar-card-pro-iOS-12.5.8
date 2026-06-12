# Architecture Patterns: iOS 12 Compatibility Backport

**Domain:** iOS 12 / Safari 12 compatibility for a Lit 2.x Web Component
**Researched:** 2026-02-23
**Confidence:** HIGH (based on direct codebase analysis + training knowledge of Safari 12 WebKit, esbuild, and Web Components polyfill ecosystem)

---

## Recommended Architecture

**Single bundle, modified build pipeline.** Do not produce a separate iOS 12 artifact. Modify the main build so it is backward compatible with Safari 12. One bundle is simpler to distribute (HACS expects a single file), avoids users needing to choose the right variant, and the bundle size penalty from polyfills is small relative to the existing bundle.

The compatibility work decomposes into four distinct dimensions, each with clear component ownership and an independent fix surface. They can be tackled sequentially in the order given below because each layer reveals or unblocks the next.

---

## Component Boundaries and What Changes

### 1. Build Pipeline (`rollup.config.mjs` + `tsconfig.json`)

**What changes:** Transpilation target must drop from ES2017 to ES2015 (or `safari12` if using Babel). esbuild's `target` option must become `'safari12'` or equivalent (`['es2015', 'chrome71', 'safari12']`). TypeScript `compilerOptions.target` should align.

**Why this is the first change:** If the JS bytecode contains untransformed optional chaining (`?.`), nullish coalescing (`??`), or ES2020+ syntax, the browser throws a parse error before any polyfill has a chance to run. The build pipeline must be fixed before anything else is testable on the target device.

**Key decision — esbuild or Babel:**

Use esbuild with `target: 'safari12'`. esbuild version 0.25.2 (already in use) supports named browser targets including `safari12`. It will correctly transpile:
- Optional chaining (`?.`) → property access with guards
- Nullish coalescing (`??`) → conditional expressions
- Logical assignment operators (`&&=`, `||=`, `??=`)
- Class fields, private methods
- `async/await` (already present in Safari 12 — esbuild will not touch these)

esbuild does NOT transpile decorators — but TypeScript's decorator emit handles that before esbuild sees the code. The existing `experimentalDecorators: true` in tsconfig is correct.

Do NOT add Babel. Adding `@babel/preset-env` on top of esbuild doubles the transpilation pass, creates duplicate helpers, increases build time, and introduces a second config surface to maintain. esbuild with a correct target handles the same syntax transformations for this project's use case. Babel's value is for its plugin ecosystem (e.g., `@babel/plugin-transform-runtime`) — that ecosystem is not needed here.

**Confidence:** HIGH. esbuild named targets are well-documented and `safari12` is a supported value.

---

### 2. Web Components Polyfills (`src/polyfills/` — new directory)

**What changes:** A polyfill loader must be injected at the top of the bundle entry point. Safari 12 has partial Web Components support: `customElements` and `ShadowDOM` are present but incomplete. The specific gaps that affect Lit 2.x on Safari 12 include:

- `customElements.get()` — present in Safari 12 but behaviors differ
- `Element.attachShadow()` — present, but `delegatesFocus` option causes errors in some configurations
- `CSSStyleSheet` constructable stylesheets (Lit's `static styles = [...]` optimization) — **NOT supported** in Safari 12; Lit falls back to inline `<style>` injection, which works but is less performant
- `adoptedStyleSheets` — not available in Safari 12; again Lit handles this gracefully with its fallback path

**The @webcomponents/polyfills package** (`@webcomponents/webcomponentsjs`) covers Shadow DOM v1, Custom Elements v1, and HTML Template. These are the three specs Lit 2.x relies on. The polyfill is designed to be a no-op on browsers that already support the spec, making it safe to include unconditionally.

**Injection approach:** Bundle the polyfill at build time, prepended to the Rollup output. Do not use runtime `<script>` tag injection or dynamic import — the Home Assistant Lovelace environment loads the card via a single `<script>` tag and there is no reliable hook to inject additional scripts before the card executes. Bundling the polyfill via the Rollup entry point (imported at the top of `src/calendar-card-pro.ts`, or via a new `src/polyfills/index.ts` that is the actual Rollup entry) keeps the single-file distribution model intact.

**Pattern:**

```
src/polyfills/index.ts          ← new: imports polyfill, then re-exports main component
rollup.config.mjs               ← change input from src/calendar-card-pro.ts to src/polyfills/index.ts
```

This isolates all polyfill concerns to one file and keeps `src/calendar-card-pro.ts` clean.

**Alternative (inline feature detection):** Some teams use `if (!window.customElements) { /* load polyfill */ }` at runtime. This does not work for the HACS single-file distribution model — there is no async loading mechanism. Avoid this approach.

**Confidence:** MEDIUM. Lit 2.x's graceful fallback for `adoptedStyleSheets` is documented behavior. The specific Safari 12 WebComponents polyfill gaps are based on training knowledge; the audit phase should verify by checking the browser console on the target device.

---

### 3. Interaction Layer (`src/interaction/actions.ts`, `src/interaction/feedback.ts`, `src/calendar-card-pro.ts`)

**What changes:** Pointer Events API is not supported in Safari 12 (added in Safari 13.1). The current code uses `PointerEvent` types and `@pointerdown` / `@pointerup` / `@pointercancel` / `@pointerleave` event listeners throughout the render and lifecycle code.

**Strategy:** Add a touch event fallback alongside the existing pointer events. Do not remove pointer events — modern browsers should continue using the pointer event path. Use feature detection at runtime to select the event binding strategy.

The cleanest architectural change is an **event adapter** — a thin module at `src/interaction/touch-compat.ts` that:
1. Detects `window.PointerEvent` support at initialization time
2. Exposes a stable `HandlerSet` interface (already used by `renderMainCardStructure`)
3. Returns either pointer handlers or equivalent touch/mouse handlers depending on capability

The existing `handlers` object passed to `renderMainCardStructure` is the right abstraction boundary. The render function already accepts handlers as a plain object — no change to `render.ts` is needed. Only the construction of that object in `calendar-card-pro.ts` needs to be conditional.

**Touch event mapping for Safari 12:**

| Pointer Event | Touch Equivalent | Mouse Equivalent |
|---------------|-----------------|------------------|
| `pointerdown` | `touchstart` | `mousedown` |
| `pointerup` | `touchend` | `mouseup` |
| `pointercancel` | `touchcancel` | `mouseleave` |
| `pointerleave` | `touchcancel` | `mouseleave` |

**Hold detection on touch events:** The existing hold detection logic (`_activePointerId`, `_holdTriggered`, `_holdTimer`) uses `ev.pointerId` to track the active pointer. Touch events use `ev.touches[0].identifier` for the same purpose. The touch adapter must map `TouchEvent` to a compatible shape — specifically extracting `touches[0].identifier` into a synthetic `pointerId` field.

**Hold action on iOS 12 is out of scope** per PROJECT.md — but the hold timer and cancellation logic must still be cleaned up gracefully when touch events arrive, or it will leave orphaned timers.

**`feedback.ts` — PointerEvent type dependency:** `createHoldIndicator(event: PointerEvent, ...)` uses `event.pointerType` to distinguish touch from mouse, and `event.pageX` / `event.pageY` for positioning. If hold action is deferred, this entire function becomes unreachable on iOS 12. If it becomes reachable, the function signature needs to accept `TouchEvent | PointerEvent` and use `touches[0].pageX` for touch events.

**Confidence:** HIGH. Safari 12 Pointer Events absence is a well-known compatibility issue, confirmed by caniuse data (Pointer Events shipped in Safari 13).

---

### 4. CSS / Rendering Layer (`src/rendering/styles.ts`, `src/rendering/render.ts`)

**What changes (likely minor):**

- `CSS Grid` is supported in Safari 12 but `subgrid` is not — verify no subgrid is used in `cardStyles`
- `CSS custom properties` (`var(--x)`) are fully supported in Safari 12 — no change needed
- `clip-path`, `backdrop-filter` — check usage; limited Safari 12 support
- `styleMap` directive (Lit) — uses `element.style` assignment internally, works in Safari 12
- `classMap` directive — operates on `className`, works in Safari 12
- The `ha-ripple` element in `renderMainCardStructure` — this is a Home Assistant custom element; if it fails to register (because Home Assistant's own frontend also has compatibility issues on iOS 12), Lit's unknown element handling will render an empty `<ha-ripple>` tag which is harmless

The CSS concern is the lowest risk dimension. Safari 12 has good CSS coverage for the patterns in use. A visual audit after getting JS working is sufficient — no preemptive CSS changes are needed.

**Confidence:** HIGH for CSS custom properties and grid basics. MEDIUM for edge cases in clip-path/backdrop-filter without a physical device audit.

---

## Recommended Implementation Order

The four dimensions have hard dependencies. Each phase must be complete before the next is meaningful to test.

```
Phase 1: Build Pipeline
  → Change esbuild target to safari12
  → Verify bundle parses without errors in Safari 12 (or Playwright WebKit)
  → No behavior change expected on modern browsers (esbuild targets are additive)

Phase 2: Web Components Polyfills
  → Add @webcomponents/webcomponentsjs
  → Create src/polyfills/index.ts entry point
  → Update rollup.config.mjs input
  → Verify component registers and shadow DOM initializes

Phase 3: Interaction Layer
  → Implement touch-compat.ts adapter
  → Verify tap expand/collapse works via touchstart/touchend
  → Verify tap-on-event works
  → Verify modern browsers unaffected (pointer events still used where available)

Phase 4: CSS / Rendering Audit
  → Load card on target, visual inspection
  → Fix any layout issues found
  → No changes unless issues are discovered
```

This order minimizes wasted effort: there is no point patching touch events if the bundle won't parse, and no point polyfilling custom elements if the JS throws syntax errors before execution starts.

---

## Data Flow: How the Polyfill Architecture Integrates

```
dist/calendar-card-pro.js
│
├─ [top of bundle] @webcomponents/webcomponentsjs polyfill
│   └─ Installs: CustomElements v1, ShadowDOM v1, HTML Template
│   └─ No-op if browser already supports spec
│
├─ Lit 2.x library code (transpiled to ES2015 by esbuild safari12)
│   └─ Uses adoptedStyleSheets if available, falls back to <style>
│
└─ CalendarCardPro component (transpiled to ES2015)
    └─ render() → renderMainCardStructure(customStyles, title, content, handlers)
        └─ handlers built via touch-compat.ts:
            ├─ if window.PointerEvent → pointer event handlers (modern path)
            └─ else → touchstart/touchend/touchcancel handlers (iOS 12 path)
```

---

## Build Pipeline Configuration

**Target rollup.config.mjs changes (illustrative — not production code):**

The `esbuild` plugin call changes from:
```javascript
esbuild({
  tsconfig: 'tsconfig.json',
  target: 'es2017',    // current
  sourceMap: true,
})
```

To:
```javascript
esbuild({
  tsconfig: 'tsconfig.json',
  target: 'safari12',  // or ['es2015', 'safari12'] for explicit floor
  sourceMap: true,
})
```

**`tsconfig.json` — align `lib` declarations:**
The lib array `["ES2017", "DOM", "DOM.Iterable"]` includes type declarations for ES2017 APIs (`Object.entries`, `Object.values`, `String.padStart`, etc.). These are present in Safari 12, so no change is needed to lib. The target change is a transpilation concern, not a type declaration concern. Do not add `ES2015` to lib — it would remove type information for ES2017 methods that Safari 12 actually supports.

**Rollup entry point change (to inject polyfill first):**
```javascript
input: 'src/polyfills/index.ts',  // was: 'src/calendar-card-pro.ts'
```

**No change to output format.** The `format: 'es'` ES module output is correct. Safari 12 supports ES modules.

---

## Testing Strategy: iOS 12 Without a Physical Device

**Option 1: Playwright WebKit (Recommended for CI)**

Playwright bundles its own WebKit engine (the open-source version that Safari is based on). Running `playwright test` with `browserName: 'webkit'` uses a WebKit version that roughly corresponds to Safari 14+ (not Safari 12). This is NOT identical to iOS 12 WebKit.

However, Playwright WebKit is suitable for:
- Verifying Web Components polyfill initialization does not throw
- Verifying basic render path executes (component registers, shadow DOM attaches)
- Verifying touch event handlers fire correctly
- Catching syntax errors introduced by the transpilation change

**Option 2: BrowserStack / Sauce Labs (Device Cloud)**

BrowserStack has real iOS 12 devices available. This is the only way to validate actual Safari 12 behavior including the specific WebKit bugs present in that release. Manual testing against the real device is the acceptance gate for this milestone.

**Option 3: macOS Safari 12 via Virtual Machine or Older Hardware**

Running an older macOS (10.14 Mojave) in a VM gives Safari 12. This is usable but setup is complex and virtualization performance is poor for rendering tests.

**Option 4: `@web/test-runner` with Playwright**

The Web Test Runner (`@web/test-runner`) supports headless WebKit via Playwright and can run component-level tests in an actual browser engine. This is more useful than unit tests for verifying Web Components behavior (shadow DOM, custom element lifecycle) and touch event handling.

**Recommended testing progression:**

```
1. Build audit  — npm run build → inspect dist/ for prohibited syntax
   Tool: node -e "require('fs').readFileSync('dist/calendar-card-pro.js','utf8').match(/\?\./g)"
   Verifies: esbuild actually eliminated optional chaining

2. Playwright WebKit smoke test — component registers, renders, touch events fire
   Tool: Playwright with webkit engine + a minimal HTML harness
   Verifies: Polyfill + transpilation works in WebKit

3. BrowserStack manual session — real iOS 12 device
   Verifies: Actual Safari 12 compatibility
   Gate: Required before declaring milestone done

4. Modern browser regression check — Chrome + Firefox + Safari 16+
   Verifies: Changes did not break existing behavior
   Tool: Same Playwright suite on chromium + firefox engines
```

**Syntax audit script** (useful as a build-time check): After bundling, scan the output file for forbidden syntax patterns. Optional chaining `?.` surviving transpilation is the most common esbuild misconfiguration symptom. This can be a lightweight node script that reads the bundle and asserts absence of those tokens.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Dual Build Artifacts
**What:** Producing `calendar-card-pro.js` (modern) and `calendar-card-pro-ios12.js` (legacy), requiring users to choose.
**Why bad:** HACS distribution model expects one file. Users configure the card by filename. Having two variants creates confusion, documentation burden, and a maintenance fork that diverges over time.
**Instead:** Single bundle, backward-compatible target. The bundle size penalty from polyfills (~15-25KB gzipped for webcomponentsjs) is acceptable.

### Anti-Pattern 2: Adding Babel on Top of esbuild
**What:** Running `@babel/preset-env` as an additional Rollup plugin alongside esbuild.
**Why bad:** Double-transpilation pass; Babel and esbuild each inject their own helper functions (`_asyncToGenerator`, `__awaiter`, etc.) creating duplicate code. Build times increase. Two config surfaces to maintain. Two sets of potential misconfiguration.
**Instead:** esbuild with `target: 'safari12'` handles the syntax transformations needed for this project.

### Anti-Pattern 3: Runtime Script Tag Injection for Polyfills
**What:** Dynamically creating `<script src="webcomponents-loader.js">` from within the component.
**Why bad:** The card's JS execution begins before the injected script loads. The component constructor and `customElements.define()` call run synchronously at module evaluation time — before any dynamically loaded script can execute. The polyfill would arrive too late.
**Instead:** Bundle polyfill statically at the top of the Rollup output.

### Anti-Pattern 4: Removing Pointer Events Entirely
**What:** Replacing all `@pointerdown` bindings with `@touchstart`, making the codebase touch-only.
**Why bad:** Pointer events work on modern browsers with mouse input. Removing them breaks desktop Home Assistant usage. The existing behavior is correct for modern browsers.
**Instead:** Feature-detect at runtime. Use pointer events where available, touch/mouse events as fallback.

### Anti-Pattern 5: Modifying Lit's Internal Rendering Path
**What:** Patching Lit's template processing or directive implementation to work around Safari 12 limitations.
**Why bad:** Lit 2.x already has internal fallback paths for browsers lacking `adoptedStyleSheets` and `CSSStyleSheet` construction. These fallbacks activate automatically. Patching Lit internals creates a maintenance burden that breaks on every Lit update.
**Instead:** Trust Lit's built-in polyfill detection. The only external polyfill needed is Web Components v1 (Custom Elements + Shadow DOM), which Lit does NOT self-polyfill.

---

## Scalability Considerations

This is a compatibility backport, not a scaling concern. The relevant "scalability" question is: will this approach remain maintainable as the main codebase evolves?

| Concern | Impact | Mitigation |
|---------|--------|-----------|
| Future syntax additions (ES2021+) in src/ | Will pass through esbuild's safari12 transpilation correctly — no action needed | esbuild target handles this automatically |
| Lit version bump | Lit 3.x dropped IE11 support but maintained Safari 12 compatibility; polyfill approach remains valid | Check Lit release notes before upgrading |
| Web Components spec additions | New APIs (e.g., `element.attachInternals`) may not be polyfillable | Audit new Lit features against Safari 12 compat before adding |
| Touch adapter complexity | As more interaction features are added, the touch shim may need extension | Keep touch-compat.ts as the single extension point |

---

## Sources

All findings are based on direct codebase analysis and training knowledge. Network research tools were unavailable during this research session.

- **Code analyzed:** `src/calendar-card-pro.ts`, `src/interaction/actions.ts`, `src/interaction/feedback.ts`, `src/rendering/render.ts`, `src/rendering/styles.ts`, `rollup.config.mjs`, `tsconfig.json`, `package.json`
- **Planning docs analyzed:** `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STACK.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/TESTING.md`
- **esbuild target documentation:** https://esbuild.github.io/api/#target (verified by training knowledge: `safari12` is a supported named target value since esbuild 0.6+)
- **Safari Pointer Events support:** caniuse.com — Pointer Events Level 2 shipped in Safari 13.0 (released September 2019); Safari 12 does NOT support Pointer Events
- **Lit 2.x browser requirements:** lit.dev documentation — Lit 2.x requires Web Components v1 polyfill on browsers lacking native support; `adoptedStyleSheets` fallback is built into Lit
- **@webcomponents/webcomponentsjs:** https://github.com/webcomponents/polyfills/tree/master/packages/webcomponentsjs — covers Custom Elements v1, Shadow DOM v1, HTML Template for Safari 10+
- **Confidence note:** All claims about esbuild's `safari12` target behavior, Safari 12 Pointer Events absence, and Lit's adoptedStyleSheets fallback are HIGH confidence from training data. Specific polyfill size estimates are MEDIUM confidence (approximate, should be verified by building with polyfill and measuring).
