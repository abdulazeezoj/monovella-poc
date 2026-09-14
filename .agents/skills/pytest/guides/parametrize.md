# Guide: testing the same behavior against multiple inputs

When several test cases share the same logic and only the input (and
maybe the expected outcome) changes — a handful of invalid payloads
that should all get rejected with a 422, for example — write one
test function decorated with `@pytest.mark.parametrize` instead of
copy-pasting a near-identical function per case.

```python
import pytest
from httpx import AsyncClient


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"name": ""},
        {"name": "Widget", "description": 123},
    ],
    ids=["missing_name", "empty_name", "wrong_type"],
)
async def test_create_widget_rejects_invalid_payload(
    client: AsyncClient, payload: dict
) -> None:
    response = await client.post("/widgets/", json=payload)
    assert response.status_code == 422
```

FastAPI returns `422` for a bad payload automatically — Pydantic
validates the request body against your `...Create` schema before your
handler runs at all, so every route gets this behavior for free without
each handler catching anything itself.

Without `ids=[...]`, pytest names each case `[payload0]`, `[payload1]`,
... — still unique, but a failure report reads as
`test_create_widget_rejects_invalid_payload[payload1]` instead of
`[empty_name]`. Passing `ids` is optional but worth the extra line once
there's more than two or three cases.

`parametrize` is the right tool when the *behavior under test* is
identical and only the data varies — reach for it once you notice
yourself about to write a second or third near-copy of a test function
that changes only its input literal and assertion values. It isn't a
replacement for separate test functions when the behaviors are
genuinely different: create, list, get, and delete stay their own
tests (see `guides/writing-a-good-test.md`), not parametrized cases of
one mega-test.
