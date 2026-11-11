"""Idempotency-key normalization shared by write endpoints."""

from __future__ import annotations

from uuid import uuid4

from app.core.exceptions import DomainValidationError

MAX_IDEMPOTENCY_KEY_LENGTH = 128


def resolve_idempotency_key(raw_key: str | None) -> str:
    """Use the supplied key or generate one when the client omits it."""
    if raw_key is None:
        return uuid4().hex
    key = raw_key.strip()
    if not key:
        raise DomainValidationError(
            "Idempotency-Key must not be empty when provided.",
            code="invalid_idempotency_key",
        )
    if len(key) > MAX_IDEMPOTENCY_KEY_LENGTH:
        raise DomainValidationError(
            f"Idempotency-Key must be at most {MAX_IDEMPOTENCY_KEY_LENGTH} characters.",
            code="invalid_idempotency_key",
        )
    return key
