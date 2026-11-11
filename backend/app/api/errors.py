"""FastAPI exception handlers that expose one consistent error envelope."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.exceptions import DomainError

logger = logging.getLogger(__name__)


def error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, Any] | list[dict[str, Any]] | None = None,
) -> JSONResponse:
    """Build the single error envelope consumed by the frontend."""
    body: dict[str, Any] = {"error": {"code": code, "message": message}}
    if details:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


def _human_message(errors: list[dict[str, Any]]) -> str:
    first = errors[0]
    location = ".".join(
        str(part) for part in first.get("loc", ()) if part not in {"body", "query", "header"}
    )
    message = str(first.get("msg", "Invalid request")).removeprefix("Value error, ")
    return f"{location}: {message}" if location else message


def _validation_details(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "location": ".".join(str(part) for part in error.get("loc", ())),
            "message": str(error.get("msg", "")).removeprefix("Value error, "),
            "type": str(error.get("type", "validation_error")),
        }
        for error in errors
    ]


def register_exception_handlers(app: FastAPI) -> None:
    """Attach handlers for domain, validation, HTTP, and unexpected errors."""

    @app.exception_handler(DomainError)
    async def _domain_error(_: Request, exc: DomainError) -> JSONResponse:
        return error_response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            details=exc.details or None,
        )

    @app.exception_handler(RequestValidationError)
    async def _request_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = list(exc.errors())
        return error_response(
            status_code=422,
            code="validation_error",
            message=_human_message(errors),
            details=_validation_details(errors),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        message = str(exc.detail) if exc.detail else "Request failed"
        return error_response(status_code=exc.status_code, code="http_error", message=message)

    @app.exception_handler(Exception)
    async def _unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled application error", exc_info=exc)
        return error_response(
            status_code=500,
            code="internal_error",
            message="Something went wrong on our side. Please try again.",
        )
