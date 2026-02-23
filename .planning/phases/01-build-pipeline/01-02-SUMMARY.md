---
phase: 01-build-pipeline
plan: 02
subsystem: infra
tags: [lit, npm-overrides, rollup, esbuild, safari12, build-pipeline, shell]

# Dependency graph
requires: []
provides:
  - "Lit 2.8.0 pinned in package.json dependencies with exact version (no ^ prefix)"
  - "npm overrides block forcing all four Lit sub-packages to 2.x-compatible exact versions"
  - "build script chains bash scripts/verify-bundle.sh after rollup (hard-fail on incompatible syntax)"
  - "build:no-verify escape hatch script for bypassing verification when needed"
  - "scripts/verify-bundle.sh checking for ?. ?? #field \\p{ patterns in dist/calendar-card-pro.js"
affects:
  - "01-build-pipeline plan 03 (npm install + build execution)"
  - "All future iOS 12 compatibility work — verification is now automated"

# Tech tracking
tech-stack:
  added: ["lit@2.8.0 (exact)", "lit-element@3.3.3 (override)", "lit-html@2.8.0 (override)", "@lit/reactive-element@1.6.3 (override)"]
  patterns:
    - "npm overrides block for pinning transitive dependency versions"
    - "Post-build shell script verification chained into npm run build"
    - "Escape hatch script (build:no-verify) for bypassing CI checks when troubleshooting"

key-files:
  created: ["scripts/verify-bundle.sh"]
  modified: ["package.json"]

key-decisions:
  - "Lit 2.8.0 pinned at exact version (no ^ prefix) — this is a compatibility fork, not a tracking dependency"
  - "All four Lit sub-packages pinned in npm overrides: lit@2.8.0, lit-element@3.3.3, lit-html@2.8.0, @lit/reactive-element@1.6.3"
  - "bundle size ceiling MAX_SIZE_KB=9999 placeholder — enforcement deferred until first successful build provides baseline"
  - "build:no-verify kept as permanent escape hatch — never remove"

patterns-established:
  - "Post-build verification pattern: bash script chained after bundler via && operator"
  - "Hard-fail on incompatible syntax: grep-based pattern matching, FAIL flag accumulation, single exit at end"

requirements-completed: [BUILD-02, BUILD-04]

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 1 Plan 02: Lit Pin and Bundle Verification Summary

**Lit 2.8.0 pinned via npm overrides in package.json and scripts/verify-bundle.sh created to hard-fail on Safari 12-incompatible syntax patterns (?. ?? #field \p{) in the built bundle**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-23T15:51:06Z
- **Completed:** 2026-02-23T15:52:31Z
- **Tasks:** 2
- **Files modified:** 2 (package.json modified, scripts/verify-bundle.sh created)

## Accomplishments

- Added `"lit": "2.8.0"` to package.json dependencies with exact version — eliminates the transitive Lit 3 pull from @material/web
- Added npm overrides block pinning all four Lit sub-packages to 2.x-compatible exact versions: lit@2.8.0, lit-element@3.3.3, lit-html@2.8.0, @lit/reactive-element@1.6.3
- Updated build script to chain `bash scripts/verify-bundle.sh` after rollup — automated hard-fail on incompatible syntax
- Added `build:no-verify` escape hatch for bypassing verification when troubleshooting
- Created `scripts/verify-bundle.sh` with checks for all four forbidden Safari 12-incompatible patterns
- Script handles missing bundle gracefully (exits 0 with skip message for dev builds)
- Bundle size check included with MAX_SIZE_KB=9999 placeholder (not enforced until first build provides baseline)

## Task Commits

Each task was committed atomically:

1. **Task 1: Pin Lit 2.8.0 in package.json and add build:no-verify script** - `a1010e0` (chore)
2. **Task 2: Create scripts/verify-bundle.sh post-build verification script** - `66b0e47` (chore)

## Files Created/Modified

- `package.json` - Added lit@2.8.0 to dependencies, added overrides block with all four Lit sub-packages, updated build script to chain verify-bundle.sh, added build:no-verify escape hatch
- `scripts/verify-bundle.sh` - Post-build verification script checking for ?. ?? #field \p{ patterns; reports bundle size; hard-fails on any match; skips gracefully if bundle absent

## Decisions Made

- Exact versions used in overrides (no ^ prefix) because this is a compatibility constraint, not a tracking dependency. Transitive version drift would silently break iOS 12 compatibility.
- `build:no-verify` escape hatch added as permanent fixture — it allows troubleshooting build pipeline issues without failing on syntax checks; removing it would make debugging significantly harder
- Bundle size ceiling set to MAX_SIZE_KB=9999 (placeholder): enforcement is deferred until plan 03 completes the first successful build and provides a real baseline; setting a ceiling before knowing the actual size would cause false failures
- All four Lit sub-package versions are the latest in their respective ranges as of the research phase: these are the correct companion versions for lit@2.8.0

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. npm install will be run in plan 03.

## Next Phase Readiness

- Plan 02 is complete; plan 01 (rollup/esbuild config) was executed in parallel
- Plan 03 can now run: `npm install` will resolve the overrides and pull Lit 2.8.0 for all sub-packages
- After plan 03's first successful build, update `MAX_SIZE_KB` in scripts/verify-bundle.sh to `actual_size_kb * 1.2` (rounded up)
- BUILD-02 (dependency pinning) and BUILD-04 (automated verification) are complete

---
*Phase: 01-build-pipeline*
*Completed: 2026-02-23*
