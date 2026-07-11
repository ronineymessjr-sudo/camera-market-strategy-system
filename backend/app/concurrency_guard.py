from __future__ import annotations

import asyncio
import contextlib
import hashlib
import json
import time
from dataclasses import dataclass
from typing import Any, AsyncIterator, Awaitable, Callable, Generic, TypeVar

T = TypeVar("T")


class BusyError(RuntimeError):
    """Raised when a guarded operation cannot acquire its lock in time."""


@dataclass(slots=True)
class _LockEntry:
    lock: asyncio.Lock
    users: int = 0


class KeyedLockPool:
    """Process-local keyed async locks with cleanup and timeout support.

    This prevents duplicate work inside one Python process. For multiple
    workers/containers, pair it with a database advisory lock or a unique
    idempotency key in the database.
    """

    def __init__(self) -> None:
        self._entries: dict[str, _LockEntry] = {}
        self._guard = asyncio.Lock()

    @contextlib.asynccontextmanager
    async def acquire(self, key: str, timeout: float | None = None) -> AsyncIterator[None]:
        async with self._guard:
            entry = self._entries.get(key)
            if entry is None:
                entry = _LockEntry(asyncio.Lock())
                self._entries[key] = entry
            entry.users += 1

        acquired = False
        try:
            if timeout is None:
                await entry.lock.acquire()
            else:
                try:
                    await asyncio.wait_for(entry.lock.acquire(), timeout=timeout)
                except TimeoutError as exc:
                    raise BusyError(f"operation already running for key={key!r}") from exc
            acquired = True
            yield
        finally:
            if acquired:
                entry.lock.release()
            async with self._guard:
                entry.users -= 1
                if entry.users == 0 and not entry.lock.locked():
                    self._entries.pop(key, None)

    async def size(self) -> int:
        async with self._guard:
            return len(self._entries)


@dataclass(slots=True)
class _Flight(Generic[T]):
    task: asyncio.Task[T]
    created_at: float


class SingleFlight(Generic[T]):
    """Coalesces concurrent requests for the same key into one task."""

    def __init__(self) -> None:
        self._flights: dict[str, _Flight[T]] = {}
        self._guard = asyncio.Lock()

    async def do(self, key: str, factory: Callable[[], Awaitable[T]]) -> T:
        async with self._guard:
            flight = self._flights.get(key)
            if flight is None:
                task = asyncio.create_task(factory())
                flight = _Flight(task=task, created_at=time.monotonic())
                self._flights[key] = flight

        try:
            return await asyncio.shield(flight.task)
        finally:
            if flight.task.done():
                async with self._guard:
                    current = self._flights.get(key)
                    if current is flight:
                        self._flights.pop(key, None)


def stable_idempotency_key(namespace: str, payload: Any) -> str:
    """Build a deterministic SHA-256 key from JSON-serializable input."""

    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)
    digest = hashlib.sha256(encoded.encode("utf-8")).hexdigest()
    return f"{namespace}:{digest}"


GLOBAL_LOCKS = KeyedLockPool()
GLOBAL_SINGLEFLIGHT: SingleFlight[Any] = SingleFlight()
