# Home Assistant integration overrides

These files are **not** part of the card bundle (`dist/calendar-card-pro.js`). They are
copies of Home Assistant custom-component overrides that the kiosk setup depends on,
kept here so the fixes are versioned. Deploy them by copying into the HA config
directory and restarting (or reloading) Home Assistant.

## `caldav/__init__.py`

Shadows core's `caldav` integration setup (`/config/custom_components/caldav/`).

Changes versus upstream:

- `timeout=120` instead of 30 s, for slow iCloud REPORT queries.
- **Network errors during setup now raise `ConfigEntryNotReady`.** Newer `caldav`
  releases use `niquests`, whose `ConnectionError`/`Timeout` are unrelated to the
  `requests` classes upstream catches. A DNS failure at boot therefore escaped as an
  unhandled exception, the entry went to `SETUP_ERROR`, and Home Assistant never
  retried: no calendar entities existed, so the card stayed empty until a manual
  reload. With this fix Home Assistant retries with back-off until DNS recovers.

## `caldav/api.py`

`async_get_calendars()` is called by the calendar and todo platform setup. It now raises
`PlatformNotReady` on network errors (and `DAVError`), so Home Assistant retries the
platform with back-off. `AuthorizationError` (a `DAVError` subclass) is deliberately
**not** retried: a revoked password or wrong URL is permanent, so it propagates and fails
the setup visibly instead of looping forever. Without this, a DNS failure right after boot, even with the
`__init__.py` fix in place, left the platforms without entities and nothing retried them.
Unrelated exceptions still propagate.

Only `__init__.py` and `api.py` are tracked here. The live override directory also
carries a patched `coordinator.py`/`calendar.py` (opt-in stale-while-revalidate cache)
that is not yet vendored.

### Tests

```bash
python3 -I tests/ha-caldav/test_setup_retry.py     # __init__.py
python3 -I tests/ha-caldav/test_platform_retry.py  # api.py
# or against any other copy, e.g. the live one, from inside the container:
docker exec -i Home_Assistant python3 -I - /config/custom_components/caldav/api.py \
  < tests/ha-caldav/test_platform_retry.py
```

Needs Python >= 3.12 for `test_setup_retry.py` (the module uses the `type` statement);
Home Assistant itself is stubbed.
