---
name: pytest
description: Fixtures, async test setup (pytest-asyncio), the isolated-test-database pattern, and parametrize — how this project's test suite is built and how to extend it. Use when adding a test, writing a fixture, debugging an async fixture that hands back a coroutine instead of a value, or a test that only fails depending on what ran before it.
---

# pytest

Every generated project's test suite runs on pytest (`uv run pytest`),
regardless of which ORM or worker was chosen. This skill covers pytest
itself — fixtures, async test setup, the isolated-test-database
pattern, parametrize — the parts that are the same shape across this
project no matter what you're testing. For how `client` actually talks
to the FastAPI app in-process (`ASGITransport`, why `lifespan` doesn't
run during tests), see the `fastapi` skill's `guides/testing.md`
instead of this one.

## When to reach for this

- Adding a new test for an endpoint and unsure how many
  test functions it should be, or what to assert.
- Writing a fixture — shared setup/teardown more than one test needs.
- An async fixture is behaving strangely — e.g. the value your test
  receives looks like a coroutine object instead of the thing the
  fixture was supposed to build (see `references/gotchas.md`).
- A test only fails when run after another one, or only when the whole
  file runs together but not alone — almost always a shared-state /
  fixture-scope issue (see `references/gotchas.md`).
- The same test logic needs to run against several inputs (e.g. several
  invalid payloads that should all 422) — see `guides/parametrize.md`
  before writing near-duplicate test functions.

## Quick reference

- **Run it**: `uv run pytest` (`-k <expr>` to filter by test name, `-x`
  to stop at the first failure, `-v` for per-test output).
- **Config**: `[tool.pytest.ini_options]` in `pyproject.toml` sets
  `pythonpath = ["src"]`, so tests can `import api`
  without installing the package first, and
  `asyncio_mode = "auto"`, so an `async def test_...` function is
  automatically treated as an asyncio test — no
  `@pytest.mark.asyncio` needed on every one.
- **Async, because the client is async**: tests that hit the app are
  `async def test_...(client)` — the `client` fixture is an
  `httpx.AsyncClient`, and only `async def` functions can `await` its
  calls. This is also why fixtures that build async resources (the test
  database engine, the client itself) are `@pytest_asyncio.fixture`,
  not the plain `@pytest.fixture` — see `references/gotchas.md` for
  what happens if you mix those up.
- **Fixtures live in `tests/conftest.py`** — an async `client`
  fixture plus an autouse `_prepare_database` fixture that resets the
  schema around every test. Both exist to deliver the same
  guarantee: every test runs against an isolated database, never the
  one configured in `.env`. See `references/database-isolation.md`.

## Go deeper

- `references/database-isolation.md` — the isolated-test-database
  guarantee: why it's a hard requirement (not a convenience), and how
  this project's fixtures deliver it.
- `references/gotchas.md` — the plain-`@pytest.fixture`-on-an-`async def`
  mistake, and how fixture scope controls whether database state leaks
  between tests.
- `guides/writing-a-good-test.md` — one test per behavior, asserting
  status code *and* response body shape, once the endpoint itself
  exists (see the `fastapi` skill's
`guides/add-an-endpoint.md` for the
  routing/schema half).
- `guides/parametrize.md` — testing the same logic against multiple
  inputs without copy-pasting near-identical test functions.
