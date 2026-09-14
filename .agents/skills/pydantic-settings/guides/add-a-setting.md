# Guide: add a new setting

Walks through adding a `SMTP_HOST` setting end-to-end, following the
same shape as the existing `app_name`/`debug` fields — copy that shape
for any new setting rather than inventing a new way to read
configuration.

## 1. Add the field to `Settings`

In `src/api/core/config.py`:

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "api"
    debug: bool = False
    smtp_host: str = "localhost"
```

Give it a sensible default whenever one exists (as above) so the app
still boots with no `.env` present. Only leave a field with **no**
default when the app genuinely cannot run without it (e.g. a required
third-party API key) — that turns a missing env var into a startup
`ValidationError` naming the field, instead of a `None` surfacing
confusingly later (see `references/settings-and-env.md`).

## 2. Add the matching line to `env.jinja`

In `env.jinja` (next to `config.py.jinja`, under this template's
`files/` layer):

```
APP_NAME="api"
DEBUG=false
SMTP_HOST=localhost
```

The env var name is the field name upper-cased
(`smtp_host` ↔ `SMTP_HOST`) — no need to add anything to
`config.py`'s `model_config` for this to work, `BaseSettings` maps it
automatically. This is the only file that needs the new line: brupy's
generator mirrors whatever `env.jinja` renders to into **both** `.env`
and `.env.example` automatically (see `references/settings-and-env.md`)
— don't hand-edit an already-generated `.env.example` separately, and
don't add the field to one without the other, since after generation
there's no automatic sync between `Settings` and either file.

## 3. Reference it wherever it's needed

```python
from api.core.config import settings

...settings.smtp_host...
```

Import `settings` directly in the new module — don't thread the value
through as a constructor argument or re-read the environment yourself.

## 4. Sanity-check it

Re-run the app (or `uv run pytest`, or `python -c "from api.core.config import settings; print(settings.smtp_host)"`) — if the
field has no default and the env var is genuinely missing, this is
where you'll see the `ValidationError` immediately, before any request
handler runs.
