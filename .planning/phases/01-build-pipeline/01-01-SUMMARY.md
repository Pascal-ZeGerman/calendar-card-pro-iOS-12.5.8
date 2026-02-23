---
phase: 01-build-pipeline
plan: 01
subsystem: infra
tags: [esbuild, rollup, typescript, safari12, ios12, emoji, unicode]

# Dependency graph
requires: []
provides:
  - "helpers.ts getTodayIndicatorType() uses isEmoji() instead of /[\\p{Emoji}]/u - Safari 12 compatible"
  - "rollup.config.mjs esbuild target set to safari12 — downlevels optional chaining, nullish coalescing, private class fields"
  - "tsconfig.json aligned to ES2019 with explicit useDefineForClassFields:false — Lit decorator behavior unambiguous"
affects:
  - "01-build-pipeline/01-03: build verification depends on these config changes producing correct output"
  - "all future plans: TypeScript compilation uses ES2019 lib"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use explicit Unicode range regexes (not \\p{Emoji}) for Safari 12 compatibility"
    - "esbuild target: safari12 for automatic syntax downleveling"
    - "useDefineForClassFields: false with experimentalDecorators: true for Lit 2.x compatibility"

key-files:
  created: []
  modified:
    - "src/utils/helpers.ts"
    - "rollup.config.mjs"
    - "tsconfig.json"

key-decisions:
  - "Replace /[\\p{Emoji}]/u with isEmoji() call — esbuild cannot transform Unicode property escapes regardless of target; isEmoji() uses explicit \\u{XXXX}-\\u{YYYY} ranges that Safari 12 supports"
  - "esbuild target safari12 not es2017 — triggers downleveling of optional chaining (?.), nullish coalescing (??), and private class fields (#field) which are all present in the codebase"
  - "tsconfig target ES2019 not ES2022 — ES2022 would flip useDefineForClassFields to true, breaking Lit @property() decorator mechanism"
  - "useDefineForClassFields: false made explicit — removes implicit dependency on experimentalDecorators+target interaction; intent is clear for future maintainers"

patterns-established:
  - "Safari 12 Unicode regex pattern: use explicit Unicode code point ranges instead of \\p{} property escapes"
  - "Build config convention: esbuild target drives syntax downleveling; tsconfig target documents intent but is not the sole authority"

requirements-completed: [SYNTAX-01, BUILD-01, BUILD-03]

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 1 Plan 01: Source-Level Safari 12 Compatibility Prerequisites Summary

**Three source-level prerequisites for Safari 12 build: emoji regex replaced with explicit Unicode ranges, esbuild target set to safari12, and tsconfig aligned to ES2019 with explicit Lit-safe class field settings**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-23T15:51:03Z
- **Completed:** 2026-02-23T15:52:16Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Eliminated `\p{Emoji}` Unicode property escape from `src/utils/helpers.ts` — esbuild cannot transform this syntax regardless of target setting
- Set esbuild target to `safari12` in `rollup.config.mjs` — enables automatic downleveling of optional chaining, nullish coalescing, and private class fields
- Updated `tsconfig.json` target/lib to ES2019 and added explicit `useDefineForClassFields: false` to make Lit decorator behavior unambiguous

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace \\p{Emoji} regex with isEmoji() call in helpers.ts** - `830a669` (fix)
2. **Task 2: Set esbuild target to safari12 and align tsconfig.json** - `8152283` (chore)

## Files Created/Modified
- `src/utils/helpers.ts` - getTodayIndicatorType() now calls isEmoji(value) instead of constructing a /[\\p{Emoji}]/u regex inline; isEmoji() definition at line 71-74 unchanged
- `rollup.config.mjs` - esbuild plugin target changed from `'es2017'` to `'safari12'`
- `tsconfig.json` - target changed from ES2017 to ES2019; lib updated to [ES2019, DOM, DOM.Iterable]; useDefineForClassFields: false added

## Decisions Made
- **Why isEmoji() instead of a new explicit-range regex inline:** The `isEmoji()` function already exists in helpers.ts with appropriate Unicode ranges; calling it directly avoids code duplication and is more readable. Its `str.length <= 2` constraint is intentional and acceptable for `today_indicator` use.
- **Why safari12 specifically:** esbuild's safari target triggers all necessary syntax transforms at once (optional chaining, nullish coalescing, private class fields, logical assignment operators) without requiring enumeration of individual ECMAScript features.
- **Why ES2019 for tsconfig (not ES2017 or ES2022):** ES2019 is close to what esbuild outputs for safari12 target. ES2022 is explicitly excluded because it would flip `useDefineForClassFields` to true (TypeScript default behavior), which breaks Lit 2.x `@property()` decorators.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- `npx tsc --noEmit` could not be verified because `node_modules/` is not installed in this repository snapshot. This is expected — the plan explicitly states "No build is run yet — that happens in plan 03." The TypeScript changes are syntactically valid (ES2019 is a valid target value, all fields set correctly). Full type-check verification will occur in plan 03 after `npm install`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All three source-level Safari 12 prerequisites are in place
- Plan 02 (Lit pinning and dependency changes) can proceed without dependency on these changes
- Plan 03 (build execution and bundle verification) depends on these changes being present — they are now committed

---
*Phase: 01-build-pipeline*
*Completed: 2026-02-23*

## Self-Check: PASSED

- FOUND: src/utils/helpers.ts
- FOUND: rollup.config.mjs
- FOUND: tsconfig.json
- FOUND commit 830a669 (Task 1)
- FOUND commit 8152283 (Task 2)
- Verification: grep -c "p{Emoji}" helpers.ts = 0 (clean)
- Verification: grep "safari12" rollup.config.mjs = target: 'safari12'
- Verification: grep "ES2019" tsconfig.json = 2 lines (target and lib)
