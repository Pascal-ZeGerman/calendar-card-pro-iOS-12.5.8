# External Integrations

**Analysis Date:** 2026-02-22

## APIs & External Services

**Home Assistant Calendar API:**
- Calendar data retrieval
  - SDK/Client: Native Home Assistant `hass.callApi()` interface
  - Protocol: REST API calls via `hass.callApi('GET', '/api/calendars/{entity_id}')`
  - Auth: Automatic via Home Assistant connection context
  - Implementation: `src/utils/events.ts` - `fetchEvents()` function queries calendar entities
  - Event data format: Google Calendar-compatible (RFC format with `start.dateTime`/`start.date`, `end.dateTime`/`end.date`)

**Home Assistant Weather API:**
- Weather forecast data
  - SDK/Client: Home Assistant WebSocket subscription via `hass.connection.subscribeMessage()`
  - Protocol: WebSocket message subscription
  - Auth: Automatic via Home Assistant connection context
  - Implementation: `src/utils/weather.ts` - `subscribeToWeatherForecast()` function
  - Forecast types: `daily` and `hourly` forecasts with separate subscriptions
  - Message format: `WeatherForecastMessage` with `forecast` array containing forecast objects

**Home Assistant Service Calling:**
- Service execution
  - Method: `hass.callService(domain, service, serviceData)`
  - Implementation: `src/interaction/actions.ts` - `handleAction()` for `call-service` action type
  - Example: Toggle calendar visibility, execute automations

## Data Storage

**Databases:**
- Not applicable - frontend card component only

**File Storage:**
- None - No file persistence required

**Browser Storage:**
- localStorage only
  - Cache keys: Prefixed with `cache_data_` (defined in `src/config/constants.ts`)
  - Purpose: Calendar event caching across page reloads
  - TTL: Configurable cache expiry with 4x multiplier on cache lifetime
  - Functions: `getCachedEvents()`, `cacheEvents()` in `src/utils/events.ts`
  - Manual reload detection: Cached data expires faster on detected page reloads (5 second TTL)

**Caching Strategy:**
- Cache key composition: Combines instance ID, entity list, days_to_show, show_past_events, start_date, filter_duplicates
- Cache cleanup: Automatic purge interval (3600000ms / 1 hour) removes expired entries
- Default refresh interval: 30 minutes
- Manual override: `force` parameter in `fetchEventData()` bypasses cache

## Authentication & Identity

**Auth Provider:**
- Home Assistant native auth
  - Implementation: No separate auth required
  - Context: Authentication provided through Home Assistant's `hass` object passed to card
  - Method: Home Assistant frontend handles all auth; card receives pre-authenticated `hass` context
  - Types: `src/config/types.ts` defines `Hass` interface with authenticated API methods

**Authorization:**
- Entity access: Card can only access calendar/weather entities user has permission for in Home Assistant
- API access: Implicitly granted through Home Assistant's role-based access control

## Monitoring & Observability

**Error Tracking:**
- None configured (no external service)

**Logs:**
- Internal only via `src/utils/logger.ts`
  - Custom logger module with configurable levels: ERROR (0), WARN (1), INFO (2), DEBUG (3)
  - Console output with standardized prefix: `📅 Calendar Card Pro`
  - Build-time log level configuration: Changed to 0 (ERROR only) in production
  - Runtime: `CURRENT_LOG_LEVEL` in `src/config/constants.ts`

## CI/CD & Deployment

**Hosting:**
- Home Assistant custom card
- Distribution: HACS (Home Assistant Community Store)
- Installation: Via HACS URL pointing to GitHub repository

**CI Pipeline:**
- None detected (no workflow files with automation)
- Manual build and release process
- GitHub Actions workflows present but not configured for CI/CD

## Environment Configuration

**Required env vars:**
- None (browser-based frontend component)

**Configuration Method:**
- YAML configuration via Home Assistant card config
- Editor UI via `src/rendering/editor.ts` - CalendarCardProEditor component
- Stub config provided via `static getStubConfig()` for card picker

**Configuration Interface:**
- `setConfig()` method receives partial config from Home Assistant
- Defaults merged from `src/config/config.ts` - `DEFAULT_CONFIG`
- Configuration structure: `src/config/types.ts` - `Config` interface

**Key Configurable Items:**
- Calendar entities to display
- Days to show (date range)
- Color schemes (background, accent, event colors)
- Display options (weather, time format, location, progress bars)
- Action handlers (tap, hold)
- Refresh interval
- Weather entity integration

## Secrets location

- Not applicable - frontend component, no secrets stored locally
- API credentials: Handled by Home Assistant authentication layer

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- Home Assistant service calls
  - Method: `hass.callService(domain, service, serviceData)`
  - Use cases: Toggle services, execute automations on card interaction
  - Implementation: `src/interaction/actions.ts` case `'call-service'`

**Event Listeners:**
- Document visibility change: Triggers data refresh when tab regains focus
- Implementation: `src/calendar-card-pro.ts` - `_handleVisibilityChange()` with 5 minute threshold
- Pointer events: Multi-pointer tracking for hold detection and feedback
- Keyboard events: Accessibility support for Enter/Space key activation

## External Dependencies

**Content Delivery:**
- Material Design Icons via `@mdi/js` package (npm, not CDN)

**Data Sources:**
- Home Assistant calendar entities (via REST API)
- Home Assistant weather entities (via WebSocket)

## Integration Points Summary

| Integration | Type | Direction | Protocol | Implementation File |
|---|---|---|---|---|
| Home Assistant Calendar API | Data | Inbound | REST/GET | `src/utils/events.ts` |
| Home Assistant Weather API | Data | Inbound | WebSocket | `src/utils/weather.ts` |
| Home Assistant Service API | Control | Outbound | REST/POST | `src/interaction/actions.ts` |
| Browser localStorage | Cache | Bidirectional | Browser API | `src/utils/events.ts` |
| Home Assistant More-Info Dialog | Navigation | Outbound | DOM Event | `src/interaction/actions.ts` |
| Home Assistant Navigation | Navigation | Outbound | URL/Path | `src/interaction/actions.ts` |

---

*Integration audit: 2026-02-22*
