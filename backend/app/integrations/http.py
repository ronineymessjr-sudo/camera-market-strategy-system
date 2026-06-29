from __future__ import annotations

import httpx


async def post_form(url: str, data: dict[str, object], *, timeout: float = 30.0) -> dict:
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        response = await client.post(url, data=data)
        response.raise_for_status()
        return response.json()
