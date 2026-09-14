# The isolated-test-database guarantee

## The rule

Every test in this suite runs against an isolated, in-memory SQLite
database — never whatever `DATABASE_URL` is configured in `.env`, and
never a database shared across test runs. This holds regardless of
which database (`postgres`) or ORM this project was generated
with; the test database is always SQLite-in-memory, chosen for tests
specifically because it needs no external process.

## Why this is a hard guarantee, not a convenience

- **`pytest` must run with zero external services.** CI shouldn't need
  to spin up a Postgres container (or anything else) just to run the
  test suite, and neither should a fresh local checkout — `uv run
  pytest` has to work the moment dependencies are installed.
- **A broken `.env` must never break the test suite.** An unset,
  malformed, or accidentally-pointed-at-production `DATABASE_URL` is a
  real-world mistake someone will eventually make. If tests read that
  value, that mistake either breaks `pytest` for everyone until it's
  fixed, or — far worse — silently runs the test suite's create/delete
  cycle against a real database. The fixtures never read `DATABASE_URL`
  at all, specifically to make that failure mode impossible.
- **Every test starts from a known-empty schema.** Without this, test
  order matters — a test's outcome could depend on what an earlier test
  happened to insert, which is the single most common source of a
  "flaky" suite that fails only sometimes, or only in CI, or only after
  someone adds an unrelated test to the same file.

## How the fixtures deliver it
`tests/conftest.py` builds its own engine, pointed at an in-memory
SQLite database, at *import time* — before any test runs:

```python
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
```

`poolclass=StaticPool` matters specifically for the in-memory case:
SQLite's `:memory:` database lives only as long as the connection that
created it, so without `StaticPool` forcing every checkout to reuse the
*same* underlying connection, a second query could open a second
connection and see a brand-new, empty database instead of the one the
first query populated.

The app's real dependency is then swapped for one that yields sessions
from this test engine instead:

```python
app.dependency_overrides[get_session] = _override_get_session
```

This override is also set once, at import time — it's global for the
whole test module. What resets *per test* is the schema itself, via an
autouse fixture:

```python
@pytest_asyncio.fixture(autouse=True)
async def _prepare_database() -> AsyncGenerator[None, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)
```

`autouse=True` means every test gets this without asking for it by
name. Its default (function) scope means "before and after *every
single test*" — tables are created fresh, the test runs, then the
tables are dropped again. See `references/gotchas.md` for what breaks
if that scope is widened.

Note that this schema comes from `create_all`/`drop_all` directly, not
from `init_db()` — `init_db()` is never called during tests at all
(FastAPI's `lifespan` doesn't run under `ASGITransport` by default; see
the `fastapi` skill's `guides/testing.md`).
