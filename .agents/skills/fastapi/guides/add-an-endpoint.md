# Guide: add a new endpoint

Walks through adding a `widgets` resource end-to-end, following the
same shape as the existing `items` resource — copy that shape for any
new resource rather than inventing a new one.

## 1. Define the schemas

In `src/api/schemas.py`, add the request/response models:

```python
class WidgetCreate(BaseModel):
    name: str
    description: str | None = None


class WidgetRead(BaseModel):
    id: int
    name: str
    description: str | None = None
    model_config = {"from_attributes": True}
```

## 2. Define the model

In `src/api/models.py`, add the ORM model (mirror the
existing `Item` model's shape — same `sqlmodel` conventions, see the
`sqlmodel` skill for the model-definition patterns this project uses).

## 3. Write the router

Create `src/api/routes/widgets.py`:

```python
from fastapi import APIRouter, HTTPException
from fastapi import Depends

from api.core.db import get_session
from api.models import Widget
from api.schemas import WidgetCreate, WidgetRead

router = APIRouter(prefix="/widgets", tags=["widgets"])


@router.get("/", response_model=list[WidgetRead])
async def list_widgets(session=Depends(get_session)) -> list[Widget]:
    ...  # same query shape as routes/items.py's list_items
```

Follow `routes/items.py` for the rest of the CRUD handlers (`POST`,
`GET /{id}`, `DELETE /{id}`) — same status codes (`201` on create,
`204` on delete, `404` via `HTTPException` when not found), same
`response_model=` on every handler.

## 4. Register the router

In `src/api/main.py`:

```python
from api.routes.widgets import router as widgets_router
...
app.include_router(widgets_router)
```

## 5. Test it

Add `tests/test_widgets.py`, mirroring `tests/test_main.py`'s fixture
usage (see `guides/testing.md`) — every new resource gets its own
CRUD-cycle test (create, list, get, delete, and the 404 case), not just
a smoke test of one happy path.
