# Calendar Card Pro — iOS 12.5.8 Compatibility

## What This Is

A lightweight Home Assistant calendar card rebuilt as vanilla JavaScript for Safari 12 / iOS 12.5.8 compatibility. The original card (TypeScript + Lit 2.x, 266KB) failed on iOS 12 due to Lit runtime incompatibilities with WebKit 606. This project replaced it with a single 844-line vanilla JS custom element (24KB, zero dependencies).

## Core Value

The card must render and respond to user taps on an iPad running iOS 12.5.8 — if it doesn't load and display events on that device, everything else is moot.

## Requirements

### Validated

- ✓ Card loads and renders without JS errors on iOS 12.5.8 WebKit — v1.0
- ✓ Events display correctly in default (collapsed) view on iOS 12 — v1.0
- ✓ Tap-anywhere-on-card expand/collapse works on iOS 12 — v1.0
- ✓ Core styling renders acceptably on Safari 12 — v1.0
- ✓ Build pipeline produces an iOS-12-compatible bundle — v1.0 (replaced with no-build vanilla JS)
- ✓ Multi-language date/time formatting via Intl.DateTimeFormat — v1.0

### Active

(None — project complete unless next milestone planned)

### Out of Scope

- Today indicator (dot/pulse/glow) — excluded from lite rebuild, acceptable
- Day/week separators — excluded from lite rebuild, acceptable
- Tap-on-event details — excluded from lite rebuild
- Card editor UI on iOS 12 — YAML-only configuration
- Weather integration on iOS 12 — complex feature, not core
- Hold action on iOS 12 — requires Pointer Events (Safari 13+)
- Full visual parity with modern browsers — minor differences acceptable

## Context

- **Codebase:** 844 lines vanilla JavaScript, ES2015 class syntax, Custom Elements v1 + Shadow DOM v1
- **Tech stack:** Zero dependencies. No build step. Single file: `src-lite/calendar-card-pro.js` copied to `dist/`
- **Deploy:** `docker cp dist/calendar-card-pro.js Home_Assistant:/config/www/community/calendar-card-pro/calendar-card-pro.js`
- **Gotcha:** Must remove stale `.gz` files — HA serves pre-compressed files preferentially

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vanilla JS rewrite over incremental Lit fixes | Lit runtime hit WebKit 606 quirks beyond syntax; fixing would require patching Lit internals | ✓ Good — 24KB vs 266KB, works on device |
| ES2015 class syntax (not ES5 prototype) | Custom Elements v1 requires `class extends HTMLElement`; prototypal inheritance doesn't work | ✓ Good — Safari 12 supports ES2015 classes natively |
| No build step | Single file, no transpilation needed since code is hand-written ES2015 | ✓ Good — simpler deploy, no toolchain dependency |
| Core features only | Today indicator, separators, event details, editor excluded from lite rebuild | ✓ Good — user confirmed acceptable scope reduction |

## Constraints

- **Target:** iOS 12.5.8 Safari (WebKit 606.x, ES2015 baseline)
- **Syntax:** No optional chaining, nullish coalescing, private fields, template literals, arrow functions
- **CSS:** No color-mix(), gap, :focus-visible; use -webkit-flex prefixes

---
*Last updated: 2026-03-29 after v1.0 milestone*
