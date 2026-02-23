# Coding Conventions

**Analysis Date:** 2026-02-22

## Naming Patterns

**Files:**
- Utility modules: `snake_case` (e.g., `logger.ts`, `format.ts`, `events.ts`)
- Component/main files: `kebab-case` (e.g., `calendar-card-pro.ts`)
- Style files: `snake_case.ts` (e.g., `editor.styles.ts`)
- Configuration files: `.mjs` or `.json` extension (e.g., `eslint.config.mjs`, `rollup.config.mjs`)

**Functions:**
- Standard functions: `camelCase` (e.g., `formatEventTime`, `renderMainCardStructure`, `fetchEventData`)
- Private helper functions: `camelCase` with leading underscore when needed in classes (e.g., `_instanceId`)
- Exported functions: Always exported explicitly with `export function` keyword

**Variables:**
- Constants (module-level): `UPPER_SNAKE_CASE` (e.g., `BANNER_SHOWN`, `DEFAULT_CONFIG`, `LOG_STYLES`)
- Reactive properties (Lit components): `camelCase` with `@property` decorator (e.g., `isLoading`, `isExpanded`)
- Non-reactive private properties: `camelCase` with leading underscore (e.g., `_instanceId`)
- Regular variables: `camelCase` (e.g., `startDate`, `endDate`, `cacheKey`)

**Types:**
- Interfaces: `PascalCase` (e.g., `Config`, `CalendarEventData`, `WeatherForecasts`, `ActionContext`)
- Type aliases: `PascalCase` (e.g., `Translations`, `EntityConfig`)
- Enums: `PascalCase` (e.g., `LogLevel`)

## Code Style

**Formatting:**
- Tool: Prettier 3.5.2
- Print width: 100 characters
- Tab width: 2 spaces (no tabs)
- Single quotes for strings
- Trailing commas: all
- Bracket spacing: true
- Arrow functions: always include parentheses

**Linting:**
- Tool: ESLint 9.21.0 with flat config (`eslint.config.mjs`)
- Parser: @typescript-eslint/parser
- Plugins: @typescript-eslint/eslint-plugin, prettier, import
- No unused variables (pattern: parameters starting with `_` are ignored)
- No explicit `any` types allowed
- Prefer `function` return types inferred over explicit declarations

## Import Organization

**Order:**
1. Lit libraries and DOM imports (e.g., `import { LitElement } from 'lit'`)
2. External third-party packages (e.g., `import dayjs from 'dayjs'`)
3. Internal namespace imports from config (e.g., `import * as Config from './config/config'`)
4. Internal type imports (e.g., `import * as Types from './config/types'`)
5. Internal utility imports (e.g., `import * as Helpers from './utils/helpers'`)

**Rules:**
- Import groups must be separated by blank lines
- Alphabetized within each group
- Use namespace imports (`import * as Name from`) for better organization and clarity
- Special comment `/* eslint-disable import/order */` at top of files allows flexibility for specific module organization

**Path Aliases (from tsconfig.json):**
- `@config/*` → `src/config/*`
- `@translations/*` → `src/translations/*`
- `@utils/*` → `src/utils/*`
- `@rendering/*` → `src/rendering/*`

Note: While aliases are configured, actual codebase uses relative imports for consistency.

## Error Handling

**Patterns:**
- Logger module (`src/utils/logger.ts`) is primary error handling mechanism
- Error objects logged with stack traces via `Logger.error()`
- Support for error context (string or object) to provide contextual information
- Unknown error types safely converted before logging
- Try-catch blocks use explicit error handling to avoid surprises

**Example pattern from `src/utils/helpers.ts`:**
```typescript
try {
  // Try to safely convert to Record<string, unknown>
  return { ...(context as Record<string, unknown>) };
} catch {
  // If conversion fails, stringify it
  try {
    return { value: JSON.stringify(context) };
  } catch {
    return { value: String(context) };
  }
}
```

## Logging

**Framework:** Console-based with custom formatting via `src/utils/logger.ts`

**LogLevel Enum:**
- ERROR = 0
- WARN = 1
- INFO = 2
- DEBUG = 3

**Current log level:** 3 (DEBUG) in development, 0 (ERROR) in production

**API functions:**
- `Logger.error(messageOrError, context?, ...data)` - Log errors with optional context
- `Logger.warn(message, ...data)` - Log warnings
- `Logger.info(message, ...data)` - Log info messages
- `Logger.debug(message, ...data)` - Log debug messages
- `Logger.initializeLogger(version)` - Initialize logger with version banner
- `Logger.printVersionBanner(version)` - Print welcome banner

**Styling patterns:**
- Messages prefixed with formatted label: `[📅 Calendar Card Pro]`
- Version banner shown once per session using flag (`BANNER_SHOWN`)
- Styled console output using CSS (`console.log('%c...', style)`)
- Stack traces always included for Error objects

## Comments

**When to Comment:**
- JSDoc/TSDoc for all public exported functions
- Complex logic requiring explanation (e.g., date parsing, caching strategy)
- Important assumptions or gotchas
- Magic numbers explained inline

**JSDoc/TSDoc Pattern:**
All public functions use structured documentation blocks:
```typescript
/**
 * Format an event's time string based on its start and end times
 *
 * Generates a human-readable time string for calendar events
 * handling all-day events, multi-day events, and regular events
 *
 * @param event Calendar event
 * @param config Card configuration
 * @param language Language code
 * @param hass Home Assistant object for system time format detection
 * @returns Formatted time string
 */
export function formatEventTime(
  event: Types.CalendarEventData,
  config: Types.Config,
  language: string,
  hass?: Types.Hass | null,
): string { ... }
```

**Section comments:** Files use section separators for organization:
```typescript
//-----------------------------------------------------------------------------
// MAIN CARD STRUCTURE RENDERING
//-----------------------------------------------------------------------------
```

## Function Design

**Size Guidelines:**
- Prefer small, focused functions (most utilities are 50-150 lines)
- Functions in `src/rendering/render.ts` can be longer (up to 200+ lines) due to template generation needs
- Large modules split into sections with clear separation comments

**Parameters:**
- Use typed parameters with explicit types (no implicit `any`)
- Optional parameters use `?` in type signature (e.g., `hass?: Types.Hass`)
- Default values specified in signature (e.g., `force = false`)
- Single object parameter preferred for functions with many related options (e.g., `handlers` object)

**Return Values:**
- Always explicitly type return values (inferred where appropriate)
- Return early from guard clauses to reduce nesting
- Avoid implicit `undefined` returns

## Module Design

**Exports:**
- Each module exports a cohesive set of related functions or constants
- No default exports; always use named exports
- Related functions grouped together with section comments

**Example from `src/config/config.ts`:**
- `DEFAULT_CONFIG` - Default configuration object
- `getStubConfig()` - Function to get stub config for editor

**Barrel Files:**
- Some modules use namespace imports (`import * as Config`) for cleaner re-exports
- Example: `src/utils/logger.ts` exports multiple log functions and `LogLevel` enum

**Example import pattern:**
```typescript
import * as Logger from './utils/logger';
import * as Config from './config/config';
import * as Types from './config/types';

// Usage:
Logger.info('message');
Config.DEFAULT_CONFIG;
Types.Config;
```

## Special Patterns

**Lit Component Decorators:**
- `@customElement('element-name')` - Register custom element
- `@property({ attribute: false })` - Define reactive properties (not DOM attributes)

**File Header Pattern:**
Most files begin with ESLint disable and JSDoc block:
```typescript
/* eslint-disable import/order */
/**
 * Module description
 */
```

The `eslint-disable import/order` allows intentional import organization that differs from standard rules.

---

*Convention analysis: 2026-02-22*
