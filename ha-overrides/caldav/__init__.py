"""The caldav component."""

import logging

import caldav
from caldav.lib.error import AuthorizationError, DAVError
import requests

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    CONF_PASSWORD,
    CONF_URL,
    CONF_USERNAME,
    CONF_VERIFY_SSL,
    Platform,
)
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady

try:
    # Newer caldav releases use niquests instead of requests, so their network
    # errors do not derive from the requests exception classes.
    import niquests
except ImportError:  # older caldav releases that still use requests
    niquests = None

type CalDavConfigEntry = ConfigEntry[caldav.DAVClient]

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.CALENDAR, Platform.TODO]

# Transient network failures (DNS not ready at boot, connection refused,
# timeouts) must become ConfigEntryNotReady so Home Assistant retries the setup.
# Any other exception leaves the entry in SETUP_ERROR until a manual reload.
_TRANSIENT_ERRORS: tuple[type[Exception], ...] = (
    requests.ConnectionError,
    requests.Timeout,
)
if niquests is not None:
    _TRANSIENT_ERRORS += (niquests.ConnectionError, niquests.Timeout)


async def async_setup_entry(hass: HomeAssistant, entry: CalDavConfigEntry) -> bool:
    """Set up CalDAV from a config entry."""
    client = caldav.DAVClient(
        entry.data[CONF_URL],
        username=entry.data[CONF_USERNAME],
        password=entry.data[CONF_PASSWORD],
        ssl_verify_cert=entry.data[CONF_VERIFY_SSL],
        # Local override (custom_components/caldav): upstream HA core hardcodes
        # timeout=30, which is too short for iCloud's CalDAV REPORT requests
        # (search with expand=True), independently documented to sometimes take
        # 30-60+ seconds to respond (home-assistant/core#108915,
        # ivenos/ha_caldav#2, omnideck-dev/omnideck#180). Raised to 120s to match
        # the community-validated fix. See .planning/debug/resolved/icloud-caldav-timeout.md
        timeout=120,
    )
    try:
        await hass.async_add_executor_job(client.principal)
    except AuthorizationError as err:
        if err.reason == "Unauthorized":
            raise ConfigEntryAuthFailed("Credentials error from CalDAV server") from err
        # AuthorizationError can be raised if the url is incorrect or
        # on some other unexpected server response.
        _LOGGER.warning("Unexpected CalDAV server response: %s", err)
        return False
    except _TRANSIENT_ERRORS as err:
        raise ConfigEntryNotReady("Connection error from CalDAV server") from err
    except DAVError as err:
        raise ConfigEntryNotReady("CalDAV client error") from err

    entry.runtime_data = client

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
