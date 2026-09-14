# How FastAPI code reaches for `settings`

Every consumer imports the same module-level singleton:

```python
from api.core.config import settings
```

## FastAPI: `settings` is used directly, everywhere

FastAPI never wraps `settings` in anything — every consumer just
imports the object and reads attributes off it:

- `main.py` builds the app from it directly:
  `app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)`.
- `core/db.py` builds the engine from it:
  `engine = create_async_engine(settings.database_url, echo=settings.debug)`.
- `alembic/env.py` reads `settings.database_url` too, so migrations
  always target the same database the app itself would connect to —
  never a second, hand-copied connection string.

There's no framework-level indirection to work around: if you need a
config value in a new module, import `settings` the same way and read
the attribute. Nothing here is request-scoped or needs `Depends()` —
see the `fastapi` skill's notes on why `Depends()` is for per-request
values, not app-lifetime singletons like this one.
