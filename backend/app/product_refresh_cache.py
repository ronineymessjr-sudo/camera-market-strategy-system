from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass
from typing import Awaitable, Callable, Generic, TypeVar

T = TypeVar("T")


@dataclass(slots=True)
class CacheEntry(Generic[T]):
    value: T
    refreshed_at: float
    expires_at: float
    stale_until: float


@dataclass(slots=True)
class CacheResult(Generic[T]):
    value: T
    source: str
    refreshed_at: float
    next_refresh_at: float
    refresh_in_seconds: int
    stale: bool


class ProductRefreshCache(Generic[T]):
    """Per-key TTL cache with single-flight refresh and stale-while-revalidate.

    Intended for low-frequency commerce monitoring:
    - repeated readers receive the same cached product snapshot;
    - only one refresh runs for a product at a time;
    - stale data can be served briefly while a background refresh starts;
    - callers receive countdown metadata for the UI.
    """

    def __init__(
        self,
        *,
        ttl_seconds: int = 300,
        stale_seconds: int = 900,
        jitter_ratio: float = 0.10,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be positive")
        if stale_seconds < ttl_seconds:
            raise ValueError("stale_seconds must be >= ttl_seconds")
        if not 0 <= jitter_ratio <= 0.5:
            raise ValueError("jitter_ratio must be between 0 and 0.5")

        self.ttl_seconds = ttl_seconds
        self.stale_seconds = stale_seconds
        self.jitter_ratio = jitter_ratio
        self.clock = clock
        self._entries: dict[str, CacheEntry[T]] = {}
        self._inflight: dict[str, asyncio.Task[T]] = {}
        self._lock = asyncio.Lock()

    def _ttl_with_jitter(self) -> float:
        spread = self.ttl_seconds * self.jitter_ratio
        return self.ttl_seconds + random.uniform(-spread, spread)

    def _result(self, entry: CacheEntry[T], source: str, now: float) -> CacheResult[T]:
        remaining = max(0, int(round(entry.expires_at - now)))
        return CacheResult(
            value=entry.value,
            source=source,
            refreshed_at=entry.refreshed_at,
            next_refresh_at=entry.expires_at,
            refresh_in_seconds=remaining,
            stale=now >= entry.expires_at,
        )

    async def get(
        self,
        key: str,
        loader: Callable[[], Awaitable[T]],
        *,
        force_refresh: bool = False,
    ) -> CacheResult[T]:
        now = self.clock()
        entry = self._entries.get(key)

        if entry and not force_refresh and now < entry.expires_at:
            return self._result(entry, "cache", now)

        if entry and not force_refresh and now < entry.stale_until:
            await self._ensure_background_refresh(key, loader)
            return self._result(entry, "stale-cache", now)

        value = await self._refresh_singleflight(key, loader)
        current = self._entries[key]
        return self._result(current, "refresh", self.clock())

    async def _ensure_background_refresh(
        self,
        key: str,
        loader: Callable[[], Awaitable[T]],
    ) -> None:
        async with self._lock:
            existing = self._inflight.get(key)
            if existing and not existing.done():
                return
            task = asyncio.create_task(self._load_and_store(key, loader))
            self._inflight[key] = task
            task.add_done_callback(lambda _: self._inflight.pop(key, None))

    async def _refresh_singleflight(
        self,
        key: str,
        loader: Callable[[], Awaitable[T]],
    ) -> T:
        async with self._lock:
            task = self._inflight.get(key)
            if task is None or task.done():
                task = asyncio.create_task(self._load_and_store(key, loader))
                self._inflight[key] = task

        try:
            return await task
        finally:
            if task.done():
                self._inflight.pop(key, None)

    async def _load_and_store(
        self,
        key: str,
        loader: Callable[[], Awaitable[T]],
    ) -> T:
        value = await loader()
        now = self.clock()
        ttl = self._ttl_with_jitter()
        self._entries[key] = CacheEntry(
            value=value,
            refreshed_at=now,
            expires_at=now + ttl,
            stale_until=now + self.stale_seconds,
        )
        return value

    def invalidate(self, key: str) -> None:
        self._entries.pop(key, None)

    def clear(self) -> None:
        self._entries.clear()
