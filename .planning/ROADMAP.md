# Roadmap: Calendar Card Pro — iOS 12.5.8 Compatibility

## Overview

This is a targeted compatibility backport of an existing, production-quality Home Assistant calendar card to run on iOS 12.5.8 Safari (WebKit 606.x). No new features are added. The work proceeds in four strictly-ordered phases, each of which must succeed before the next is testable: first the build pipeline must produce a bundle that Safari 12 can parse; then Web Components must register and render; then tap interactions must work; finally CSS visual issues are resolved. Modern browser behavior must remain unchanged throughout.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Build Pipeline** - Produce a Safari 12-parseable bundle with correct esbuild target, pinned Lit version, and syntax fixes
- [ ] **Phase 2: Component Rendering** - Verify Web Component registers and calendar events display on Safari 12
- [ ] **Phase 3: Touch Interactions** - Replace Pointer Events with Touch Event fallback so taps work on iOS 12
- [ ] **Phase 4: CSS and Visual Polish** - Fix color-mix(), add webkit prefixes, and resolve remaining visual degradation

## Phase Details

### Phase 1: Build Pipeline
**Goal**: The build produces a bundle that Safari 12 can parse without a SyntaxError, with Lit correctly versioned and all syntax incompatibilities eliminated at compile time
**Depends on**: Nothing (first phase)
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04, SYNTAX-01
**Success Criteria** (what must be TRUE):
  1. The built bundle contains no optional chaining (`?.`) or nullish coalescing (`??`) operators (verified by grepping output)
  2. The built bundle contains no private class fields (`#field`) from Lit 3 (verified by grepping output)
  3. The built bundle contains no `\p{Emoji}` Unicode property escape regex (verified by grepping output)
  4. Built `dist/calendar-card-pro.js` is committed and pushed to the remote GitHub repo
  5. User has installed the card in HA from the remote repo (see HA Installation Steps below)
  6. Loading the card on the iOS 12 device produces no SyntaxError in the Safari console (Settings > Safari > Advanced > Web Inspector or HA frontend logs)
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Source + build config changes (SYNTAX-01: emoji regex fix, BUILD-01: esbuild safari12, BUILD-03: tsconfig ES2019)
- [ ] 01-02-PLAN.md — Dependency pin + verify script (BUILD-02: Lit 2.8.0 overrides, BUILD-04: verify-bundle.sh)
- [ ] 01-03-PLAN.md — Execute build, verify output, push to GitHub, checkpoint iOS 12 device test (BUILD-04: device confirmation)

**HA Installation Steps (Phase 1 test):**
1. On your HA device or via SSH/terminal: navigate to `/config/www/` (create if missing: `mkdir -p /config/www`)
2. Download the built file directly from GitHub:
   ```bash
   wget https://raw.githubusercontent.com/<your-user>/<repo>/main/dist/calendar-card-pro.js \
     -O /config/www/calendar-card-pro-ios.js
   ```
   Or copy `dist/calendar-card-pro.js` manually via Samba share / HA File Editor
3. In HA → Settings → Dashboards → (three dots) → Resources → Add Resource:
   - URL: `/local/calendar-card-pro-ios.js`
   - Resource type: JavaScript Module
4. Hard-refresh the dashboard (Cmd+Shift+R / Ctrl+Shift+R) or clear cache
5. Add the card to a dashboard using type `custom:calendar-card-pro`
6. Open Safari on the iOS 12 iPad and navigate to the dashboard
7. Check for errors: on a Mac connected to the same network, use Safari → Develop → [device name] → inspect the HA page

### Phase 2: Component Rendering
**Goal**: The calendar card Web Component registers in Safari 12, shadow DOM attaches, and calendar events display correctly in the default collapsed view
**Depends on**: Phase 1
**Requirements**: DISP-01, DISP-02, DISP-03, DISP-04
**Success Criteria** (what must be TRUE):
  1. Built artifact pushed to remote repo and installed in HA (same process as Phase 1)
  2. On iOS 12 device: the card element appears on the HA dashboard with no blank or missing content
  3. Calendar events are listed in the default (collapsed) view with correct dates, times, and titles
  4. The today indicator and day/week separators display in their expected positions
  5. Event dates and times render in the correct locale language
**Plans**: TBD

### Phase 3: Touch Interactions
**Goal**: Tapping anywhere on the card expands or collapses it, and tapping an event shows or hides its details, on iOS 12 — using Touch Events in place of the missing Pointer Events API
**Depends on**: Phase 2
**Requirements**: INTER-01, INTER-02
**Success Criteria** (what must be TRUE):
  1. Built artifact pushed to remote repo and installed in HA (same process as Phase 1)
  2. Tapping anywhere on the collapsed card on the iOS 12 device expands it to show all events
  3. Tapping the expanded card collapses it back to the default view
  4. Tapping an individual event row shows its detail information; tapping again hides it
  5. All tap interactions continue to work correctly on a modern browser (no regression)
**Plans**: TBD

### Phase 4: CSS and Visual Polish
**Goal**: CSS incompatibilities are resolved so the card renders without layout breakage, user-configured colors apply correctly, and color-mix() degradation is replaced with static fallbacks
**Depends on**: Phase 3
**Requirements**: STYLE-01, STYLE-02, STYLE-03, ADMIN-01
**Success Criteria** (what must be TRUE):
  1. Built artifact pushed to remote repo and installed in HA (same process as Phase 1)
  2. User-configured CSS custom property colors and fonts apply correctly on the iOS 12 device
  3. The card layout has no invisible, misplaced, or overlapping elements on the iOS 12 device
  4. Progress bar background and empty-day text render with correct colors (not transparent) on iOS 12
  5. The Lovelace card editor panel renders and accepts configuration changes on iOS 12
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Build Pipeline | 0/3 | Not started | - |
| 2. Component Rendering | 0/? | Not started | - |
| 3. Touch Interactions | 0/? | Not started | - |
| 4. CSS and Visual Polish | 0/? | Not started | - |
