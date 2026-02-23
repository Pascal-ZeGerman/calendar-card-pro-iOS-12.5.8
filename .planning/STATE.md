# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** The card loads and responds to taps on an iPad running iOS 12.5.8 — if it doesn't, everything else is moot.
**Current focus:** Phase 1 — Build Pipeline

## Current Position

Phase: 1 of 4 (Build Pipeline)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-02-23 — Completed plan 01-02: Lit 2.8.0 pin and bundle verification script

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: ~2 min
- Total execution time: ~4 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-build-pipeline | 2 | ~4 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~2 min), 01-02 (~2 min)
- Trend: Steady

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-planning]: Core features only — hold actions, weather, and card editor UI are out of scope for iOS 12 compatibility
- [Pre-planning]: Single backward-compatible bundle (not dual artifacts) — HACS expects one file; dual artifacts create user confusion
- [Pre-planning]: Investigate before fixing — root cause was unknown at project start; research has now confirmed the critical issues
- [01-01]: Replace \p{Emoji} with isEmoji() — esbuild cannot transform Unicode property escapes regardless of target; isEmoji() uses explicit Unicode ranges Safari 12 supports
- [01-01]: esbuild target safari12 not es2017 — triggers downleveling of optional chaining, nullish coalescing, private class fields all in one setting
- [01-01]: tsconfig target ES2019 not ES2022 — ES2022 flips useDefineForClassFields to true, breaking Lit @property() decorators
- [Phase 01-build-pipeline]: Lit 2.8.0 pinned at exact version in npm overrides to prevent transitive version drift breaking iOS 12 compatibility
- [Phase 01-build-pipeline]: build:no-verify escape hatch kept as permanent script — essential for troubleshooting build pipeline issues
- [Phase 01-build-pipeline]: Bundle size ceiling MAX_SIZE_KB=9999 placeholder in verify-bundle.sh — enforcement deferred until plan 03 provides first build baseline

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: Lit 3 is installed transitively via @material/web despite PROJECT.md claiming Lit 2.2.0 — pinning to Lit 2.8.0 is the first action in Phase 1
- [Phase 2]: Whether Web Components polyfills are needed cannot be determined without device/BrowserStack testing — establish Safari 12 test environment before Phase 2 begins
- [Phase 2]: Whether `ha-card` custom element registers correctly on the target iOS 12 HA install is untestable without actual device + HA — plan fallback if needed
- [Phase 1]: After build, inspect bundle for `.flatMap(` and `Object.fromEntries(` — esbuild transpiles syntax but does not polyfill missing builtins in bundled deps

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 01-02-PLAN.md — Lit 2.8.0 pin + bundle verification script
Resume file: None
