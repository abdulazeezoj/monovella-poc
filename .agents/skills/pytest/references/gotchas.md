# Gotchas

Real failure modes worth knowing before you hit them, not hypothetical
edge cases.

## Forgetting `@pytest_asyncio.fixture` on an async fixture

`tests/conftest.py`'s fixtures are `async def` and decorated with
`@pytest_asyncio.fixture`, not the plain `@pytest.fixture`:

```python
@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
```

If you add a new async fixture of your own (say, one that creates a
test user via an async database call) and decorate it with the plain
`@pytest.fixture` instead, you get one of two confusing outcomes
depending on plugin configuration: either an explicit error telling you
async fixtures aren't natively supported by plain `@pytest.fixture`, or
— more dangerously — the fixture silently "succeeds" but hands your
test the **unawaited coroutine object itself**, not the value the
fixture was supposed to build. A test that depends on it then fails
with an unrelated-looking error (e.g. an `AttributeError` on a
coroutine object where you expected a client or a model instance),
nowhere near the actual mistake.

This project sets `asyncio_mode = "auto"` in `pyproject.toml`, which
lets `async def test_...` *functions* skip an explicit
`@pytest.mark.asyncio` marker — but it does not change what a *fixture*
needs. Always pair an `async def` fixture body with `@pytest_asyncio.fixture`
explicitly, the same way `tests/conftest.py`'s `client` and
`_prepare_database` fixtures do.

## Fixture scope controls whether database state leaks between tests

`_prepare_database` is `@pytest_asyncio.fixture(autouse=True)` with the
default (function) scope — no test even names it as a parameter, it
just runs automatically before *and after every single test*,
recreating the schema each time and dropping it again once the test
finishes:

```python
@pytest_asyncio.fixture(autouse=True)
async def _prepare_database() -> AsyncGenerator[None, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
```

The per-test `drop_all` is what makes tests order-independent: test B
never sees rows test A inserted. If you change this fixture's `scope`
to `"module"` or `"session"` — e.g. to avoid rebuilding the schema
repeatedly — `create_all`/`drop_all` then only run once for the whole
module/session, and every test in that scope starts sharing one live
copy of the tables. The symptom is a test that only fails once you add
a second, unrelated test to the same file, or that passes alone but
fails as part of the full suite — a count assertion like
`len(list_response.json()) == 1` is exactly what breaks first, since
now it also counts rows an earlier test left behind. Keep this fixture
function-scoped (the default — don't add a `scope=` argument at all)
unless you have a specific reason and are prepared to reset state by
hand.
