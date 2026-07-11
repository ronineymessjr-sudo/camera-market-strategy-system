import asyncio

import pytest

from app.product_refresh_cache import ProductRefreshCache


@pytest.mark.asyncio
async def test_repeated_reads_share_cached_value():
    now = [100.0]
    calls = 0

    async def loader():
        nonlocal calls
        calls += 1
        return {"price": 4499}

    cache = ProductRefreshCache(
        ttl_seconds=300,
        stale_seconds=900,
        jitter_ratio=0,
        clock=lambda: now[0],
    )

    first = await cache.get("product:1", loader)
    second = await cache.get("product:1", loader)

    assert first.source == "refresh"
    assert second.source == "cache"
    assert second.value == {"price": 4499}
    assert second.refresh_in_seconds == 300
    assert calls == 1


@pytest.mark.asyncio
async def test_concurrent_misses_use_singleflight():
    calls = 0

    async def loader():
        nonlocal calls
        calls += 1
        await asyncio.sleep(0.02)
        return {"price": 4499}

    cache = ProductRefreshCache(
        ttl_seconds=300,
        stale_seconds=900,
        jitter_ratio=0,
    )

    results = await asyncio.gather(
        *(cache.get("product:1", loader) for _ in range(20))
    )

    assert calls == 1
    assert {result.value["price"] for result in results} == {4499}


@pytest.mark.asyncio
async def test_stale_value_is_served_while_refresh_runs():
    now = [100.0]
    calls = 0
    release = asyncio.Event()

    async def loader():
        nonlocal calls
        calls += 1
        if calls > 1:
            await release.wait()
        return {"price": 4499 + calls}

    cache = ProductRefreshCache(
        ttl_seconds=10,
        stale_seconds=60,
        jitter_ratio=0,
        clock=lambda: now[0],
    )

    first = await cache.get("product:1", loader)
    now[0] = 111.0

    stale = await cache.get("product:1", loader)

    assert first.value == {"price": 4500}
    assert stale.source == "stale-cache"
    assert stale.stale is True
    assert stale.value == {"price": 4500}

    release.set()
    await asyncio.sleep(0)

    refreshed = await cache.get("product:1", loader, force_refresh=True)
    assert refreshed.value["price"] >= 4501


@pytest.mark.asyncio
async def test_different_products_refresh_independently():
    active = 0
    peak = 0

    async def loader():
        nonlocal active, peak
        active += 1
        peak = max(peak, active)
        await asyncio.sleep(0.02)
        active -= 1
        return {"ok": True}

    cache = ProductRefreshCache(
        ttl_seconds=300,
        stale_seconds=900,
        jitter_ratio=0,
    )

    await asyncio.gather(
        cache.get("product:1", loader),
        cache.get("product:2", loader),
    )

    assert peak == 2
