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

Only `__init__.py` is tracked here. The live override directory also carries a patched
`coordinator.py`/`calendar.py` (opt-in stale-while-revalidate cache) that is not yet
vendored.

### Test

```bash
python3 -I tests/ha-caldav/test_setup_retry.py            # fixed file
python3 -I tests/ha-caldav/test_setup_retry.py <other>    # any other copy of __init__.py
```

Needs Python >= 3.12; Home Assistant itself is stubbed.
