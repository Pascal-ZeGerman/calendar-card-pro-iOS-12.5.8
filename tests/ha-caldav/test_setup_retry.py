"""Regression test: CalDAV setup must raise ConfigEntryNotReady on network errors.

Runs against stubbed homeassistant/caldav/niquests modules, so it needs only a
Python >= 3.12 interpreter (the module uses the `type` statement).

Usage: python3 -I tests/ha-caldav/test_setup_retry.py [path/to/__init__.py]
"""

import asyncio
import importlib.util
import sys
import types
from pathlib import Path

DEFAULT_TARGET = Path(__file__).resolve().parents[2] / "ha-overrides/caldav/__init__.py"


class ConfigEntryNotReady(Exception):
    pass


class ConfigEntryAuthFailed(Exception):
    pass


class DAVError(Exception):
    pass


class AuthorizationError(DAVError):
    reason = "Unauthorized"


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


class _Client:
    error = None

    def __init__(self, *args, **kwargs):
        pass

    def principal(self):
        if _Client.error is not None:
            raise _Client.error


def _install_stubs(with_niquests=True):
    for name in list(sys.modules):
        if name.split(".")[0] in {"caldav", "requests", "niquests", "homeassistant"}:
            del sys.modules[name]
    _module("caldav", DAVClient=_Client)
    _module("caldav.lib")
    _module("caldav.lib.error", AuthorizationError=AuthorizationError, DAVError=DAVError)
    _module("requests", ConnectionError=RequestsConnectionError, Timeout=RequestsTimeout)
    if with_niquests:
        _module("niquests", ConnectionError=NiquestsConnectionError, Timeout=NiquestsTimeout)
    _module("homeassistant")
    _module("homeassistant.config_entries", ConfigEntry=type("ConfigEntry", (), {"__class_getitem__": classmethod(lambda c, i: c)}))
    _module(
        "homeassistant.const",
        CONF_PASSWORD="p", CONF_URL="u", CONF_USERNAME="n", CONF_VERIFY_SSL="v",
        Platform=types.SimpleNamespace(CALENDAR="calendar", TODO="todo"),
    )
    _module("homeassistant.core", HomeAssistant=object)
    _module(
        "homeassistant.exceptions",
        ConfigEntryAuthFailed=ConfigEntryAuthFailed,
        ConfigEntryNotReady=ConfigEntryNotReady,
    )


class _Hass:
    class config_entries:
        @staticmethod
        async def async_forward_entry_setups(entry, platforms):
            return None

    async def async_add_executor_job(self, fn, *args):
        return fn(*args)


class _Entry:
    data = {"u": "https://x", "n": "a", "p": "b", "v": True}


def _load(path):
    spec = importlib.util.spec_from_file_location("caldav_under_test", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _setup(mod, error):
    _Client.error = error
    hass = _Hass()
    hass.config_entries = _Hass.config_entries
    return asyncio.run(mod.async_setup_entry(hass, _Entry()))


def main(path):
    failures = []

    def expect_not_ready(label, error, with_niquests=True):
        _install_stubs(with_niquests)
        mod = _load(path)
        try:
            _setup(mod, error)
        except ConfigEntryNotReady:
            print(f"ok   {label}")
        except Exception as exc:  # noqa: BLE001 - report any other outcome
            failures.append(label)
            print(f"FAIL {label}: raised {type(exc).__name__} (entry would be SETUP_ERROR, no retry)")
        else:
            failures.append(label)
            print(f"FAIL {label}: no exception")

    expect_not_ready("niquests ConnectionError (DNS failure) -> retry", NiquestsConnectionError("dns"))
    expect_not_ready("niquests Timeout -> retry", NiquestsTimeout("t"))
    expect_not_ready("requests ConnectionError -> retry", RequestsConnectionError("c"))
    expect_not_ready("requests Timeout -> retry", RequestsTimeout("t"))
    expect_not_ready("DAVError -> retry", DAVError("d"))
    expect_not_ready("requests error with niquests absent -> retry", RequestsConnectionError("c"), with_niquests=False)

    _install_stubs()
    mod = _load(path)
    try:
        _setup(mod, AuthorizationError())
        failures.append("auth")
        print("FAIL unauthorized should raise ConfigEntryAuthFailed")
    except ConfigEntryAuthFailed:
        print("ok   unauthorized -> ConfigEntryAuthFailed (unchanged)")

    _install_stubs()
    mod = _load(path)
    assert _setup(mod, None) is True
    print("ok   healthy server -> setup succeeds")

    if failures:
        print(f"\n{len(failures)} failure(s)")
        sys.exit(1)
    print("\nall passed")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_TARGET)
