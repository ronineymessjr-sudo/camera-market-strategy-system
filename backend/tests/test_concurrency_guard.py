import asyncio

import pytest

from app.concurrency_guard import BusyError, KeyedLockPool, SingleFlight, stable_idempotency_key


@pytest.mark.asyncio
async def test_keyed_lock_serializes_same_key_but_not_different_keys():
    pool = KeyedLockPool()
    active = 0
    peak = 0

    async def worker(key: str):
        nonlocal active, peak
        async with pool.acquire(key):
            active += 1
            peak = max(peak, active)
            await asyncio.sleep(0.02)
            active -= 1

    await asyncio.gather(worker("same"), worker("same"))
    assert peak == 1

    active = 0
    peak = 0
    await asyncio.gather(worker("a"), worker("b"))
    assert peak == 2
    assert await pool.size() == 0


@pytest.mark.asyncio
async def test_keyed_lock_timeout_raises_busy_error():
    pool = KeyedLockPool()
    entered = asyncio.Event()
    release = asyncio.Event()

    async def holder():
        async with pool.acquire("daily-run"):
            entered.set()
            await release.wait()

    task = asyncio.create_task(holder())
    await entered.wait()
    with pytest.raises(BusyError):
        async with pool.acquire("daily-run", timeout=0.01):
            pass
    release.set()
    await task


@pytest.mark.asyncio
async def test_singleflight_runs_factory_once_for_concurrent_callers():
    sf: SingleFlight[int] = SingleFlight()
    calls = 0

    async def factory() -> int:
        nonlocal calls
        calls += 1
        await asyncio.sleep(0.02)
        return 42

    results = await asyncio.gather(*(sf.do("same", factory) for _ in range(20)))
    assert results == [42] * 20
    assert calls == 1


def test_stable_idempotency_key_is_order_independent():
    a = stable_idempotency_key("signal", {"product_id": 1, "price": 4499})
    b = stable_idempotency_key("signal", {"price": 4499, "product_id": 1})
    assert a == b
    assert a.startswith("signal:")
