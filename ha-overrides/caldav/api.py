"""Library for working with CalDAV api."""

import caldav
from caldav.lib.error import DAVError
import requests

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import PlatformNotReady

try:
    # Newer caldav releases use niquests instead of requests, so their network
    # errors do not derive from the requests exception classes.
    import niquests
except ImportError:  # older caldav releases that still use requests
    niquests = None

# Transient failures (DNS not ready at boot, connection refused, timeouts).
# Keep in sync with _TRANSIENT_ERRORS in __init__.py.
_TRANSIENT_ERRORS: tuple[type[Exception], ...] = (
    requests.ConnectionError,
    requests.Timeout,
)
if niquests is not None:
    _TRANSIENT_ERRORS += (niquests.ConnectionError, niquests.Timeout)


async def async_get_calendars(
    hass: HomeAssistant, client: caldav.DAVClient, component: str
) -> list[caldav.Calendar]:
    """Get all calendars that support the specified component.

    Called from the calendar and todo platform setup. Network errors are raised
    as PlatformNotReady so Home Assistant retries the platform with back-off;
    any other exception would leave the platform without entities for good.
    """

    def _get_calendars() -> list[caldav.Calendar]:
        return [
            calendar
            for calendar in client.principal().calendars()
            if component in calendar.get_supported_components()
        ]

    try:
        return await hass.async_add_executor_job(_get_calendars)
    except (*_TRANSIENT_ERRORS, DAVError) as err:
        raise PlatformNotReady(f"Unable to load CalDAV calendars: {err}") from err


def get_attr_value(obj: caldav.CalendarObjectResource, attribute: str) -> str | None:
    """Return the value of the CalDav object attribute if defined."""
    if hasattr(obj, attribute):
        return getattr(obj, attribute).value
    return None
