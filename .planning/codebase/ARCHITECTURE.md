# Architecture

**Analysis Date:** 2026-02-22

## Pattern Overview

**Overall:** Component-Based Web Component Architecture (Lit/LitElement)

**Key Characteristics:**
- Single Web Component (`CalendarCardPro`) extending LitElement that orchestrates modular subsystems
- Clear separation of concerns: configuration, rendering, interaction, utilities, and translations
- Modular namespace-based imports for clean encapsulation
- Reactive property system with Lit lifecycle management
- Home Assistant integration layer for calendar data and user actions

## Layers

**Presentation Layer (Rendering):**
- Purpose: Generate UI templates and styling for calendar display
- Location: `src/rendering/render.ts`, `src/rendering/styles.ts`, `src/rendering/editor.ts`, `src/rendering/editor.styles.ts`
- Contains: Lit TemplateResult generators, style objects, separator rendering, event display functions
- Depends on: Types, Config, Localization, Weather utilities, Format utilities
- Used by: Main component `CalendarCardPro` in render() method

**Component Layer (Main Orchestrator):**
- Purpose: Manage component lifecycle, state, and coordinate all subsystems
- Location: `src/calendar-card-pro.ts`
- Contains: `CalendarCardPro` class extending LitElement with reactive properties and lifecycle hooks
- Depends on: All other modules (Config, Types, Rendering, Interaction, Utilities)
- Used by: Home Assistant Lovelace dashboard system

**Configuration Layer:**
- Purpose: Manage card configuration, validation, defaults, and upgrades
- Location: `src/config/config.ts`, `src/config/types.ts`, `src/config/constants.ts`
- Contains: Type definitions, default configs, constant values, configuration validation
- Depends on: Types, Logger
- Used by: Main component, Editor, Utilities

**Data Processing Layer:**
- Purpose: Fetch, cache, process, and organize calendar events
- Location: `src/utils/events.ts`
- Contains: Event fetching from Home Assistant API, caching logic, event filtering, grouping by day
- Depends on: Types, Config, Logger, Format utilities
- Used by: Main component `updateEvents()` method

**Interaction Layer:**
- Purpose: Handle user interactions and dispatch appropriate actions
- Location: `src/interaction/actions.ts`, `src/interaction/feedback.ts`
- Contains: Action execution (tap, hold, more-info, navigate, service calls), hold indicator visual feedback
- Depends on: Types, Logger
- Used by: Main component pointer/keyboard event handlers

**Utility Layer:**
- Purpose: Provide reusable functions for formatting, logging, calculations, and helpers
- Location: `src/utils/format.ts`, `src/utils/logger.ts`, `src/utils/helpers.ts`, `src/utils/weather.ts`
- Contains: Date formatting, time formatting, logging infrastructure, color conversions, weather forecast lookups
- Depends on: Types, Constants
- Used by: All other layers

**Translation Layer:**
- Purpose: Manage localization and multi-language support
- Location: `src/translations/localize.ts`, `src/translations/dayjs.ts`, `src/translations/languages/`
- Contains: Language file mappings, dayjs locale configuration, locale detection
- Depends on: Types
- Used by: Rendering, Event utilities, Format utilities

## Data Flow

**Event Loading and Display:**

1. User navigates to dashboard with calendar card or configuration changes
2. `setConfig()` called on main component with configuration object
3. Config validated and normalized, weather subscriptions set up
4. `updateEvents()` invoked to fetch calendar data
5. Event utilities check cache using deterministic cache key from config
6. If cache miss, Home Assistant API called for each configured entity
7. Events processed: filtered by date range, duplicates removed, multi-day split if configured
8. Processed events cached and returned
9. Events passed to `groupEventsByDay()` utility which organizes by date/week/month
10. Render method called with grouped events
11. Rendering functions generate TemplateResult with proper separators and styling
12. Lit framework updates DOM with new templates

**User Interaction Flow:**

1. User taps or holds card element
2. PointerDown event captured in `_handlePointerDown()`
3. Hold timer started if hold_action configured
4. PointerUp event captured in `_handlePointerUp()`
5. If hold triggered, hold action executed; otherwise tap action executed
6. Action handler dispatches appropriate action (navigate, more-info, service call, toggle expand, etc.)
7. Home Assistant receives event and processes accordingly

**Weather Integration:**

1. During `_setupWeatherSubscriptions()`, weather entity checked
2. Required forecast types determined (daily, hourly, or both)
3. Home Assistant weather forecast subscription created
4. Updates received in callback, stored in `weatherForecasts` property
5. During rendering, weather data matched to events by date/time
6. Weather icons and temperatures rendered inline with date column or events

**State Management:**

- `config`: Card configuration (reactive property)
- `events`: Array of calendar events (reactive property)
- `isLoading`: Boolean loading indicator (reactive property)
- `isExpanded`: Expanded/compact view mode toggle (reactive property)
- `weatherForecasts`: Organized daily/hourly weather data (reactive property)
- `hass`: Home Assistant instance connection (reactive property)
- Private state: Instance ID, refresh timers, hold tracking, language cache

## Key Abstractions

**Event Data (`CalendarEventData`):**
- Purpose: Represents a single calendar event with all metadata
- Examples: `src/config/types.ts` lines 199-209
- Pattern: Immutable data structure with readonly properties and optional computed metadata fields

**Configuration (`Config`):**
- Purpose: Complete card configuration including styling, layout, behavior, entity mappings
- Examples: `src/config/types.ts` lines 14-112, `src/config/config.ts` lines 17-100+
- Pattern: Interface with required and optional fields, default values centralized

**Grouped Events (`EventsByDay`):**
- Purpose: Events organized by day with metadata for rendering separators and week numbers
- Examples: `src/config/types.ts` lines 214-224
- Pattern: Computed structure generated from flat event list via `groupEventsByDay()`

**Action Configuration (`ActionConfig`):**
- Purpose: User-configurable action (tap/hold) with target and parameters
- Examples: `src/config/types.ts` lines 241-248
- Pattern: Flexible action system supporting multiple action types via switch statement dispatch

**Weather Data (`WeatherData`):**
- Purpose: Processed weather information matched to events by time
- Examples: `src/config/types.ts` lines 173-182
- Pattern: Computed on-demand from Home Assistant forecast API data

## Entry Points

**Web Component Registration:**
- Location: `src/calendar-card-pro.ts` lines 613-620
- Triggers: Home Assistant loads custom card from dist/calendar-card-pro.js
- Responsibilities: Registers element with `@customElement` decorator, exposes to window.customCards

**Component Lifecycle:**
- `connectedCallback()`: Sets up timers, loads events, subscribes to weather, attaches listeners
- `updated()`: Handles reactive property changes, language/config updates
- `disconnectedCallback()`: Cleans up timers, unsubscribes from weather, removes listeners

**Home Assistant Integration Points:**
- `setConfig()`: Receives configuration from Lovelace
- `hass` property setter: Receives Home Assistant instance connection
- `render()`: Called by Lit framework to generate DOM
- Action events: Fire custom events (hass-more-info, location-changed, calendar-card-action)

## Error Handling

**Strategy:** Try-catch with logging, graceful fallbacks, safe optional chaining

**Patterns:**
- `safeHass` getter provides null-safe access to Home Assistant instance
- Event fetching wrapped in try-catch with error logging and isLoading state reset
- Weather subscription failures handled with unsubscriber cleanup
- Missing entity data handled with empty event arrays
- API errors logged but don't crash component

## Cross-Cutting Concerns

**Logging:** Centralized `Logger` module (`src/utils/logger.ts`) with environment-controlled levels (prod=0, dev≥1). All significant operations logged (fetch, render, interaction, config changes).

**Validation:** Configuration validated in `setConfig()` before use. Entity arrays normalized. Cache keys generated deterministically from config. Time window calculations validated.

**Authentication:** Delegated to Home Assistant via `hass` connection. Calendar API access requires valid Home Assistant session. Actions dispatched through Home Assistant's event system.

**Caching:** Smart two-tier system - instance-level cache with time-based expiry plus manual page load detection. Cache key includes entities, days_to_show, show_past_events, start_date, filter_duplicates.

**Styling:** CSS custom properties generated from configuration via `generateCustomPropertiesObject()`. Responsive design via Lit's styleMap directive. Card-mod compatibility maintained through stable DOM structure.
