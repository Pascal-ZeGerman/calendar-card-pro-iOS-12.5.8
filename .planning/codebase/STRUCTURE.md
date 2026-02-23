# Codebase Structure

**Analysis Date:** 2026-02-22

## Directory Layout

```
calendar-card-pro-iOS-12.5.8/
├── src/                           # Source TypeScript code
│   ├── calendar-card-pro.ts        # Main component entry point
│   ├── config/                     # Configuration management
│   │   ├── config.ts               # Default config & validation
│   │   ├── types.ts                # Type definitions
│   │   └── constants.ts            # App constants
│   ├── rendering/                  # UI rendering & styles
│   │   ├── render.ts               # Template generators
│   │   ├── styles.ts               # CSS & style generation
│   │   ├── editor.ts               # Config editor component
│   │   └── editor.styles.ts        # Editor styling
│   ├── interaction/                # User interaction handling
│   │   ├── actions.ts              # Action execution logic
│   │   └── feedback.ts             # Visual feedback (hold indicator)
│   ├── utils/                      # Utility functions
│   │   ├── events.ts               # Event fetching & processing
│   │   ├── format.ts               # Date/time formatting
│   │   ├── logger.ts               # Logging infrastructure
│   │   ├── helpers.ts              # General helpers
│   │   └── weather.ts              # Weather forecast utilities
│   └── translations/               # Localization
│       ├── localize.ts             # Locale management
│       ├── dayjs.ts                # Dayjs locale setup
│       └── languages/              # Language files
├── dist/                           # Built output (gitignored)
│   └── calendar-card-pro.js        # Production build
├── docs/                           # Documentation
├── .planning/                      # GSD planning documents
│   └── codebase/                   # Architecture analysis
├── rollup.config.mjs               # Build configuration
├── tsconfig.json                   # TypeScript configuration
├── package.json                    # Dependencies & scripts
└── .eslintrc                       # Linting configuration
```

## Directory Purposes

**src/:**
- Purpose: All application source code in TypeScript
- Contains: Component logic, utilities, rendering, configuration
- Key files: `calendar-card-pro.ts` (entry point), `config/types.ts` (type defs)

**src/config/:**
- Purpose: Centralized configuration management
- Contains: Type definitions, default values, constants, configuration validation
- Key files: `types.ts` (65+ interfaces), `config.ts` (DEFAULT_CONFIG), `constants.ts` (version, timing, UI constants)

**src/rendering/:**
- Purpose: Lit template generation and styling
- Contains: Pure rendering functions returning TemplateResult objects, CSS style generation
- Key files: `render.ts` (1061 lines of rendering logic), `styles.ts` (generated CSS properties), `editor.ts` (configuration UI)

**src/interaction/:**
- Purpose: User interaction and action dispatch
- Contains: Action handling (tap, hold, navigate, service calls), visual feedback
- Key files: `actions.ts` (action execution switch), `feedback.ts` (hold indicator UI)

**src/utils/:**
- Purpose: Reusable utility functions shared across layers
- Contains: Event data fetching/caching, date/time formatting, logging, helpers, weather lookups
- Key files: `events.ts` (52KB, 800+ lines), `format.ts` (date/countdown formatting), `logger.ts` (environment-based logging)

**src/translations/:**
- Purpose: Multi-language support
- Contains: Locale detection, dayjs locale setup, language JSON files
- Key files: `localize.ts` (language selection logic), `languages/en.json` (English translations)

**dist/:**
- Purpose: Built JavaScript output for Home Assistant
- Contains: Single compiled JS bundle with embedded dependencies
- Generated: By rollup build process from src/

**docs/:**
- Purpose: User documentation and setup guides
- Contains: README, configuration examples, feature documentation

**.planning/codebase/:**
- Purpose: GSD architecture analysis documents
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, etc.

## Key File Locations

**Entry Points:**
- `src/calendar-card-pro.ts`: Main Web Component (lines 1-621), defines CalendarCardPro class with LitElement lifecycle
- `src/config/types.ts`: Type definitions (lines 1-371), used throughout codebase
- `dist/calendar-card-pro.js`: Production build output, loaded by Home Assistant

**Configuration:**
- `src/config/config.ts`: DEFAULT_CONFIG constant with 100+ properties
- `src/config/constants.ts`: VERSION, TIMING, CACHE, UI constants
- `tsconfig.json`: TypeScript compiler options
- `rollup.config.mjs`: Build configuration with esbuild, terser, source maps

**Core Logic:**
- `src/calendar-card-pro.ts`: Component orchestration, lifecycle, event management, interaction handlers
- `src/utils/events.ts`: API fetching, caching, event processing, grouping
- `src/rendering/render.ts`: Lit template generators for all UI elements

**Testing:**
- No test files present in codebase (testing not implemented)

## Naming Conventions

**Files:**
- Kebab-case: `calendar-card-pro.ts`, `editor.styles.ts`
- Domain-specific: Grouped by feature (`config/`, `rendering/`, `interaction/`, `utils/`)
- Namespace exports: Each file typically exports via namespace (`export * as Actions from './interaction/actions'`)

**Directories:**
- Lowercase kebab-case: `src/config/`, `src/rendering/`, `src/interaction/`
- Functional grouping: Each directory contains related functionality
- Translations: `src/translations/languages/` holds language-specific files

**Functions:**
- camelCase: `fetchEventData()`, `groupEventsByDay()`, `renderEvent()`
- Verb-prefixed for actions: `render*()`, `fetch*()`, `format*()`, `handle*()`
- Private functions prefixed with underscore: `_handlePointerDown()`, `_setupWeatherSubscriptions()`

**Types:**
- PascalCase: `CalendarCardPro`, `Config`, `CalendarEventData`, `EventsByDay`
- Suffixed with domain: `*Config`, `*Data`, `*Message`, `*Event`
- Interfaces for all data structures

**Constants:**
- UPPER_SNAKE_CASE: `DEFAULT_CONFIG`, `CURRENT_LOG_LEVEL`, `CACHE_KEY_PREFIX`
- Nested objects for organization: `Constants.TIMING.HOLD_THRESHOLD`, `Constants.UI.SEPARATOR_SPACING`

**CSS Classes:**
- Kebab-case: `calendar-card`, `day-table`, `event-first`, `past-event`
- Semantic naming: `date-column`, `time-location`, `weather`
- BEM-like: `event-content`, `progress-bar-filled`

## Where to Add New Code

**New Feature:**
- Primary code: Add to appropriate module in `src/` (e.g., new render logic → `src/rendering/render.ts`)
- Configuration: Add interface properties to `src/config/types.ts`, defaults to `src/config/config.ts`
- Utilities: Extract helpers to `src/utils/` with descriptive filenames
- No dedicated test files exist; feature changes should include inline documentation

**New Component/Module:**
- Implementation: Create new file in appropriate directory (e.g., `src/rendering/new-feature.ts`)
- Types: Add interfaces to `src/config/types.ts` if needed
- Export: Add to main component imports with namespace (e.g., `import * as NewFeature from './new-feature'`)
- Integration: Wire into main component or rendering flow as needed

**Utilities:**
- Shared helpers: `src/utils/helpers.ts` for general utilities
- Domain-specific: Create new file if 50+ lines (e.g., `src/utils/weather.ts` for weather functions)
- Export pattern: Namespace export for consistency (`export * as Helpers from './utils/helpers'`)

**Styling:**
- CSS generation: `src/rendering/styles.ts` for dynamic CSS from config
- Static styles: Component uses Lit's `static get styles()` pattern
- Editor styles: `src/rendering/editor.styles.ts` for config UI

## Special Directories

**dist/:**
- Purpose: Built JavaScript bundles
- Generated: Yes (via `npm run build`)
- Committed: No (gitignored)
- Consumed by: Home Assistant Lovelace system

**docs/:**
- Purpose: User-facing documentation
- Generated: No (manually maintained)
- Committed: Yes
- Examples: README.md, configuration guides, feature documentation

**src/translations/languages/:**
- Purpose: Language-specific translation files
- Generated: No (manually maintained)
- Committed: Yes
- Format: JSON files with key-value translations
- Pattern: `en.json`, `de.json`, `fr.json`, etc.

**.planning/codebase/:**
- Purpose: GSD architecture analysis documents
- Generated: Yes (by GSD mapping tools)
- Committed: Yes
- Documents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md, STACK.md, INTEGRATIONS.md
