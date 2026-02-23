# Codebase Concerns

**Analysis Date:** 2026-02-22

## Tech Debt

**Large Monolithic Files (Editor and Render):**
- Issue: `src/rendering/editor.ts` (2149 lines) and `src/utils/events.ts` (1503 lines) are significantly larger than most other modules and handle multiple responsibilities
- Files: `src/rendering/editor.ts`, `src/utils/events.ts`, `src/rendering/render.ts` (1060 lines)
- Impact: Difficult to maintain, test, and debug; harder to locate specific functionality; increased cognitive load for modifications
- Fix approach: Break down editor into separate concern modules (e.g., entity config UI, styling UI, advanced settings). Extract event grouping logic from events.ts into dedicated functions. Split render.ts into day rendering, event rendering, and separator rendering modules.

**Loose Type Safety with `any` and `unknown`:**
- Issue: 79 instances of `any` or `unknown` types throughout codebase, particularly in logger.ts and helpers.ts for handling ambiguous error/context data
- Files: `src/utils/logger.ts` (lines 118-120, 270, 282), `src/utils/helpers.ts` (lines 378-380), `src/utils/events.ts` (1407, 1429)
- Impact: Type safety gaps reduce IDE support and make runtime errors more likely; callers don't have clear contracts
- Fix approach: Create specific union types for error handling (Error | string | unknown), create validated context types with proper narrowing, use type guards rather than loose typing

**Deprecated Parameter Handling in Editor:**
- Issue: `DEPRECATED_CONFIG_MAP` and `DEPRECATED_ENTITY_CONFIG_MAP` (lines 34-42 in editor.ts) handle legacy config parameters but upgrade logic may not catch all migration paths
- Files: `src/rendering/editor.ts` (lines 34-42, 200-250)
- Impact: Users with old configurations might see unexpected behavior; maintenance burden for version compatibility
- Fix approach: Add comprehensive config migration tests, add version-aware upgrade path with explicit user communication, consider hard version bump requiring manual config reset if migration is too complex

## Known Bugs

**RegEx Pattern Validation No Boundaries:**
- Issue: Allowlist/blocklist regex patterns in event filtering don't validate pattern syntax before applying
- Files: `src/utils/events.ts` (lines 836-852)
- Trigger: User enters invalid regex like `[unclosed` in entity allowlist/blocklist config
- Workaround: Log warning is shown but exception is caught silently; events may not filter as expected
- Current mitigation: try/catch prevents crash but user won't know pattern is broken
- Fix approach: Add regex validation utility, test pattern before storing config, display validation error in UI

**Event Date Parsing Edge Cases:**
- Issue: Multiple different date parsing methods for all-day events (parseAllDayDate in format.ts vs manual date string handling in events.ts)
- Files: `src/utils/events.ts` (lines 81, 286), `src/utils/format.ts` (line 115)
- Trigger: All-day events spanning months or years; different calendar systems
- Current workaround: Fallback logic in place but inconsistent
- Fix approach: Centralize all date parsing in a single utility with comprehensive test coverage for boundary cases

**Visibility Change Refresh Race Condition:**
- Issue: When document becomes visible after being hidden, refresh checks if elapsed time exceeds threshold but doesn't account for ongoing API requests
- Files: `src/calendar-card-pro.ts` (lines 242-251)
- Trigger: User returns to page with card while an updateEvents() call is already in progress
- Symptoms: Multiple API requests triggered simultaneously, potential duplicate data loading
- Workaround: None; can occur silently
- Fix approach: Add pending request tracking, prevent overlapping updates, use abort controller for in-flight requests

## Security Considerations

**localStorage Data Exposure:**
- Risk: Event data including summaries, descriptions, locations, and times stored in localStorage without encryption; accessible by any script on same domain
- Files: `src/utils/events.ts` (lines 1313-1327)
- Current mitigation: Browser sandboxing, but Home Assistant addons share domain
- Recommendations: Evaluate if detailed event data needs persistent storage; consider server-side caching only; add data minimization (cache only hashes, refresh on load)

**User Input in Regex Patterns:**
- Risk: Allowlist/blocklist patterns taken directly from config without sanitization; complex regex can cause ReDoS (Regular Expression Denial of Service)
- Files: `src/utils/events.ts` (lines 836, 847)
- Recommendations: Add regex complexity limits, timeout regex execution, document safe patterns, validate before saving to config

**Editor Dynamic Custom Element Loading:**
- Risk: Editor attempts to load `ha-entity-picker` custom element dynamically from Home Assistant; if element is compromised or missing, fallback behavior may be unsafe
- Files: `src/rendering/editor.ts` (lines 76-93)
- Current mitigation: try/catch silently logs warnings
- Recommendations: Validate element is loaded before using; provide explicit user feedback if picker unavailable; don't silently degrade

## Performance Bottlenecks

**Event Grouping and Sorting in Large Event Sets:**
- Problem: `groupEventsByDay()` creates nested loops for event filtering, sorting, and deduplication when handling hundreds of events across multiple calendars
- Files: `src/utils/events.ts` (lines 200-400, especially 268-309)
- Cause: Multiple passes over event array (filtering, sorting, deduplication), entity config lookups done per-event, redundant date string calculations
- Symptom: 59 array iterations/transformations in events.ts alone
- Improvement path: Cache entity config lookups in Map, calculate date strings once, use indexed deduplication with Set of signatures, consider memoization for repeated config lookups

**Repeated Entity Config Lookups:**
- Problem: Entity config is looked up multiple times per event via `config.entities.find()` - inefficient for large entity lists
- Files: `src/utils/events.ts` (lines 294, 340-344, 911-920, 947-952, 990-993, 1023-1026)
- Cause: Linear search through entities array happens in getEntityColor, getEntityLabel, getEntitySetting, and within grouping logic
- Improvement path: Build Map<entityId, EntityConfig> once at component initialization, pass through call chain to avoid repeated lookups

**DOM Rendering with Literal Repeat Lists:**
- Problem: `repeat` directive in render.ts doesn't use stable keys for some collections; Lit may re-render entire lists on minor changes
- Files: `src/rendering/render.ts` (heavy use of repeat directive)
- Cause: Events sorted frequently, day sorting can cause re-renders of entire weeks
- Improvement path: Add stable key identifiers to repeat directives (date key + event ID), avoid re-sorting on every render, consider virtual scrolling for large views

**localStorage Serialization for Large Datasets:**
- Problem: Entire event array JSON.stringified to localStorage on every cache operation; no compression or partial updates
- Files: `src/utils/events.ts` (lines 1313-1327)
- Cause: Full serialization/deserialization happens for every cache operation
- Scale limit: Likely breaks with >500 events or on slow devices
- Improvement path: Implement incremental cache updates, gzip compression, or consider IndexedDB for large datasets

**Weather Forecast Subscriptions Overhead:**
- Problem: Weather forecast subscriptions created per-card instance; multiple cards means multiple subscriptions to same data
- Files: `src/calendar-card-pro.ts` (lines 276-308), `src/utils/weather.ts` (entire module)
- Cause: No deduplication or shared subscription mechanism
- Improvement path: Implement global weather subscription cache, use observer pattern for multiple cards, unsubscribe cleanup may not be complete

## Fragile Areas

**Complex Event Time Calculation Logic:**
- Files: `src/utils/events.ts` (lines 765-815), `src/utils/format.ts` (lines 100-200)
- Why fragile: Multiple time representations (dateTime vs date), timezone handling, multi-day event splitting logic with many edge cases
- Safe modification: Add comprehensive unit tests for each time format, use date library methods rather than manual calculations, test DST boundaries
- Test coverage: Some logic paths unclear without integration testing; consider edge case tests for Feb 28/29, year boundaries, timezone changes

**Event Filtering and Deduplication Pipeline:**
- Files: `src/utils/events.ts` (lines 300-450 in groupEventsByDay, lines 821-857 in filterEventsForEntity)
- Why fragile: Multiple filtering stages (allowlist/blocklist → dedup → compact limit → day limit), order of operations critical
- Safe modification: Add explicit test cases for each filter stage in isolation, document filter order requirements, consider creating Filter class to encapsulate logic
- Test coverage: No visible integration tests for filter combinations (e.g., allowlist + dedup + compact limit)

**Config Merging and Normalization:**
- Files: `src/config/config.ts` (lines 120-200), `src/calendar-card-pro.ts` (lines 429-469)
- Why fragile: DEFAULT_CONFIG merged with user config multiple times, entity normalization happens separately, potential for config inconsistency
- Safe modification: Document exact merge order, add config validation schema, create immutable config builder pattern
- Test coverage: Config changes tested indirectly through component tests; no isolated config normalization tests

**Pointer/Hold Detection State Machine:**
- Files: `src/calendar-card-pro.ts` (lines 107-110, 325-407)
- Why fragile: Multiple pointer events (down, up, cancel, leave) manage shared mutable state (_activePointerId, _holdTriggered, _holdTimer, _holdIndicator)
- Safe modification: Add explicit state transition tests, consider using proper state machine library, test with rapid pointer events and cancellations
- Test coverage: No visible tests; particularly risky for touch interactions on mobile

## Scaling Limits

**Calendar Entities Count:**
- Current capacity: ~10-20 entities tested; likely degrades beyond this
- Limit: Entity config lookups are O(n) per event; with 100 events and 50 entities = 5000 lookups
- Scaling path: Implement entity index Map, profile performance with large entity lists, consider lazy loading entity configs

**Events Per Day:**
- Current capacity: Compact view shows ~3-5 events per day before visual overflow
- Limit: With 100+ events per day, DOM rendering and sorting becomes problematic
- Scaling path: Implement virtual scrolling for expanded view, pagination, consider event aggregation/grouping strategies

**localStorage Size Limitations:**
- Current capacity: Typical localStorage 5-10MB limit; event caching could hit this
- Limit: JSON serialization of 500+ events could exceed quota
- Scaling path: Implement cache size management, evict old entries, migrate to IndexedDB for larger datasets

**Weather Forecast Subscriptions:**
- Current capacity: ~2-5 simultaneous subscriptions; likely exceeds Home Assistant pub/sub limits with many cards
- Limit: Each card instance subscribes independently
- Scaling path: Implement global weather subscription registry, share subscriptions across cards

## Dependencies at Risk

**dayjs Library Version Pinned:**
- Risk: Currently locked at `1.11.13`; may have security vulnerabilities or compatibility issues with newer Home Assistant versions
- Files: `package.json` (line 56), used throughout `src/translations/dayjs.ts`
- Impact: Timezone handling, date parsing could have issues in newer HA versions
- Migration plan: Evaluate upgrading to dayjs 1.11.14+ with compatibility testing; consider native Date/Intl APIs as fallback

**@material/web Version Tracking:**
- Risk: Material Design web components API may change; currently `^2.2.0` but Material is relatively new and unstable
- Files: Not heavily used; imported in editor.ts but mostly using ha- elements
- Migration plan: Monitor Material releases, consider switching to native Home Assistant ha- elements for better stability

**Lit Framework Version Compatibility:**
- Risk: Lit used as transitive dependency via LitElement; major version changes could break component lifecycle
- Files: All .ts files use Lit/LitElement; version pulled from @material/web and direct usage unclear
- Migration plan: Pin Lit version explicitly in package.json, test with new versions before upgrading dependencies

## Missing Critical Features

**No Error Boundary or Graceful Degradation:**
- Problem: If event API fails or config is invalid, entire card shows error state instead of partial rendering
- Blocks: Resilient multi-calendar UI; can't show some calendars while others load
- Impact: Poor UX when one calendar entity is unavailable or misconfigured
- Fix approach: Implement per-entity error handling, render available events while handling unavailable entities separately

**No Offline Support:**
- Problem: Card requires active API connection; cached data expires and card shows error state
- Blocks: Mobile/PWA use cases where network is intermittent
- Impact: Calendar becomes unusable on mobile without internet
- Fix approach: Extend cache TTL for offline scenarios, implement sync-on-reconnect pattern

**No Accessibility Support for Complex Interactions:**
- Problem: Hold/pointer detection for actions not keyboard accessible; no ARIA labels for semantic meaning
- Blocks: Screen reader users, keyboard-only users
- Impact: Not WCAG compliant
- Fix approach: Add keyboard event handlers for hold equivalent, add ARIA attributes for card structure

## Test Coverage Gaps

**Event Time Calculation and Date Boundary Cases:**
- What's not tested: All-day events spanning year/month boundaries, DST transitions, leap year handling, timezone edge cases
- Files: `src/utils/events.ts` (lines 200-250), `src/utils/format.ts` (lines 100-200)
- Risk: Visual bugs in specific date ranges; could go unnoticed for months
- Priority: High - affects core functionality

**Regex Pattern Validation and Filter Edge Cases:**
- What's not tested: Invalid regex patterns, filter combinations (allowlist + dedup), empty event sets with filters
- Files: `src/utils/events.ts` (lines 821-857)
- Risk: Silent failures in filtering; events disappear without user understanding why
- Priority: High - affects data visibility

**Weather Integration and Subscription Management:**
- What's not tested: Multiple card instances, subscription cleanup, weather entity unavailable scenarios, forecast data validation
- Files: `src/utils/weather.ts`, `src/calendar-card-pro.ts` (lines 276-308)
- Risk: Memory leaks, duplicate subscriptions, stale data rendering
- Priority: Medium - currently optional feature

**Config Upgrade and Deprecated Parameter Handling:**
- What's not tested: All migration paths from old to new config format, config validation, invalid entity configurations
- Files: `src/rendering/editor.ts` (lines 34-42), `src/config/config.ts` (lines 120-200)
- Risk: Users with old configs see unexpected behavior; config corruption on upgrade
- Priority: Medium - affects version transitions

**Pointer Event Interactions and Hold Detection:**
- What's not tested: Rapid pointer events, cancel/leave during hold, multi-touch scenarios, mobile browser quirks
- Files: `src/calendar-card-pro.ts` (lines 325-407)
- Risk: Broken interactions on mobile, tap/hold actions fail unpredictably
- Priority: Medium - core user interaction

---

*Concerns audit: 2026-02-22*
