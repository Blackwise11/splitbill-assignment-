"""SplitBill FastAPI application entry point."""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.errors import register_exception_handlers
from app.api.routes import balances, expenses, groups, payments
from app.core.config import settings

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(
    title="SplitBill API",
    version=__version__,
    description=(
        "Exact shared-expense accounting in integer satang. "
        "Identify the acting user with the X-User header."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Idempotent-Replayed"],
)

register_exception_handlers(app)

app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(balances.router)
app.include_router(payments.router)


@app.get("/", tags=["meta"], summary="Service banner")
def root() -> dict[str, str]:
    return {"service": "SplitBill API", "version": __version__, "currency": "THB"}


@app.get("/health", tags=["meta"], summary="Liveness probe")
def health() -> dict[str, str]:
    return {"status": "ok", "version": __version__}
