from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import SessionLocal, init_db
from app.middleware import HeavyOperationRateLimitMiddleware, RequestContextMiddleware
from app.routers import analytics, evidence, frontend, integrations, jobs, notifications, prices, products, quant, reports, reviews, selection, signals, source_health, strategies, system, watchlist
from app.services.signal_service import refresh_all_active_signals
from app.version import APP_VERSION


STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        refresh_all_active_signals(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Camera Market Strategy System", version=APP_VERSION, lifespan=lifespan)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(HeavyOperationRateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.include_router(products.router)
app.include_router(prices.router)
app.include_router(strategies.router)
app.include_router(signals.router)
app.include_router(reports.router)
app.include_router(analytics.router)
app.include_router(selection.router)
app.include_router(watchlist.router)
app.include_router(system.router)
app.include_router(integrations.router)
app.include_router(quant.router)
app.include_router(source_health.router)
app.include_router(notifications.router)
app.include_router(evidence.router)
app.include_router(jobs.router)
app.include_router(reviews.router)
app.include_router(frontend.router)


@app.get("/")
def root():
    return {
        "name": "Camera Market Strategy System",
        "version": APP_VERSION,
        "principle": "market facts -> user strategy -> signal trigger",
        "watchlist": "dynamic; products can be added, archived, restored, and updated at runtime",
        "integrations": "JD Union, Taobao Alliance, and PDD DDK adapters are available when official credentials are configured",
        "quant": "price indicators and purchase-strategy backtesting are exposed as APIs",
    }
