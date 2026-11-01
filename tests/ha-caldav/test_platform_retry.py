"""Regression test: loading calendars must raise PlatformNotReady on network errors.

calendar.py and todo.py both call api.async_get_calendars() from their platform
setup. A network failure there (e.g. DNS not ready right after boot) that is not
converted to PlatformNotReady leaves the platform without entities and Home
Assistant never retries it.

Stubs homeassistant/caldav/niquests/requests; needs Python >= 3.10.

Usage: python3 -I tests/ha-caldav/test_platform_retry.py [path/to/api.py]
   or: docker exec -i <ha> python3 -I - <path/to/api.py> < tests/ha-caldav/test_platform_retry.py
"""

import asyncio
import importlib.util
import sys
import types
from pathlib import Path


class PlatformNotReady(Exception):
    pass


class DAVError(Exception):
    pass


class RequestsConnectionError(Exception):
    pass


class RequestsTimeout(Exception):
    pass


class NiquestsConnectionError(Exception):
    """Mirrors niquests.exceptions.ConnectionError: unrelated to requests'."""


class NiquestsTimeout(Exception):
    pass


def _module(name, **attrs):
    mod = types.ModuleType(name)
    mod.__dict__.update(attrs)
    sys.modules[name] = mod
    return mod


class _Calendar:
    def __init__(self, name, components):
        self.name = name
        self._components = components

    def get_supported_components(self):
        return self._components


class _Principal:
    error = None
    calendars_result = []

    def calendars(self):
        if _Principal.error is not None:
            raise _Principal.error
        return _Principal.calendars_result


class _Client:
    def principal(self):
        return _Principal()


class _Hass:
    async def async_add_executor_job(self, fn, *args):
        return fn(*args)


def _install_stubs(with_niquests=True):
    for name in list(sys.modules):
        if name.split(".")[0] in {"caldav", "requests", "niquests", "homeassistant"}:
            del sys.modules[name]
    _module("caldav", DAVClient=_Client, Calendar=_Calendar, CalendarObjectResource=object)
    _module("caldav.lib")
    _module("caldav.lib.error", DAVError=DAVError)
    _module("requests", ConnectionError=RequestsConnectionError, Timeout=RequestsTimeout)
    if with_niquests:
        _module("niquests", ConnectionError=NiquestsConnectionError, Timeout=NiquestsTimeout)
    _module("homeassistant")
    _module("homeassistant.core", HomeAssistant=object)
    _module("homeassistant.exceptions", PlatformNotReady=PlatformNotReady)


def _load(path):
    spec = importlib.util.spec_from_file_location("api_under_test", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _get(mod):
    return asyncio.run(mod.async_get_calendars(_Hass(), _Client(), "VEVENT"))


def main(path):
    failures = []

    def expect_not_ready(label, error, with_niquests=True):
        _install_stubs(with_niquests)
        _Principal.error = error
        mod = _load(path)
        try:
            _get(mod)
        except PlatformNotReady:
            print(f"ok   {label}")
        except Exception as exc:  # noqa: BLE001 - report any other outcome
            failures.append(label)
            print(f"FAIL {label}: raised {type(exc).__name__} (platform gets no entities, no retry)")
        else:
            failures.append(label)
            print(f"FAIL {label}: no exception")

    expect_not_ready("niquests ConnectionError (DNS failure) -> retry", NiquestsConnectionError("dns"))
    expect_not_ready("niquests Timeout -> retry", NiquestsTimeout("t"))
    expect_not_ready("requests ConnectionError -> retry", RequestsConnectionError("c"))
    expect_not_ready("requests Timeout -> retry", RequestsTimeout("t"))
    expect_not_ready("DAVError -> retry", DAVError("d"))
    expect_not_ready("requests error with niquests absent -> retry", RequestsConnectionError("c"), with_niquests=False)

    # Unrelated programming errors must still surface, not be swallowed as a retry.
    _install_stubs()
    _Principal.error = ValueError("bug")
    mod = _load(path)
    try:
        _get(mod)
        failures.append("valueerror")
        print("FAIL ValueError was swallowed")
    except ValueError:
        print("ok   unrelated ValueError still propagates")
    except PlatformNotReady:
        failures.append("valueerror")
        print("FAIL ValueError was turned into PlatformNotReady")

    # Healthy path: only calendars supporting the component are returned.
    _install_stubs()
    _Principal.error = None
    _Principal.calendars_result = [_Calendar("events", ["VEVENT"]), _Calendar("tasks", ["VTODO"])]
    mod = _load(path)
    names = [c.name for c in _get(mod)]
    if names == ["events"]:
        print("ok   healthy server -> filtered calendars returned")
    else:
        failures.append("healthy")
        print(f"FAIL healthy path returned {names}")

    if failures:
        print(f"\n{len(failures)} failure(s)")
        sys.exit(1)
    print("\nall passed")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        main(Path(sys.argv[1]))
    else:
        main(Path(__file__).resolve().parents[2] / "ha-overrides/caldav/api.py")
