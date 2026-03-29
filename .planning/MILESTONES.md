# Milestones

## v1.0 — iOS 12.5.8 Compatibility

**Shipped:** 2026-03-29
**Phases:** 1 | **Plans:** 3 | **Commits:** 10

### Delivered

Vanilla JS rewrite of Calendar Card Pro for Safari 12 / iOS 12.5.8 compatibility. Replaced 266KB Lit bundle with 24KB hand-written custom element (844 lines, zero dependencies).

### Key Accomplishments

1. Rebuilt card as single vanilla JS file using only Safari 12-native APIs
2. Verified rendering and tap-to-expand on iOS 12.5.8 device
3. Addressed all critical PR review issues (multi-day events, error logging, input validation)
4. Eliminated all framework dependencies (Lit, dayjs, Material Web)

### Known Gaps

- DISP-02: Today indicator not implemented (accepted scope reduction)
- DISP-03: Day/week separators not implemented (accepted scope reduction)
- INTER-02: Tap-on-event details not implemented (accepted scope reduction)
- ADMIN-01: Card editor UI not implemented (YAML-only)

### Archive

- [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- [milestones/v1.0-REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)
