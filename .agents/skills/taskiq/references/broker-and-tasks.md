# Broker & tasks

## The broker object

`src/api/worker.py` builds one module-level `broker` —
this is the object every other piece of Taskiq code (task decorators,
the worker CLI, the API's enqueue calls) refers back to:

```python
from taskiq_redis import ListQueueBroker

from api.core.config import settings

broker = ListQueueBroker(url=settings.redis_url)
```

Redis was the chosen broker for this project. `settings.redis_url`
comes from `core/config.py` (default `redis://localhost:6379/0`,
overridable via `REDIS_URL` in `.env`). Needs a Redis server reachable
at that URL — Taskiq only needs it as a transport (a list-backed queue
here); don't confuse this with the separate `redis` skill's caching use
of Redis, even though they may point at the same server.

Whichever broker, treat it as a plain transport choice: task code
(`tasks/*.py`) never imports `taskiq_redis` directly,
only `broker` from `worker.py`. Swapping brokers later is a `worker.py`
+ `pyproject.toml` + `.env` change, not a `tasks/` rewrite.

## Defining a task

Every task is a plain `async def` function, decorated `@broker.task`,
living under `src/api/tasks/`:

```python
# tasks/example.py
from api.worker import broker


@broker.task
async def add(a: int, b: int) -> int:
    return a + b
```

The import direction matters: `tasks/example.py` imports `broker` from
`worker.py`, never the other way around at module *top* — see
`references/gotchas.md` for why `worker.py`'s own import of this module
has to happen at the bottom of the file instead.

## Calling a task: inline vs. enqueued

`@broker.task` doesn't replace the function — it wraps it so it's
callable two ways, and picking the right one matters:

- **`await add(1, 2)`** — calls the plain function body directly, in
  whichever process runs this line, synchronously with the rest of that
  code path. No broker round-trip, no worker process involved. This is
  what you want in a unit test that just checks the function's logic,
  or anywhere you deliberately want the work done inline.
- **`await add.kiq(1, 2)`** — serializes the call and pushes it onto the
  broker's queue, returning a `TaskiqTask` immediately (not the
  result). Some other process — a `taskiq worker` process — picks it up
  off the queue and actually runs it, on its own schedule, in its own
  process. This is what `main.py`'s `/tasks/add` endpoint does:

  ```python
  @app.post("/tasks/add")
  async def enqueue_add(a: int, b: int) -> dict[str, str]:
      task = await add.kiq(a, b)
      return {"task_id": task.task_id}
  ```

  The handler returns as soon as the task is *queued*, not once it's
  *done* — that's the entire point of a worker: slow or bursty work
  doesn't hold an HTTP response open. If you do need the result back in
  the same request (rare — usually a sign the work belongs inline
  instead), `TaskiqTask` supports awaiting its result via the result
  backend; don't reach for this by default, it re-couples the request
  to the worker's latency.

## The two-process model

- **API process** — `fastapi dev`/`fastapi run`. Handles HTTP, enqueues
  tasks via `.kiq(...)`. Never executes a task's body itself.
- **Worker process** — `uv run taskiq worker api.worker:broker
  --app-dir src`, run separately (its own terminal, its own container in
  a real deployment). Pulls queued tasks off the broker and actually
  runs them.

These are independent processes sharing nothing but the broker
connection (and, indirectly, the same `worker.py` module, imported by
both). Restarting the API process doesn't affect in-flight or queued
tasks; a worker crash doesn't affect the API's ability to keep
enqueueing (tasks just pile up on the broker until a worker comes back).

## Tests don't start a worker

Following this project's FastAPI testing convention (see the `fastapi`
skill's `guides/testing.md`), the test suite drives the app via
`ASGITransport` without triggering `lifespan` — so `broker.startup()`
never runs during `uv run pytest` for the unit/integration tiers, and
there's no worker process picking anything off the queue there either.
Call a task function directly (`await add(1, 2)`) to test its logic in
those tiers; don't call `.kiq(...)` expecting the task to actually run
unless you're in `tests/e2e/`, which explicitly starts a real worker
subprocess and calls `broker.startup()` itself for exactly this purpose
(see `tests/e2e/conftest.py`).
