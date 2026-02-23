# Requirements: Calendar Card Pro — iOS 12.5.8 Compatibility

**Defined:** 2026-02-23
**Core Value:** The card loads and responds to taps on an iPad running iOS 12.5.8 — if it doesn't, everything else is moot.

## v1 Requirements

Requirements for the iOS 12 compatibility milestone.

### Build Pipeline

- [x] **BUILD-01**: Build produces a bundle with no optional chaining (`?.`) or nullish coalescing (`??`) in output (esbuild target: `safari12`)
- [x] **BUILD-02**: Lit version is diagnosed — actual version in bundle confirmed, and private class fields are downleveled or Lit is pinned to a compatible version
- [x] **BUILD-03**: TypeScript compilation target aligned with esbuild target for Safari 12 output
- [x] **BUILD-04**: Build output verified to parse on Safari 12 (no SyntaxError on script load)

### Syntax Fixes

- [x] **SYNTAX-01**: `\p{Emoji}` Unicode property escape regex in `helpers.ts` replaced with a Safari 12-compatible alternative (esbuild cannot transpile this pattern)

### Display

- [ ] **DISP-01**: Card renders calendar events in default (collapsed) view on Safari 12 without JavaScript errors
- [ ] **DISP-02**: Today indicator displays correctly on Safari 12
- [ ] **DISP-03**: Day and week separators display correctly on Safari 12
- [ ] **DISP-04**: Multi-language date and time formatting works correctly on Safari 12 (dayjs locale)

### Interaction

- [ ] **INTER-01**: Tap-anywhere-on-card expand/collapse works on iOS 12 (Touch Event fallback replacing Pointer Events)
- [ ] **INTER-02**: Tap-on-event to show/hide event details works on iOS 12 (Touch Event fallback)

### Styling

- [ ] **STYLE-01**: CSS custom properties (user-configured colors and fonts) apply correctly on Safari 12
- [ ] **STYLE-02**: Core card layout renders without breakage on Safari 12 (no invisible or misplaced elements)
- [ ] **STYLE-03**: `color-mix()` usages in `styles.ts` replaced with `rgba()` / static fallbacks for Safari 12

### Admin

- [ ] **ADMIN-01**: Card editor UI renders and functions on Safari 12 (Lovelace configuration panel)

## v2 Requirements

Deferred to future work. Not in current roadmap.

### Interaction Enhancements

- **INTER-03**: Tap navigation actions work on iOS 12 (navigate to calendar URL or HA view)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Hold action on iOS 12 | Requires Pointer Events (Safari 13+); complex hold timer detection; not a core user need |
| Weather integration on iOS 12 | Complex HA subscription feature; not core to calendar display |
| `ha-ripple` material ripple | Depends on Web Animations API; silently fails gracefully; acceptable |
| Full visual parity | Minor CSS degradations (e.g. scrollbar styling) are acceptable |
| Testing infrastructure | No new test framework added; test coverage is a separate concern |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | Phase 1 | Complete |
| BUILD-02 | Phase 1 | Complete |
| BUILD-03 | Phase 1 | Complete |
| BUILD-04 | Phase 1 | Complete |
| SYNTAX-01 | Phase 1 | Complete |
| DISP-01 | Phase 2 | Pending |
| DISP-02 | Phase 2 | Pending |
| DISP-03 | Phase 2 | Pending |
| DISP-04 | Phase 2 | Pending |
| INTER-01 | Phase 3 | Pending |
| INTER-02 | Phase 3 | Pending |
| STYLE-01 | Phase 4 | Pending |
| STYLE-02 | Phase 4 | Pending |
| STYLE-03 | Phase 4 | Pending |
| ADMIN-01 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 after roadmap creation*
