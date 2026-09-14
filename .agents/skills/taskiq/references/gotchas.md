# Gotchas

## The worker silently discovers zero tasks unless you import the module that defines them

Pointing `taskiq worker` at `worker.py` (`api.worker:broker`)
only imports `worker.py` itself — it does **not** automatically import
anything under `tasks/`. `@broker.task` registers a task with the
broker *as a side effect of importing the module that defines it* — if
nothing ever imports `tasks/example.py`, `add` never gets registered,
even though the file is right there in the project.

The failure mode is quiet: the worker process starts up cleanly, prints
a normal-looking banner, and reports it knows about zero tasks (or logs
"task not found" the moment you try to enqueue one) — nothing crashes,
nothing raises at import time. `pytest` and `ast.parse()`/static
analysis see the file just fine (it's syntactically valid Python that
imports cleanly on its own), so **only actually booting a real worker
process surfaces this** — it's easy to ship a task that looks completely
fine in review and in CI, and silently never runs.

The fix: `worker.py` imports each `tasks/` module itself, at the
**bottom** of the file, after `broker` is already constructed:

```python
# worker.py
from taskiq_redis import ListQueueBroker

from api.core.config import settings

broker = ListQueueBroker(url=settings.redis_url)

# Imported last, after `broker` exists: every module in tasks/ needs
# `broker` to register its `@broker.task`-decorated functions, and the
# worker process only discovers those tasks by importing the module that
# defines them — so every new tasks/ module goes on a line here too.
from api.tasks import example  # noqa: E402,F401
```

Two details that matter, not just style:

- **It has to be at the bottom, not the top.** `tasks/example.py` itself
  does `from api.worker import broker` — it needs
  `broker` to already exist to decorate its functions with
  `@broker.task`. If `worker.py` imported `tasks/example` before
  constructing `broker`, that would be a circular import (`worker.py`
  → `tasks/example.py` → `worker.py`, which hasn't finished defining
  `broker` yet). Constructing `broker` first, then importing the task
  modules, breaks the cycle.
- **A single `from api.tasks import *` is not enough.**
  Importing the `tasks` package doesn't automatically import its
  submodules — `example.py` only gets imported (and its `@broker.task`
  decorator only runs) if something imports `api.tasks.example` specifically. `tasks/__init__.py` is empty in this
  project on purpose; each task module needs its own explicit import
  line at the bottom of `worker.py`.

**If you add a new file under `tasks/`, add its import to the bottom of
`worker.py` in the same change.** It's easy to add the task, wire an
endpoint to call `.kiq(...)` on it, see the endpoint return a task ID
successfully (enqueuing doesn't require the worker to know the task —
only *running* it does), and only discover the missing import when the
task never actually completes. This project's `scheduler.py` reuses the
exact same discovery mechanism for scheduled jobs (via
`LabelScheduleSource`, see `worker.py`'s import list) — a scheduled task
that's missing from that same import list won't run either, for the
identical reason.

## `broker.startup()`/`broker.shutdown()` must not run twice

`worker.py`'s `broker` object is imported by both the API process and
the worker process — the worker process (`taskiq worker ...`) manages
its own connection lifecycle internally. That's why `main.py`'s
`lifespan` guards the call:

```python
if not broker.is_worker_process:
    await broker.startup()
...
if not broker.is_worker_process:
    await broker.shutdown()
```

Removing the guard doesn't break the API process (it's the same
process either way), but it's there because `broker` is a shared
module-level object — don't assume it's safe to call `broker.startup()`
unconditionally just because it works in the process you're testing in.

## Task discovery isn't a database/migrations problem, don't chase the wrong lead

A "task not found" error at enqueue-or-run time looks superficially
like a serialization or connectivity issue (wrong broker URL, backend
down). Check the obvious things first, but if the broker connection is
otherwise fine (the API process's `.kiq()` call succeeds and returns a
task ID), the missing import at the bottom of `worker.py` is the far
more common cause in this project's setup — check that before anything
broker-specific.

## An idle worker can crash on a Redis client read timeout, not a real outage

`ListQueueBroker.listen()` issues a blocking `BRPOP` with no
server-side timeout (it's meant to wait indefinitely for the next
task), but `redis-py`'s client defaults `socket_timeout` to 5 seconds.
Left at that default, the client itself raises a `TimeoutError` the
moment a poll goes 5s without a new task — and since `listen()` only
catches `ConnectionError`, that crashes the worker process outright
(taskiq's process manager then respawns it, so it looks like a brief,
repeating restart rather than a hard failure). This project's
`worker.py` passes `socket_timeout=None` to `ListQueueBroker` for
exactly this reason — if you ever construct a broker/result-backend
without going through the existing `broker`/`RedisAsyncResultBackend`
setup, carry that setting over, or you'll see this the moment the
queue sits idle for more than a few seconds.
