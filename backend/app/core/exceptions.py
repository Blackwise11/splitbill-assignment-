"""Domain exceptions with stable, frontend-friendly error codes."""

from typing import Any


class DomainError(Exception):
    """Base class for expected business-rule failures."""

    status_code: int = 400
    code: str = "domain_error"

    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code
        self.details = details or {}


class UnauthorizedError(DomainError):
    status_code = 401
    code = "unauthenticated"


class ForbiddenError(DomainError):
    status_code = 403
    code = "forbidden"


class NotFoundError(DomainError):
    status_code = 404
    code = "not_found"


class ConflictError(DomainError):
    status_code = 409
    code = "conflict"


class DomainValidationError(DomainError):
    status_code = 422
    code = "validation_error"


class InvariantError(DomainError):
    """Raised when an impossible internal state is detected."""

    status_code = 500
    code = "invariant_violated"
