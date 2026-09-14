# `alembic.ini` and `env.py` in this project

Both files are generated specifically for this project, not left as
Alembic's own default template (`alembic init`'s scaffold) — a couple of
things are wired up ahead of time that you'd otherwise have to do by
hand.

## `alembic.ini`

```ini
[alembic]
script_location = alembic
prepend_sys_path = src
```

Two things worth knowing:

- `script_location = alembic` — migration files live in
  `alembic/versions/`, and `alembic/script.py.mako` is the template new
  revision files are generated from (rarely worth touching).
- `prepend_sys_path = src` — required for this project's `src/` layout.
  See `references/gotchas.md` for exactly what breaks without it. Note
  there is deliberately **no `sqlalchemy.url = ...` line** in this
  file — the database URL comes from `settings.database_url` at runtime
  instead (see below), so there's exactly one place a database URL is
  configured (`.env` / `core/config.py`), not two that can drift apart.

## `alembic/env.py`

The database URL and the target schema are both wired to this project's
own code, not left as placeholders:

```python
from api.core.config import settings
from api.models import Item  # noqa: F401 - registers metadata

config = context.config
target_metadata = SQLModel.metadata
config.set_main_option("sqlalchemy.url", settings.database_url)
```

- Importing `Item` (or any other model) isn't decorative, even though
  nothing in `env.py` appears to use it directly — the import is what
  registers the model's table on
  `SQLModel.metadata`.
  If you add a new model in a module `env.py` doesn't import (directly
  or transitively through `models.py`), autogenerate silently won't see
  it — it can only diff tables it knows about. Keep every model reachable
  from `src/api/models.py` so this one import continues to
  cover all of them.
- `settings.database_url` is the same setting the running app itself
  uses (`core/config.py`) — migrations always target whatever database
  the app is actually configured against, dev or prod, with no separate
  "migrations database" to keep in sync.

### Async engine, sync CLI

This project's database access is async
(`sqlmodel.ext.asyncio.session.AsyncSession`),
so `env.py`'s "online" migration path uses an async engine too, wrapped
so the `alembic` CLI (itself sync) can still drive it:

```python
async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

`connection.run_sync(do_run_migrations)` is the bridge: Alembic's actual
migration-running machinery (`context.configure(...)`,
`context.run_migrations()`) is sync internally, so it runs inside
`run_sync` against the async connection rather than being ported to
async itself. You never need to touch this — it's what makes
`uv run alembic upgrade head` work as a plain synchronous-looking
command even though the app underneath is fully async. `poolclass=
pool.NullPool` matters too: a migration run is short-lived and one-shot,
so there's no reason to keep a connection pool alive around it.

### Offline mode

`run_migrations_offline()` (the `alembic upgrade head --sql` path,
emitting SQL instead of running it) is included but rarely used day to
day in this project — it's there because it's part of Alembic's standard
template, not because this project's workflow depends on it. The normal
workflow (`revision --autogenerate` then `upgrade head`) always goes
through `run_migrations_online()`.
