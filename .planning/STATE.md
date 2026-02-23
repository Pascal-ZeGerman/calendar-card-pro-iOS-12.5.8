# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-22)

**Core value:** The card loads and responds to taps on an iPad running iOS 12.5.8 — if it doesn't, everything else is moot.
**Current focus:** Phase 1 — Build Pipeline

## Current Position

Phase: 1 of 4 (Build Pipeline)
Plan: 3 of 3 in current phase (in progress — awaiting checkpoint)
Status: Paused at checkpoint:human-verify (Task 2 of 2 in plan 01-03)
Last activity: 2026-02-23 — Task 1 complete: Safari 12 bundle built, verified, committed, pushed

Progress: [███░░░░░░░] 30%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: ~2 min
- Total execution time: ~9 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-build-pipeline | 2 complete + 1 in progress | ~9 min | ~3 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~2 min), 01-02 (~2 min), 01-03 in progress (~5 min so far)
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
- [01-03]: verify-bundle.sh private class fields regex updated to .#field pattern — original `(?<!["\x27\`])#[a-zA-Z_$]` produced false positives on CSS hex colors (#f44336, #ff9800) and URL anchors (#static-expressions) in minified bundle
- [01-03]: Bundle size ceiling MAX_SIZE_KB calibrated to 312 (260KB actual + 20% headroom)

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: Whether Web Components polyfills are needed cannot be determined without device/BrowserStack testing — establish Safari 12 test environment before Phase 2 begins
- [Phase 2]: Whether `ha-card` custom element registers correctly on the target iOS 12 HA install is untestable without actual device + HA — plan fallback if needed
- [Phase 1 resolved]: After build, inspect bundle for `.flatMap(` and `Object.fromEntries(` — RESULT: both count 0 in the built bundle, no Phase 2 polyfill action needed
- [Phase 1 checkpoint]: Device test needed — user must confirm iOS 12.5.8 Safari loads the card without SyntaxError

## Session Continuity

Last session: 2026-02-23
Stopped at: Plan 01-03 Task 1 complete — paused at checkpoint:human-verify (Task 2: iOS 12 device test)
Resume file: None
Resume point: After user provides "approved" or "issue: [description]", run continuation agent for plan 01-03 to finalize SUMMARY.md and close out phase 1
