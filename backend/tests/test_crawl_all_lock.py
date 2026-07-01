import pytest
from fastapi import HTTPException

from app.concurrency_guard import GLOBAL_LOCKS
from app.routers.prices import _crawl_lock_key, crawl_all


@pytest.mark.asyncio
async def test_crawl_all_rejects_duplicate_scope_while_running():
    async with GLOBAL_LOCKS.acquire(_crawl_lock_key(None, None)):
        with pytest.raises(HTTPException) as exc:
            await crawl_all(db=object())

    assert exc.value.status_code == 409
    assert "already running" in exc.value.detail
