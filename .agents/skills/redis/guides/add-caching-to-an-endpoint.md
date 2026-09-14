# Guide: add caching to an endpoint

Caches the `GET /items/` list response and invalidates it on write,
using the existing `items` resource in
`src/api/routes/items.py`.
Follow the same shape for any other resource you decide to cache.

## Before

```python
from fastapi import APIRouter, HTTPException

from api.schemas import ItemCreate, ItemRead

router = APIRouter(prefix="/items", tags=["items"])

_items: dict[int, ItemRead] = {}
_next_id = 1


@router.get("/", response_model=list[ItemRead])
def list_items() -> list[ItemRead]:
    return list(_items.values())


@router.post("/", response_model=ItemRead, status_code=201)
def create_item(item: ItemCreate) -> ItemRead:
    global _next_id
    created = ItemRead(id=_next_id, **item.model_dump())
    _items[_next_id] = created
    _next_id += 1
    return created
```

## After

Import `redis_client`, `get` the cache key before doing the real
lookup, `set` it with a TTL on a miss, and `delete` it in every handler
that changes `items`.

```python
import json

from fastapi import APIRouter, HTTPException

from api.core.redis import redis_client
from api.schemas import ItemCreate, ItemRead

router = APIRouter(prefix="/items", tags=["items"])

_items: dict[int, ItemRead] = {}
_next_id = 1

_CACHE_KEY = "items:all"


@router.get("/", response_model=list[ItemRead])
async def list_items() -> list[ItemRead]:
    cached = await redis_client.get(_CACHE_KEY)
    if cached is not None:
        return [ItemRead.model_validate(item) for item in json.loads(cached)]

    items = list(_items.values())
    await redis_client.set(
        _CACHE_KEY, json.dumps([item.model_dump() for item in items]), ex=60
    )
    return items


@router.post("/", response_model=ItemRead, status_code=201)
async def create_item(item: ItemCreate) -> ItemRead:
    global _next_id
    created = ItemRead(id=_next_id, **item.model_dump())
    _items[_next_id] = created
    _next_id += 1
    await redis_client.delete(_CACHE_KEY)  # stale list cache — clear it
    return created
```

`list_items` becomes `async def` the moment it awaits `redis_client`
(see the `fastapi` skill's sync-vs-async rule) — even the in-memory
store version, once caching is added, has real I/O in it now.

## Do the same for update and delete

`create_item` above is the only write handler this project ships by
default, but `update_item`/`delete_item` — if you add them, or on any
other resource you cache — need the exact same `redis_client.delete(...)`
call before returning. Missing one is what "silently serving stale
data" looks like in practice: no error, no log line, just an endpoint
that stops reflecting reality until the TTL runs out. See
`references/gotchas.md` for why this project doesn't try to automate it
for you.
