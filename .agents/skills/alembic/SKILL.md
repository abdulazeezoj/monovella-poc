---
name: alembic
description: Generating, reviewing, and applying database migrations with Alembic for this project's sqlmodel models. Use when a model changes, when setting up the database for the first time, or when autogenerate produces something surprising (empty migration, missing table, import error).
---

# Alembic

This project's schema is versioned with Alembic. The
SQLModel models in
`src/api/models.py` are the source of truth, and every
schema change is captured as a migration file under `alembic/versions/`
before it's applied to any database. This skill covers how *this
project's* Alembic setup works — its `env.py` is generated, not the
library's own default template, and it has two real, project-specific
gotchas (below) that are easy to hit and non-obvious to diagnose.


## When to reach for this

- You changed a model in `src/api/models.py` (added a
  table, a column, an index, a constraint) and need a migration for it.
- You're setting up the database for the first time on a fresh checkout
  or a fresh environment (see `guides/first-migration.md`).
- `alembic revision --autogenerate` produced an empty migration, an
  import error, or a migration that doesn't match the model change you
  expected — see `references/gotchas.md` before assuming Alembic is
  broken; it's almost always one of the two issues documented there.
- You need to roll back a bad migration, or check what's already been
  applied.

## Quick reference

- **Config**: `alembic.ini` (repo root) + `alembic/env.py`. `env.py` is
  wired to this project already — it imports `settings.database_url` and
  the model metadata
  (`SQLModel.metadata`)
  from `src/api/models.py`, so autogenerate can see both
  the target database and the target schema without extra setup.
- **Generate a migration**: `uv run alembic revision --autogenerate -m
  "describe your change"` — diffs the models against the last-known
  schema state and writes a new file to `alembic/versions/`. **Always
  read the generated file before applying it** — see
  `guides/reading-a-migration.md`; autogenerate is good but not perfect.
- **Apply migrations**: `uv run alembic upgrade head` — runs every
  migration newer than the database's current revision, in order.
- **Roll back one step**: `uv run alembic downgrade -1`.
- **See the chain**: `uv run alembic history` (all revisions) /
  `uv run alembic current` (what the database is actually on).
- **First time on a fresh database**: both generate-and-apply commands,
  once, before starting the app — see `guides/first-migration.md`.
- **Async under the hood**: this project's `env.py` runs migrations
  through an async engine (`create_async_engine`, wrapped in
  `asyncio.run(...)` inside `env.py` itself) so the `alembic` CLI
  commands above work unchanged — you never invoke `asyncio` yourself,
  Alembic's own CLI is still sync from your side.

## Go deeper

- `references/gotchas.md` — the two real, project-specific ways this
  breaks: `src/`-layout imports, and application code creating tables
  outside migration history.
- `references/env-and-config.md` — what `alembic.ini` and `env.py`
  actually do in this project, and how they differ from Alembic's own
  default template.
- `guides/first-migration.md` — the exact two commands to run before
  starting the app for the first time on a fresh database.
- `guides/reading-a-migration.md` — what a generated migration file
  looks like, so you can sanity-check one before applying it.
