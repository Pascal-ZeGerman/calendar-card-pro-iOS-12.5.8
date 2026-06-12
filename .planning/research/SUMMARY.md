# Project Research Summary

**Project:** calendar-card-pro iOS 12.5.8 Compatibility Backport
**Domain:** Web Component backward compatibility (Lit / Safari 12 / WebKit 606.x)
**Researched:** 2026-02-23
**Confidence:** HIGH

## Executive Summary

This project is a targeted compatibility backport of an existing, production-quality Home Assistant Lovelace card (calendar-card-pro) to run on iOS 12.5.8 Safari (WebKit 606.x). The work is entirely additive: no new product features are built, no external APIs need research, and no new dependencies are added beyond a Web Components polyfill. The challenge is purely one of browser compatibility — the current build pipeline outputs ES2017 JavaScript that uses ES2020 syntax (`?.`, `??`), and the interaction layer relies on the Pointer Events API, neither of which exists on Safari 12.

The recommended approach is a single backward-compatible bundle (not a split artifact) produced by changing two config values and three source locations. The most critical fix is lowering the esbuild target from `es2017` to `safari12` in `rollup.config.mjs` — this single change causes esbuild to transpile optional chaining and nullish coalescing across both application code and the bundled Lit library. The second critical fix is replacing all Pointer Event listeners (`@pointerdown`, `@pointerup`, etc.) with a Touch Event fallback adapter, since Safari 12 does not support Pointer Events at all and the card will be completely non-interactive without it. A third critical source fix is replacing the `\p{Emoji}` Unicode property escape regex in `helpers.ts`, which esbuild cannot transpile and will cause a parse error on Safari 12.

The key risk is a version mismatch: PROJECT.md claims Lit 2.2.0 but `package-lock.json` shows Lit 3.2.1 is actually installed (pulled in transitively by `@material/web`). Lit 3 uses private class fields (`#field`) which may survive esbuild transpilation at the wrong target level and cause silent parse failures on Safari 12. This must be diagnosed first — before any other work. The recommended mitigation is to pin `"lit": "2.8.0"` explicitly in `package.json`. The need for Web Components polyfills should be verified by testing, but ARCHITECTURE research notes that Lit 2.x has built-in graceful fallbacks for `adoptedStyleSheets` absence, and Safari 12 has native Custom Elements v1 and Shadow DOM v1, so polyfills may be lighter-weight than expected.

## Key Findings

### Recommended Stack

The existing stack requires no new runtime dependencies for the core backport. The entire fix is at the build configuration layer. esbuild 0.25.2 (already in use) supports the `safari12` named target string, which is the most precise mechanism available — it avoids over-transpiling ES2017 constructs that Safari 12 actually supports (like `async/await`), while correctly downleveling the ES2020 syntax that breaks it. Dayjs 1.11.x is fully compatible with Safari 12 with no changes. The only potential new dependency is `@webcomponents/webcomponentsjs` if polyfills are needed after testing reveals gaps in Web Component initialization on the target device.

**Core technologies:**
- **esbuild (target: 'safari12'):** Primary transpiler — handles `?.`, `??`, class fields, logical assignment in one pass across app code and Lit source
- **TypeScript (target: ES2015):** Aligns type-checking baseline with deployment target; secondary to esbuild in actual emit
- **Lit 2.x (pin to 2.8.0):** Must be explicitly pinned; Lit 3 (currently installed via transitive dep) uses private class fields incompatible with Safari 12 unless target is set correctly
- **dayjs 1.11.x:** No changes needed; pre-transpiled ES5 baseline, fully compatible
- **@webcomponents/webcomponentsjs (conditional):** Covers Custom Elements v1, Shadow DOM v1, HTML Template; no-op on browsers with native support; bundle at build time via new `src/polyfills/index.ts` entry point if needed

**Critical version constraint:** Lit must be 2.x. Lit 3 uses private class fields by design; downleveling them requires esbuild target `es2022` which would require polyfilling everything else.

### Expected Features

The feature scope is tightly defined: get the card to load, display events, and respond to taps on iOS 12. Everything else is explicitly deferred or out of scope.

**Must have (table stakes):**
- Card loads without JS parse errors — resolves the esbuild target / Lit version issues
- Events display in the default (collapsed) view — the core rendering pipeline is broadly compatible once JS parses
- Tap-to-expand/collapse card — requires Touch Event fallback (Pointer Events not supported on iOS 12)
- Tap-on-event to show/hide event details — same root cause as expand/collapse
- Core styling renders without layout breakage — table-based layout is compatible; minor CSS degradation acceptable

**Should have (differentiators, expected to work with minimal effort):**
- Multi-language / locale support — dayjs locale files work; low complexity
- CSS custom property styling — natively supported in Safari 9.1+; no changes needed
- Tap actions (more-info, navigate, URL) — works once Touch Event fix is in place
- Today indicator — compatible; depends on `ha-icon` being registered by HA frontend
- Week/month separators — already has iOS-specific `@supports` handling in place

**Defer (explicitly out of scope for this backport):**
- Hold action (long-press) — uses `ev.pointerId`, complex gesture, PROJECT.md explicitly excludes it
- Weather integration — complex WebSocket subscription, explicitly excluded in PROJECT.md
- Card editor UI — admin tool, 2149-line editor.ts, explicitly excluded in PROJECT.md
- `ha-ripple` visual feedback — Pointer Event-based, hover unreliable on touch screens

**Accept as degraded (not blocking):**
- Progress bar background: `color-mix()` silently fails; unfilled track transparent
- Empty day text opacity: `color-mix()` silently fails; may lose 60% opacity effect
- Scrollbars: `scrollbar-width`/`scrollbar-color` ignored; iOS hides scrollbars natively anyway
- Word hyphenation: `hyphens: auto` needs `-webkit-` prefix; words won't hyphenate

### Architecture Approach

The architecture decision is to produce a single backward-compatible bundle rather than two separate build artifacts. HACS expects a single file; dual artifacts create user confusion and a maintenance fork. The build decomposes cleanly into four independent fix surfaces that have a strict dependency order — each layer must work before the next is meaningful to test. A new `src/interaction/touch-compat.ts` module handles Pointer/Touch event adapter logic, keeping the abstraction boundary clean: the existing `handlers` object passed to `renderMainCardStructure` remains unchanged; only its construction becomes conditional on `window.PointerEvent` availability.

**Major components:**
1. **Build pipeline (`rollup.config.mjs`, `tsconfig.json`)** — esbuild target change is the single highest-leverage fix; must be completed first; validates by grepping bundle output for `?.`
2. **Polyfill layer (`src/polyfills/index.ts`, new entry point)** — prepends `@webcomponents/webcomponentsjs` at bundle top; no-op on modern browsers; needed if Web Component initialization gaps are found in testing
3. **Touch adapter (`src/interaction/touch-compat.ts`, new module)** — feature-detects `window.PointerEvent` at init; returns either pointer handlers or touch/mouse handlers; keeps `render.ts` unchanged
4. **CSS / rendering layer (`src/rendering/styles.ts`)** — lowest risk; address `color-mix()`, add `-webkit-hyphens`, add `::-webkit-scrollbar` hiding; no layout-breaking issues present

**Data flow:** `dist/calendar-card-pro.js` → [polyfill block] → [Lit, transpiled to ES2015] → [CalendarCardPro component] → `handlers` built via `touch-compat.ts` (pointer path or touch path by feature detection) → `renderMainCardStructure`

### Critical Pitfalls

1. **Lit 3 is installed, not Lit 2 (CRITICAL)** — `package-lock.json` shows Lit 3.2.1 via `@material/web` transitive dep; Lit 3 private class fields may survive transpilation. Fix first: pin `"lit": "2.8.0"` in `package.json`; audit with `grep -c '#[a-zA-Z]' dist/calendar-card-pro.js === 0`.

2. **esbuild target `es2017` does not downlevel `?.` / `??` (CRITICAL)** — 60+ optional chaining and 17+ nullish coalescing instances in source; all cause `SyntaxError` on Safari 12 before any code runs. Fix: change `rollup.config.mjs` to `target: 'safari12'`; verify with `grep -c '\?\.' dist/calendar-card-pro.js`.

3. **Pointer Events API absent on iOS 12 (CRITICAL for interactions)** — `@pointerdown`/`@pointerup`/`@pointercancel`/`@pointerleave` never fire on Safari 12; card renders but is completely non-interactive. Fix: implement `touch-compat.ts` with `touchstart`/`touchend`/`touchcancel` fallback guarded by `window.PointerEvent` detection.

4. **`\p{Emoji}` regex not transpilable by esbuild (CRITICAL)** — esbuild explicitly does not transform Unicode property escapes; `SyntaxError` at parse time on Safari 12. Fix: replace with explicit Unicode range character class (`/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}...]/u`).

5. **Desktop emulation gives false confidence (MINOR but process-critical)** — Chrome mobile emulation sends Pointer Events (from touch simulation); iOS 12 Safari does not. A card that passes Chrome emulation will still be broken on the actual device. Gate: require BrowserStack or actual iOS 12.5.8 hardware for acceptance.

## Implications for Roadmap

Based on research, the work clusters into four phases with hard sequential dependencies. Each phase must be verified before the next is meaningful.

### Phase 1: Build Pipeline and Lit Version Audit

**Rationale:** Everything else is untestable until the bundle parses on Safari 12. This is the necessary foundation. Two of the four Critical pitfalls live here (CRITICAL-1, CRITICAL-2, CRITICAL-4 regex). No user-facing behavior changes on modern browsers.

**Delivers:** A bundle that Safari 12 can parse without a SyntaxError; modern browser behavior unchanged.

**Addresses:** Card loads without JS errors (Table Stakes Feature 1)

**Implements:** Build pipeline component; no new source modules

**Specific changes:**
- Audit actual Lit version in `package-lock.json`; pin `"lit": "2.8.0"` if Lit 3 is present
- Change `rollup.config.mjs`: `esbuild({ target: 'safari12' })`
- Lower `tsconfig.json` `target` to `ES2015`
- Replace `\p{Emoji}` regex in `src/utils/helpers.ts` with explicit Unicode range
- Post-build syntax audit: grep bundle for `?.`, `??`, `#field` — all must be absent

**Avoids:** CRITICAL-1 (Lit 3 private fields), CRITICAL-2 (optional chaining parse error), CRITICAL-4 regex (Unicode property escape parse error)

**Research flag:** No deeper research needed — esbuild `safari12` target is well-documented; this is pure configuration execution.

---

### Phase 2: Web Components Polyfill Verification

**Rationale:** Once the bundle parses, the next question is whether the Web Component registers and shadow DOM initializes correctly. Safari 12 has native Custom Elements v1 and Shadow DOM v1, but Lit's constructable stylesheets path and Custom Element registry timing have known edge cases. This phase may require minimal work (Lit 2.x has built-in fallbacks) or moderate work (if polyfill injection is needed).

**Delivers:** Component registers, `connectedCallback` fires, shadow DOM attaches, styles render.

**Addresses:** Events display in default view (Table Stakes Feature 2), Core styling renders acceptably (Table Stakes Feature 5)

**Implements:** Polyfill layer (potentially `src/polyfills/index.ts` entry point + `rollup.config.mjs` input change)

**Specific changes:**
- Test: does `connectedCallback` fire on Safari 12 after Phase 1? If yes, no polyfill needed.
- If registration fails: add `@webcomponents/webcomponentsjs`; create `src/polyfills/index.ts`; update Rollup `input`
- Do NOT add polyfills preemptively — STACK.md confirms Safari 12 has native WC v1 support; polyfills may be unnecessary

**Avoids:** CRITICAL-4 (Web Components initialization gaps), Anti-Pattern 3 (runtime script injection — bundle statically instead)

**Research flag:** MEDIUM uncertainty. STACK.md is HIGH confidence that native WC v1 works, but PITFALLS.md flags `adoptedStyleSheets` and Custom Element registry timing as risks with MEDIUM confidence. Test first, add polyfills only if needed.

---

### Phase 3: Touch Event Interaction Layer

**Rationale:** After the card renders, it must respond to taps. This is the core user-facing requirement. Pointer Events are absent on iOS 12; without this phase the card is a static display only. This is CRITICAL-3 and the most architecturally interesting change.

**Delivers:** Tap-to-expand/collapse works on iOS 12; tap-on-event shows details; tap actions (more-info, navigate, URL) fire correctly; modern browsers continue using pointer events unchanged.

**Addresses:** Tap-to-expand/collapse (Table Stakes Feature 3), Tap-on-event for details (Table Stakes Feature 4), Tap actions (Differentiator Feature 8)

**Implements:** Touch adapter module (`src/interaction/touch-compat.ts`); modified handler construction in `calendar-card-pro.ts`

**Specific changes:**
- Create `src/interaction/touch-compat.ts`: detects `window.PointerEvent`; returns pointer handlers or touch handlers
- Map: `pointerdown` → `touchstart`, `pointerup` → `touchend`, `pointercancel` → `touchcancel`, `pointerleave` → `touchcancel` + out-of-bounds detection
- Use `ev.changedTouches[0].identifier` in place of `ev.pointerId`
- Add `touch-action: manipulation` to interactive elements (eliminates iOS 300ms tap delay)
- Ensure `cursor: pointer` is set on interactive elements (required for `@click` on non-interactive elements in iOS Safari)
- Hold action: explicitly disable / treat as `none` on iOS 12 path (PROJECT.md out-of-scope)

**Avoids:** CRITICAL-3 (Pointer Events absence), Anti-Pattern 4 (removing pointer events entirely — must keep both paths)

**Research flag:** No deeper research needed — Touch Event API is well-documented; the adapter pattern is established. Implementation is straightforward but detail-sensitive (all four event types must be mapped, not just two).

---

### Phase 4: CSS Audit and Visual Polishing

**Rationale:** After JS and interactions work, remaining issues are visual only. None cause layout breakage; all are silent CSS degradation. This phase is lowest risk and lowest urgency — it can be skipped if visual degradation is acceptable.

**Delivers:** Accurate `color-mix()` fallbacks; correct scrollbar hiding; proper text hyphenation; `calc()` edge case fixes.

**Addresses:** Core styling renders acceptably (Table Stakes Feature 5), Progress bar (Differentiator Feature 11)

**Implements:** CSS / rendering layer changes in `src/rendering/styles.ts`

**Specific changes:**
- Replace `color-mix(in srgb, var(...) 20%, transparent)` with `rgba()` equivalent in progress bar background
- Replace `color-mix(in srgb, var(--primary-text-color) 60%, transparent)` in empty day color with `rgba()` fallback (in `generateCustomPropertiesObject`)
- Add `-webkit-hyphens: auto` alongside `hyphens: auto`
- Add `-webkit-overflow-scrolling: touch` to `.content-container` for momentum scrolling on iOS
- Add `::-webkit-scrollbar { display: none }` if scrollbar hiding is desired
- Test `calc()` with CSS custom properties in `padding` shorthands (MINOR-3); break into longhand properties if zero-height issues appear
- Verify `:focus-visible` degradation is acceptable (focus ring absent on iOS 12) — low priority

**Avoids:** MODERATE-1 (`color-mix()` visual regression), MINOR-3 (`calc()` + var in shorthand)

**Research flag:** No deeper research needed — all CSS compatibility data is HIGH confidence from MDN/caniuse.

---

### Phase Ordering Rationale

- Phases must run in order 1 → 2 → 3 → 4 because each unblocks the next testable layer
- Phase 1 is fully mechanical — no device needed, verifiable by bundle inspection
- Phase 2 requires a Safari 12 environment for the first time; establish BrowserStack/device access before Phase 2
- Phase 3 is the highest engineering complexity and the core user-facing deliverable
- Phase 4 is optional polish; ship without it if schedule pressure exists
- Hold action, weather, and editor UI are explicitly NOT phases — they are out of scope for this milestone

### Research Flags

Phases with high confidence (skip research-phase during planning):
- **Phase 1:** Build pipeline changes are fully specified; esbuild `safari12` target is documented; pure execution
- **Phase 3:** Touch Event adapter pattern is established; event mappings are documented; direct implementation
- **Phase 4:** CSS compatibility data is authoritative; all fixes are mechanical substitutions

Phases with moderate uncertainty (consider targeted research or testing spike during planning):
- **Phase 2:** Whether polyfills are actually needed is not deterministic without device testing. Recommend a short investigation spike (test Phase 1 output on Safari 12 / BrowserStack) before designing polyfill architecture. If the component registers cleanly, Phase 2 is a no-op.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Browser compatibility tables are authoritative; esbuild named target behavior is documented; Lit version issue is confirmed by direct `package-lock.json` inspection |
| Features | HIGH | Feature scoping is based on direct code audit + iOS 12 capability matrix; out-of-scope decisions are already encoded in PROJECT.md |
| Architecture | HIGH | Single-bundle approach is well-reasoned; touch adapter pattern is established; polyfill injection order is a known pattern |
| Pitfalls | HIGH | Critical pitfalls are all confirmed by direct source inspection (optional chaining occurrences counted, Lit version confirmed, Pointer Event usage confirmed); not inference |

**Overall confidence:** HIGH

### Gaps to Address

- **Actual Lit version impact:** Whether esbuild `target: 'safari12'` sufficiently downlevels Lit 3 private fields needs to be verified by running the build and inspecting output — research identified the risk but cannot resolve it without executing the build. Resolve in Phase 1 immediately.

- **Web Components polyfill necessity:** Whether `@webcomponents/webcomponentsjs` is actually needed on iOS 12 with Lit 2.x cannot be determined without device testing. ARCHITECTURE research has MEDIUM confidence on this point. Resolve via BrowserStack test at start of Phase 2.

- **`ha-card` availability on iOS 12:** Whether Home Assistant's own `ha-card` custom element registers correctly on the target iOS 12 HA version is untestable without the actual device + HA installation. This is a dependency outside the card's control. PITFALLS.md flags this as MODERATE-6. If `ha-card` fails to register, a fallback `<div class="ha-card">` render path would be needed — plan for this contingency.

- **`Array.flatMap()` / `Object.fromEntries()` in bundled dependencies:** FEATURES.md flags these as potential iOS 12 issues in bundled dependencies (not in app source). esbuild with `safari12` target will transpile syntax but not polyfill missing builtins. If Lit or another bundled dependency calls these at runtime, they will throw. Resolve by inspecting the built bundle for `.flatMap(` and `Object.fromEntries(` call sites after Phase 1 build.

## Sources

### Primary (HIGH confidence)
- Direct source code audit — `src/calendar-card-pro.ts`, `src/rendering/styles.ts`, `src/utils/helpers.ts`, `src/interaction/actions.ts`, `src/interaction/feedback.ts`, `rollup.config.mjs`, `tsconfig.json`, `package-lock.json`
- Direct planning doc audit — `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`
- esbuild documentation — `safari12` named target, `\p{...}` regex transformation limitation
- MDN Web Docs — Safari version feature compatibility tables
- caniuse.com — Pointer Events (Safari 13+), `color-mix()` (Safari 16.2+), `:focus-visible` (Safari 15.4+), `structuredClone` (Safari 15.4+)

### Secondary (MEDIUM confidence)
- Lit 2.x documentation — `adoptedStyleSheets` fallback behavior; graceful degradation on non-supporting browsers
- `@webcomponents/webcomponentsjs` README — coverage of Custom Elements v1, Shadow DOM v1, HTML Template

### Tertiary (LOW confidence / needs device validation)
- Specific `customElements.whenDefined()` race condition on Safari 12 — documented in PITFALLS.md as training knowledge; needs validation on actual device
- `ha-card` availability on iOS 12 Home Assistant frontend — not resolvable without actual HA + iOS 12 environment

---
*Research completed: 2026-02-23*
*Ready for roadmap: yes*
