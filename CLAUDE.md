# CLAUDE.md

Calendar Card Pro, iOS 12.5.8 edition: a dependency-free vanilla JS Home Assistant card that
runs on old Safari. Fork of alexpfau/calendar-card-pro.

## What ships

- The released card is `dist/calendar-card-pro.js`, a **straight copy of `src-lite/calendar-card-pro.js`**
  made by `npm run build:lite` (copy + `scripts/verify-bundle.sh`, which rejects Safari 12-incompatible syntax).
- `release.yml` runs lint + `build:lite` and attaches that file. `dist/` is committed, so after editing
  `src-lite/` run `npm run build:lite` and commit both; they must stay byte-identical.
- `src/` (TypeScript/Lit) is the original upstream code and is **not** what is released.
- `ha-overrides/` holds copies of Home Assistant custom-component fixes (see below). They are not part of the
  card bundle; they appear only in the release's source archive.

## Versioning and releases (read before tagging)

The version appears in **three** places that must agree: `package.json` `"version"`,
`CARD_VERSION` in `src-lite/calendar-card-pro.js` (shown in the card's "CCP-lite v…" debug label), and the
rebuilt `dist/calendar-card-pro.js`. `package-lock.json` is stale (`3.1.1-rc.1`) and is ignored.

**A published release's file never changes.** Tags and release assets are immutable in practice; never move,
re-create or overwrite a published tag. The tag is cut from a commit, so the version strings in that
commit are what the released card reports.

**Rule: the release tag and the card's version value must always match, to prevent confusion about which
build someone is running. For every PR, ask the user whether to increment the version (`package.json` and
`CARD_VERSION`) to match the release tag that PR will be released under. Ask before opening the PR (or
when it is raised, if the PR is already open); do not assume yes or no, and do not skip the question
because the PR looks small or only touches tests, CI or docs. Say which version it would become (the next unused
tag) and what it would affect (a bump changes the shipped `dist/` file; it does not change anything else).
If the user says no, leave the version untouched and note in the PR description that the version was
deliberately not bumped.**

Therefore the order is always:

1. Decide the version you are about to release (the next unused `vX.Y.Z-rc.N`; check `git tag --sort=version:refname`).
2. In a PR, set `package.json` and `CARD_VERSION` to **that** version, run `npm run build:lite`, commit all three files.
3. Merge the PR (use a merge commit, not a squash, so reviewed commits stay in `main`'s history).
4. Tag the **merge commit on `main`**: `git tag -a vX.Y.Z-rc.N <sha> -m vX.Y.Z-rc.N && git push origin vX.Y.Z-rc.N`.
   `release.yml` triggers on `v*` tags and marks the release as a pre-release when the tag contains
   `-rc`, `-alpha` or `-beta`.
5. Verify: the run succeeds, and `gh release download <tag> --pattern calendar-card-pro.js` shows
   `CARD_VERSION` equal to the tag.

Never tag first and bump afterwards: v3.1.3-rc.4 was released this way and its card still reports `3.1.3-rc.2`,
so a further release (rc.5) was needed to make the shipped file match. After releasing, the next change that
will be released needs the next version bump in its own PR.

Tagging, releasing, deleting tags/releases and merging PRs are outward-facing: do them only when asked.

## Tests

- `npm test`: plain Node scripts in `tests/` (they load `src-lite/` directly; no build needed). Add new test
  files to the `test` script in `package.json`, or they will not run.
- `python -I tests/ha-caldav/test_setup_retry.py` and `test_platform_retry.py`: stubbed tests for `ha-overrides/`
  (Python 3.12+; Home Assistant, `caldav` and `niquests` are stubbed, nothing to install).
- CI (`.github/workflows/ci.yml`) is expected to run lint, `npm test`, both builds and the Python tests.
- Fixtures must not depend on the real clock. The card drops cache entries older than 7 days against
  `Date.now()`, and `test-cache-status.js` silently started failing a week after its hardcoded date. Pin
  `Date.now()` in tests that use fixed dates.

## Home Assistant overrides (`ha-overrides/caldav/`)

Copies of the files in the running instance's `/config/custom_components/caldav/` (container `Home_Assistant`,
host config dir `/home/pascal/homeassistant/config`). Only `__init__.py` and `api.py` are tracked; the live
directory also has a patched `coordinator.py`/`calendar.py` (opt-in stale-while-revalidate cache) that is not vendored.

Why they exist: after an HA restart, a DNS failure while CalDAV starts left no calendar entities and nothing
retried, so the card stayed empty. The caldav library uses `niquests`, whose exceptions are not `requests`
exceptions, so network errors must be caught explicitly: `__init__.py` raises `ConfigEntryNotReady`,
`api.py` raises `PlatformNotReady`. `AuthorizationError` is deliberately not retried.

Deploying (the live system is a household instance):

- Back up the live file first (`<file>.orig-YYYYMMDD` beside it), copy the new one in, and compare `sha256sum`
  of the live file and the repo copy.
- HA keeps the old module in memory: a change takes effect only after a **container restart**. Restarting
  interrupts the whole household HA, so get explicit approval each time.
- After a restart, check `home-assistant.log` for `Error setting up entry … caldav` and
  `Error while setting up caldav platform`, and that the `calendar.*` entities exist.
- When copying the card (`dist/`) into HA's `www`, remove any stale `calendar-card-pro.js.gz` next to it: it
  shadows the new file.
