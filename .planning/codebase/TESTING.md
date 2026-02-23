# Testing Patterns

**Analysis Date:** 2026-02-22

## Test Framework

**Status:** Not detected

This project does **not currently have** any test framework configured. No test runner (Jest, Vitest, etc.), assertion library, or test files are present in the codebase.

**Available commands:**
```bash
npm run lint              # Run ESLint with fixes
npm run format            # Run Prettier formatting
npm run build             # Build for production
npm run dev               # Run dev build with watch
```

No dedicated test commands exist (`npm run test`, etc.).

## Test File Organization

**Current State:** Not applicable - no tests present

**Recommendation for future implementation:**
- Unit tests should use co-located pattern: `src/utils/__tests__/logger.test.ts` alongside `src/utils/logger.ts`
- Test files naming convention: `*.test.ts` (not `.spec.ts`)
- Integration tests could use separate `tests/` directory at root

## Code Quality Strategy (Current)

**What is in place:**
- ESLint with TypeScript plugin for static analysis
- Prettier for consistent formatting
- TypeScript strict mode (`"strict": true` in tsconfig.json)
- Compiler options enforce:
  - No implicit any (`"noImplicitAny": false` overrides strict, but with explicit types expected)
  - No unused parameters (with underscore pattern exception)
  - No implicit returns (`"noImplicitReturns": true`)
  - No fallthrough cases (`"noFallthroughCasesInSwitch": true`)

**Type Safety:**
```json
{
  "strict": true,
  "noImplicitAny": false,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true
}
```

This ensures reasonable type safety without requiring explicit types everywhere.

## Manual Testing Approach

**Build validation:**
The build process in `rollup.config.mjs` includes:
- TypeScript compilation via esbuild
- Tree-shaking optimization
- Minification with terser
- Version replacement (vPLACEHOLDER → actual version)
- Production-specific transformations:
  - Component name: `calendar-card-pro-dev` → `calendar-card-pro`
  - Log level reduced to 0 (ERROR only)

**Integration points:**
Home Assistant custom card integration tested manually:
- `@customElement('calendar-card-pro-dev')` decorator registers component
- Static methods `getConfigElement()` and `getStubConfig` for editor integration
- Window type declaration ensures proper global integration

## Logging for Debugging

**Built-in logging module** (`src/utils/logger.ts`) provides comprehensive debugging:

```typescript
// Error logging with context
Logger.error('Failed to fetch events', { entityId: 'calendar.work' });

// Warning for potential issues
Logger.warn('Multiple calendars detected');

// Info for key lifecycle events
Logger.info('Fetching events from API');

// Debug for detailed tracing
Logger.debug('Event filtered by date range');
```

**Log levels (configurable):**
- 0 = ERROR (production)
- 1 = WARN
- 2 = INFO
- 3 = DEBUG (development)

**Current setting:**
```typescript
// In src/config/constants.ts
export const LOGGING = {
  CURRENT_LOG_LEVEL: 3,  // DEBUG in dev
  PREFIX: '📅 Calendar Card Pro',
};
```

Production build changes this to level 0 via rollup replace plugin.

## Error Handling Patterns

**Protected error handling in utilities:**

From `src/utils/helpers.ts` - Safe type conversion:
```typescript
export function formatUnknownContext(context: unknown): string | Record<string, unknown> | undefined {
  if (context === undefined || context === null) {
    return undefined;
  }

  if (typeof context === 'string') {
    return context;
  }

  if (typeof context === 'object') {
    try {
      return { ...(context as Record<string, unknown>) };
    } catch {
      try {
        return { value: JSON.stringify(context) };
      } catch {
        return { value: String(context) };
      }
    }
  }

  return String(context);
}
```

From `src/utils/events.ts` - Graceful API error handling:
```typescript
export async function fetchEventData(
  hass: Types.Hass,
  config: Types.Config,
  instanceId: string,
  force = false,
): Promise<Types.CalendarEventData[]> {
  // Guard clauses return early
  const cacheKey = getBaseCacheKey(...);

  if (!force) {
    const cachedEvents = getCachedEvents(cacheKey, config, isManualPageReload);
    if (cachedEvents) {
      Logger.info(`Using ${cachedEvents.length} events from cache`);
      return [...cachedEvents];
    }
  }

  // Try to fetch, with error handling in Logger
  try {
    const fetchedEvents = await fetchEvents(hass, entities, timeWindow);
    // Process events...
  } catch (error) {
    Logger.error('Failed to fetch events', { config, timeWindow }, error);
    return [];
  }
}
```

## Mocking Strategy (If Tests Were Added)

**What would need mocking:**

1. **Home Assistant Interface** (`Types.Hass`):
   - API calls to fetch calendar events
   - Service calls for actions (navigate, toggle, etc.)

2. **DOM APIs** (in `src/utils/helpers.ts`):
   - `document.createElement()` for color conversion
   - `getComputedStyle()` for CSS parsing

3. **External Libraries:**
   - `dayjs` for date/time operations
   - `@material/web` components

4. **What NOT to mock:**
   - Pure utility functions (formatting, date parsing)
   - Formatting logic that doesn't depend on external state
   - Configuration object construction

## Testable Components

**High priority for future tests:**

1. **`src/utils/format.ts`** (498 lines):
   - `formatEventTime()` - Complex date/time formatting logic
   - `parseAllDayDate()` - Date parsing with edge cases
   - Event time formatting for different event types

2. **`src/utils/events.ts`** (1503 lines):
   - `fetchEventData()` - Cache logic and API integration
   - `processEvents()` - Event filtering and transformation
   - `groupEventsByDay()` - Data structure organization

3. **`src/utils/logger.ts`** (295 lines):
   - `error()` function with multiple input types
   - Log level filtering
   - Context formatting

4. **`src/config/config.ts`** (326 lines):
   - Configuration validation
   - Default value application
   - Type coercion

5. **`src/rendering/render.ts`** (1060 lines):
   - Template generation logic
   - Conditional rendering
   - DOM structure stability

## Coverage Gaps

**Currently untested:**
- All Lit component lifecycle methods (connectedCallback, updated, etc.)
- Home Assistant integration (actions, entity updates)
- Weather forecast integration
- Multi-language rendering
- Cache expiry and cleanup logic
- Event deduplication logic
- Weekend/today color overrides
- Responsive grid layout calculations

## Build-Time Validation

**TypeScript compilation** acts as first line of defense:
```bash
npm run build  # Compiles and bundles
```

Compilation catches:
- Type mismatches
- Unused variables (with _ exception)
- Missing return statements
- Implicit any types (where noImplicitAny is strict)

**ESLint validation** runs before/after:
```bash
npm run lint      # Check
npm run lint --fix  # Fix fixable issues
```

Checks:
- Import ordering consistency
- Unused imports
- No explicit any (when enforced)
- Prettier format compliance

## Recommended Testing Setup

If test framework were to be added:

```bash
# Install
npm install --save-dev vitest @vitest/ui @testing-library/lit

# Run tests
npm run test              # Single run
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

**Start with these test suites:**
1. `src/utils/__tests__/format.test.ts` - Date formatting edge cases
2. `src/utils/__tests__/events.test.ts` - Event processing logic
3. `src/config/__tests__/config.test.ts` - Configuration validation
4. `src/rendering/__tests__/render.test.ts` - Template generation

---

*Testing analysis: 2026-02-22*
