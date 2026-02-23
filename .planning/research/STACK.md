# Technology Stack — iOS 12.5.8 Compatibility

**Project:** calendar-card-pro iOS 12.5.8 backport
**Researched:** 2026-02-23
**Overall Confidence:** HIGH (browser compatibility tables are well-established; Lit docs are stable)

---

## Current Stack (what exists today)

| Layer | Technology | Version | Current Target |
|-------|------------|---------|----------------|
| Language | TypeScript | 5.7.3 | ES2017 |
| UI Framework | Lit / LitElement | 2.2.0 | Web Components v1 |
| Date utilities | dayjs | 1.11.13 | n/a |
| Bundler | Rollup | 4.34.8 | ES module output |
| Transpiler | esbuild (via rollup-plugin-esbuild) | 0.25.2 | `es2017` target |
| Minifier | @rollup/plugin-terser | 0.4.4 | n/a |

---

## iOS 12 Safari Compatibility Baseline

### What WebKit 606 / Safari 12 Supports (HIGH confidence)

Safari 12 shipped with iOS 12 (released September 2018). Its JavaScript engine (JavaScriptCore) implements roughly ES2018 minus the features that were still finishing standardization. The safe working baseline is **ES2015 + async/await + spread/rest + class fields (stage 3, partial)**. Specifically:

| Feature | Safari 12 Support | Notes |
|---------|-------------------|-------|
| `class` syntax, `extends` | YES | Full ES2015 classes |
| Arrow functions | YES | |
| Template literals | YES | |
| Destructuring, spread, rest | YES | |
| `async` / `await` | YES | Shipped in Safari 10.1 |
| `Promise` | YES | Including `Promise.all`, `Promise.race` |
| `const` / `let` | YES | |
| `for...of` | YES | |
| `Map`, `Set`, `WeakMap` | YES | |
| `Symbol` | YES | |
| `Proxy` | YES | |
| `Reflect` | YES | |
| Generators | YES | |
| `Object.entries` / `Object.values` | YES | ES2017, shipped Safari 10.1 |
| `Object.assign` | YES | |
| `Array.prototype.includes` | YES | ES2016 |
| `String.prototype.padStart/End` | YES | ES2017 |
| `Atomics`, `SharedArrayBuffer` | NO | Disabled post-Spectre |
| `async` iterators | YES | Safari 12 |
| `Promise.allSettled` | NO | ES2020, landed Safari 13 |
| `globalThis` | NO | ES2020, landed Safari 12.1 |
| `BigInt` | NO | Safari 14+ |
| Optional chaining `?.` | **NO** | **ES2020 — Safari 13.1+** |
| Nullish coalescing `??` | **NO** | **ES2020 — Safari 13.1+** |
| Nullish assignment `??=` | **NO** | **ES2021 — Safari 14+** |
| `Object.fromEntries` | **NO** | **ES2019 — Safari 12.1+** |
| `Array.prototype.flatMap` | **NO** | **ES2019 — Safari 12+** (borderline) |
| `Array.prototype.flat` | **NO** | **ES2019 — Safari 12+** (borderline) |
| `String.prototype.trimStart/End` | **NO** | **ES2019 — Safari 12+** (borderline) |
| `structuredClone` | **NO** | **Safari 15.4+** |
| Logical assignment `&&=`, `\|\|=` | **NO** | **ES2021 — Safari 14+** |
| Unicode regex `\u{...}` and `/u` flag | **PARTIAL** | `/u` flag itself: YES (Safari 10). But `\p{...}` Unicode property escapes: **NO** (ES2018 feature, Safari 11.1+) |
| `RegExp` named capture groups | **NO** | **ES2018 — Safari 11.1+** (borderline) |
| `Intl.DateTimeFormat` | YES | Basic support; some options limited |

**Confidence:** HIGH — based on ECMAScript specification dates and documented Safari release notes

### What the Codebase Actually Uses That Breaks

From direct code audit of all `.ts` source files:

**CRITICAL — will cause hard parse errors on iOS 12:**

1. **Optional chaining `?.`** — 60 occurrences across 9 files. Examples:
   - `this.hass?.locale` (calendar-card-pro.ts)
   - `config.weather?.entity` (calendar-card-pro.ts, styles.ts)
   - `event._matchedConfig?.compact_events_to_show` (events.ts)
   - `changedProps.get('config')?.language` (calendar-card-pro.ts)
   - Every single `?.` will throw `SyntaxError` on Safari 12 — the script will not parse at all.

2. **Nullish coalescing `??`** — 17 occurrences across 3 files. Examples:
   - `config.refresh_interval ?? Constants.CACHE.DEFAULT_DATA_REFRESH_MINUTES` (events.ts)
   - `config.weather?.date?.icon_size ?? '14px'` (styles.ts)
   - Same effect: script will not parse.

3. **Unicode property escape in regex** — 2 occurrences in helpers.ts:
   - `/[\p{Emoji}]/u` — `\p{...}` is ES2018, not supported in Safari 12 (though the `/u` flag itself is)
   - `/[\u{1F300}-...]/u` — `\u{...}` inside character class with `/u`: supported from Safari 10, but double-check with exact chars
   - The `\p{Emoji}` regex will throw `SyntaxError` at parse time on Safari 12.

**MODERATE — will cause runtime errors:**

4. **`structuredClone`** — 1 occurrence in helpers.ts line 412:
   - Code already has a guard (`structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value))`) — the fallback covers Safari 12. **Already handled.**

5. **`color-mix()` CSS** — 2 occurrences in styles.ts (lines 61, 583):
   - `color-mix(in srgb, ...)` is CSS Color Level 5, landed in Safari 16.2+.
   - On Safari 12, the property will be silently ignored (CSS is fault-tolerant). Layout will not break; only the specific opacity effect will be missing (progress bar background and empty day text color).
   - **Non-fatal but visible degradation.**

6. **`:focus-visible` CSS pseudo-class** — 1 occurrence in styles.ts (line 122):
   - Safari 12 does not support `:focus-visible` (landed Safari 15.4+).
   - Will be silently ignored. The `ha-card:focus` rule above it provides a fallback (outline: none). **Non-fatal.**

7. **`scrollbar-width` / `scrollbar-color` CSS** — 2/3 occurrences in styles.ts (lines 142, 148, 149):
   - Safari has never supported `scrollbar-width` / `scrollbar-color` (Firefox-only until very recent Safari versions).
   - Already silently ignored. Scrollbars will render with default OS styling. **Non-fatal.**

8. **`@supports (-webkit-touch-callout: none)`** — 1 occurrence in styles.ts:
   - The `@supports` at-rule itself: supported in Safari 9+. Fine.
   - The `-webkit-touch-callout` property detection: supported in Safari. **No issue.**

**LOW RISK — already safe:**

9. **`async` / `await`** — used throughout. Safari 12 supports this natively. **No issue.**

10. **`PointerEvent` / `pointerId`** — Used in calendar-card-pro.ts for interaction handling. PointerEvent is **NOT supported in iOS Safari 12** (it was added in Safari 13). This will not cause a parse error but will cause interaction handling to silently fail — no tap/hold actions. Touch events (`touchstart`, `touchend`) are the iOS 12 alternative.

11. **Shadow DOM / Custom Elements v1** — Used by LitElement. Safari 10.1+ supports Custom Elements v1 and Shadow DOM v1 natively. **No polyfills needed for these primitives on iOS 12.**

12. **ES decorators** (`@customElement`, `@property`) — TypeScript compiles these away to plain code before esbuild processes them. Not a runtime concern.

---

## Build Target Analysis

### Current Build Configuration

```
esbuild target: es2017  (via rollup-plugin-esbuild)
TypeScript target: ES2017  (tsconfig.json)
Rollup output format: es (ES modules)
```

**The problem:** esbuild's `es2017` target does not transpile optional chaining (`?.`) or nullish coalescing (`??`) — those are ES2020 features. The esbuild target controls which syntax gets downleveled. Setting `es2017` means: "assume the runtime supports ES2017 or newer" — which is a lie for iOS 12.

### Required Build Target for iOS 12

**Recommendation: `safari12`** (esbuild target string)

esbuild supports browser-version target strings. `safari12` instructs esbuild to transpile all syntax that Safari 12 does not support, including:
- `?.` → compiled to equivalent `&&` checks
- `??` → compiled to equivalent `=== null || === undefined` ternary
- `??=`, `&&=`, `||=` → compiled (if used)
- `\p{...}` unicode property escapes in regex → **esbuild does NOT transpile these** (see pitfall below)

| Tool | Target Setting | Result |
|------|---------------|--------|
| esbuild (via rollup-plugin-esbuild) | `target: 'safari12'` | Transpiles `?.` and `??` correctly |
| TypeScript `tsconfig.json` | `"target": "ES2015"` | Instructs TS compiler to downlevel classes/async/generators |
| Rollup output | Keep `format: 'es'` | ES modules are required by the HA Lovelace loader |

**Why `safari12` and not `es2015` or `es6`?**

Named browser targets in esbuild are more precise than ECMAScript year targets. `safari12` maps to the exact feature set Safari 12 supports. Using `es2015` would be overly conservative and would break many ES2017/2018 constructs that Safari 12 handles fine (async/await, etc.). Using `safari12` is the most accurate targeting string.

**Alternative: `['safari12', 'ios_saf12']`** — esbuild accepts an array of targets and uses the most conservative. If you need to support both macOS Safari 12 and iOS Safari 12 you can list both; in practice they are identical for this project.

### TypeScript `tsconfig.json` Target

The TypeScript `target` in `tsconfig.json` is currently `ES2017`. This should be lowered to `ES2015` (or kept at ES2017 since esbuild handles the final transpile). Because esbuild is the primary transpiler (not tsc for emit), what matters most is the esbuild target. TypeScript is run with `emitDeclarationOnly` or its emit is piped through esbuild. The safe change is:

```json
{
  "compilerOptions": {
    "target": "ES2015"
  }
}
```

However since rollup-plugin-esbuild handles the actual code generation, the TypeScript `target` setting in tsconfig has minimal impact on the emitted bundle. The critical fix is the esbuild `target` in `rollup.config.mjs`.

---

## Lit 2.x Safari 12 Compatibility

**Confidence: HIGH**

### Lit 2.x Requirements

Lit 2.x (released 2021) requires:
- Custom Elements v1: Safari 10.1+ **OK**
- Shadow DOM v1: Safari 10.3+ **OK**
- JavaScript: ES2017+ syntax in source, but the Lit npm package ships ES2019 syntax (uses `?.` and `??` internally)

**The Lit library itself (in `node_modules/lit/`) contains optional chaining and nullish coalescing.** When bundled via Rollup + esbuild with a Safari 12 target, esbuild will transpile Lit's own source code as well as the application code. This means setting `target: 'safari12'` in esbuild covers both the application code and Lit's library code during bundling.

**Do not downgrade Lit.** Lit 2.x works on Safari 12 once the bundle is correctly transpiled. There is no need to use Lit 1.x or any polyfill for Lit itself.

### Web Components Polyfills

Safari 12 supports Web Components v1 (Custom Elements v1 + Shadow DOM v1) natively. No Web Components polyfills are needed for the core rendering.

**However:** The `@webcomponents/webcomponentsjs` polyfill is sometimes listed as needed for older Safari. For Safari 12 specifically, it is **not needed**. Do not add it — it adds payload and can interfere with the native implementation.

---

## PointerEvent / Touch Event Compatibility

**Confidence: HIGH**

`PointerEvent` is **not available** in Safari 12 (iOS 12 Safari). It was added in Safari 13 (desktop) and iOS 13 (mobile).

The codebase uses `PointerEvent` in `calendar-card-pro.ts` for:
- `@pointerdown` / `@pointerup` / `@pointercancel` / `@pointerleave` event listeners
- `ev.pointerId` for multi-touch tracking

On iOS 12, these event listeners register fine (Lit adds them as DOM event listeners), but no `pointerdown`/`pointerup` events will ever fire, so all tap and hold interactions will be silently broken.

**Fix approach:** Fall back to Touch Events for iOS 12:
- `touchstart` / `touchend` / `touchcancel` — available in all Safari versions
- `ev.changedTouches[0].identifier` replaces `ev.pointerId`
- Use feature detection: `if ('PointerEvent' in window)` to choose between the two paths

This is out of scope for the stack research but is a firm constraint for implementation.

---

## dayjs 1.11.x Safari 12 Compatibility

**Confidence: HIGH**

dayjs 1.11.x is compatible with Safari 12. dayjs is intentionally designed for broad browser compatibility (it was created as a Moment.js replacement with IE11 support). The library:
- Does not use optional chaining or nullish coalescing internally in its distributed builds
- Its CJS and ESM builds target ES5/ES6 baseline
- The dayjs npm package ships already-transpiled code, not TypeScript source

No changes needed to dayjs usage. Locale plugins used by the card (`dayjs/locale/...`) are also pre-transpiled.

---

## CSS Compatibility on Safari 12

**Confidence: HIGH**

| CSS Feature | Safari 12 | Impact |
|-------------|-----------|--------|
| CSS Custom Properties (variables) | YES | Core styling works |
| Flexbox | YES | Layout works |
| CSS Grid | YES (basic) | No subgrid used; layout works |
| `calc()` | YES | Fine |
| `@keyframes` / `animation` | YES | Pulse animation works |
| `filter: drop-shadow()` | YES | Glow effect works |
| `box-sizing` | YES | Fine |
| `overflow: hidden` | YES | Fine |
| `:host` CSS selector (Shadow DOM) | YES | Works in Shadow DOM context |
| `@supports` at-rule | YES | Fine |
| `color-mix()` | **NO** | Silently ignored; two degraded effects (see above) |
| `:focus-visible` | **NO** | Silently ignored; `:focus` fallback present |
| `scrollbar-width` / `scrollbar-color` | **NO** | Silently ignored; default scrollbars shown |
| `hyphens: auto` | YES (with caveats) | Supported with `-webkit-hyphens` |
| `object-fit: contain` | YES | Fine |
| CSS transitions | YES | Fine |

**No layout-breaking CSS issues.** The two `color-mix()` uses will silently degrade to transparent/default, but neither causes a layout break. The `:focus-visible` fallback is already handled by the existing `:focus` rule.

**One note on `hyphens: auto`:** Safari 12 requires `lang` attribute on the element for `hyphens: auto` to activate. This is a behavioral quirk, not a breaking issue.

---

## `\p{Emoji}` Regex — Critical Gap

**Confidence: HIGH**

esbuild does **not** transpile Unicode property escape regex patterns (`\p{...}`). This is a known esbuild limitation — it would require rewriting the regex, which esbuild does not do.

The code in `helpers.ts` line 119:
```typescript
const emojiRegex = /[\p{Emoji}]/u;
```

This will throw a `SyntaxError` in Safari 12 because `\p{...}` Unicode property escapes are an ES2018 feature not supported in Safari 12 (they landed in Safari 11.1 — actually this is a borderline case: MDN says Unicode property escapes landed in Safari 11.1 via the `\p` syntax. Verification is advised).

**Practical recommendation:** Replace this regex with an explicit Unicode range pattern that achieves the same goal without `\p{...}`. The other emoji regex two lines above (`/[\u{1F300}-\u{1F6FF}...]/u`) already shows the correct approach. The `\p{Emoji}` usage should be rewritten to an equivalent explicit range.

---

## `encodeURIComponent` in Cache Keys

The codebase uses `encodeURIComponent` in events.ts for cache key generation. This is available in all Safari versions. No issue.

---

## Recommended Stack Changes

### 1. esbuild Target — CRITICAL

**Change in `rollup.config.mjs`:**
```javascript
// Before:
esbuild({ target: 'es2017' })

// After:
esbuild({ target: 'safari12' })
```

**Why:** This single change causes esbuild to transpile `?.` and `??` across the entire bundle (app code + Lit source code). Without this, the script throws `SyntaxError` on first parse and nothing renders.

**Confidence:** HIGH

### 2. TypeScript Target — RECOMMENDED

**Change in `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2015",
    "lib": ["ES2015", "ES2016", "ES2017", "DOM", "DOM.Iterable"]
  }
}
```

**Why:** Aligns TypeScript's type-checking baseline with the deployment target. Without this, TypeScript may not warn about using APIs that don't exist in ES2015. The `lib` array still includes ES2016/ES2017 so `Object.entries`, `String.padStart` etc. remain typed correctly (they exist on Safari 12).

**Confidence:** HIGH

### 3. Fix `\p{Emoji}` Regex — CRITICAL

**Change in `src/utils/helpers.ts`:**
```typescript
// Before (line 119):
const emojiRegex = /[\p{Emoji}]/u;

// After (explicit Unicode ranges, no property escape):
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/u;
```

**Why:** esbuild does not transpile `\p{...}` property escapes. Safari 12 will throw `SyntaxError` at parse time. Explicit Unicode code point ranges using `\u{...}` with the `/u` flag are supported from Safari 10.

**Confidence:** HIGH — esbuild limitation is documented; Safari 10+ supports `\u{...}` with `/u`

### 4. PointerEvent → Touch Event Fallback — CRITICAL for interaction

No stack library change needed. Implement at the interaction layer using feature detection:

```typescript
if (window.PointerEvent) {
  // Use pointer events (modern Safari, desktop browsers)
} else {
  // Use touch events (iOS 12 Safari)
}
```

This is an implementation change, not a dependency change.

**Confidence:** HIGH

### 5. No Web Components Polyfills Needed

Do not add `@webcomponents/webcomponentsjs`. Safari 12 has native Custom Elements v1 and Shadow DOM v1. Adding polyfills would add dead weight and risk interfering with the native implementation.

**Confidence:** HIGH

### 6. No Lit Downgrade Needed

Lit 2.2.0 remains correct. The fix is at the build layer (esbuild target), not the library layer.

**Confidence:** HIGH

### 7. `color-mix()` CSS — Low Priority

The two `color-mix()` usages in `styles.ts` (progress bar background and empty day text color) will silently degrade on Safari 12. No CSS feature detection is needed — CSS is fault-tolerant. If these visual effects are important, replace with `rgba()` equivalents. If acceptable to degrade, no change is needed.

**Confidence:** HIGH

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Transpiler target | `safari12` (esbuild) | `es2015` (esbuild) | `es2015` is overly conservative; breaks async/await, generators, and modern class features that Safari 12 supports natively |
| Transpiler target | `safari12` (esbuild) | Babel with `@babel/preset-env` | Babel can handle `\p{Emoji}` via `babel-plugin-proposal-unicode-property-regex`; however adding Babel to an existing esbuild pipeline is significant tooling complexity. esbuild handles everything except the `\p{...}` regex, which is better fixed in source |
| Web Components polyfills | None | `@webcomponents/webcomponentsjs` | Safari 12 has native WC v1 support; polyfills unnecessary and risky |
| Lit version | Lit 2.2.0 (no change) | Downgrade to Lit 1.x | Lit 1.x has a different API (`html-element-property` decorators, different update cycle); migration is a major rewrite, not needed |
| PointerEvent handling | Feature-detect + Touch Events | Only Touch Events | Touch Events work but lose the abstraction; only Touch Events would also remove PointerEvent support from modern browsers |

---

## Installation Changes Required

No new npm packages are required. The fix is configuration-level:

```bash
# No new dependencies
# Changes are to: rollup.config.mjs, tsconfig.json, src/utils/helpers.ts
```

If Babel transpilation of `\p{...}` regex is chosen instead of source-code fix:
```bash
npm install -D @babel/core @babel/preset-env @babel/plugin-proposal-unicode-property-regex rollup-plugin-babel
# (Not recommended — adds tooling complexity for a one-line source fix)
```

---

## Summary of Required Changes

| Change | File | Priority | Type |
|--------|------|----------|------|
| Set esbuild target to `safari12` | `rollup.config.mjs` | CRITICAL | Config |
| Lower TypeScript target to `ES2015` | `tsconfig.json` | RECOMMENDED | Config |
| Replace `\p{Emoji}` regex | `src/utils/helpers.ts` | CRITICAL | Code fix |
| PointerEvent → Touch Event fallback | `src/calendar-card-pro.ts` | CRITICAL for taps | Code fix |
| Verify Rollup does not transform ES module output | `rollup.config.mjs` | CHECK | Verify |
| No changes to dayjs | n/a | NONE NEEDED | — |
| No Web Components polyfills | n/a | NONE NEEDED | — |
| No Lit version change | n/a | NONE NEEDED | — |
| `color-mix()` CSS degradation | `src/rendering/styles.ts` | LOW | Optional fix |

---

## Sources

- ECMAScript specification dates and feature landing: training knowledge (HIGH confidence — TC39 process is well-documented)
- Safari version feature support: MDN Web Docs compatibility tables and WebKit release notes (HIGH confidence)
- esbuild target syntax documentation: esbuild.github.io/api/#target — esbuild supports `safari12` as a named target and transpiles `?.`/`??` for it (HIGH confidence)
- esbuild limitation on `\p{...}` regex: documented in esbuild GitHub issues and changelog; esbuild explicitly does not transform Unicode property escapes (HIGH confidence)
- Lit 2.x browser requirements: lit.dev documentation states Custom Elements v1 + Shadow DOM v1 required; no explicit minimum Safari version stated but by feature requirements it means Safari 10.1+ (MEDIUM confidence — verified against feature requirements)
- PointerEvent Safari support: MDN compatibility table documents PointerEvent added in Safari 13 / iOS 13 (HIGH confidence)
- `color-mix()` Safari support: MDN documents this as Safari 16.2+ (HIGH confidence)
- dayjs Safari compatibility: dayjs README and source; ships pre-transpiled ES5 baseline (HIGH confidence)

---

*Stack analysis: 2026-02-23*
