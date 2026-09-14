# Redis operations

The commands this project's caching use case actually reaches for —
not the full `redis-py` API. All of these exist on `redis_client` from
`src/api/core/redis.py`.
Every call below is a coroutine — `await` it. `redis_client` is a
module-level `redis.asyncio.Redis`, safe to import and call from any
`async def` route handler.

## Reading a cached value

```python
cached = await redis_client.get("items:all")
if cached is not None:
    return json.loads(cached)
```

`get` returns `None` on a miss (key absent or expired) — because the
client is built with `decode_responses=True`, a hit comes back as a
`str`, never `bytes`. This project stores structured values as JSON
text, so a hit still needs `json.loads`; the client itself does no
serialization for you.

## Writing a value with a TTL

Caching without an expiry is how a cache turns into a second,
never-updated database. Set one on every cache write:

```python
await redis_client.set("items:all", json.dumps(payload), ex=60)
```

`set(..., ex=<seconds>)` is the form used in this project's guide —
`ex` takes an `int` number of seconds. `setex(name, time, value)` is
the equivalent older-style call (same effect, argument order swapped:
time before value) if you prefer it; either is fine, but be consistent
within one module rather than mixing both styles.

## Invalidating a key

```python
await redis_client.delete("items:all")
```

`delete` accepts one or more key names and is a no-op (returns `0`,
doesn't raise) if the key doesn't exist — safe to call unconditionally
from a create/update/delete handler even if nothing was cached yet.
See `guides/add-caching-to-an-endpoint.md` for where this actually goes
in a handler, and `references/gotchas.md` for why forgetting this step
is the most common caching bug.

## Key naming

This project doesn't enforce a naming scheme, but pick one and stick to
it — `"<resource>:<qualifier>"` (`"items:all"`, `"items:{id}"`) reads
clearly and keeps invalidation predictable: you always know which key
a given write needs to clear.
