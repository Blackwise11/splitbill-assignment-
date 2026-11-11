"""Pure integer-satang split allocation.

Equal split distributes the remainder one satang at a time in the exact member
order supplied by the caller. This makes allocations deterministic and avoids
the classic ``33.33 * 3 = 99.99`` float rounding failure.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from app.core.exceptions import DomainValidationError
from app.services.money import format_satang


@dataclass(frozen=True, slots=True)
class ShareLine:
    """A single username -> satang obligation."""

    username: str
    amount_satang: int


def _validate_members(members: Sequence[str]) -> None:
    if not members:
        raise DomainValidationError(
            "Choose at least one member for the split.",
            code="empty_split",
        )
    if any(not isinstance(member, str) or not member.strip() for member in members):
        raise DomainValidationError(
            "Every split member must be a non-empty username.",
            code="invalid_member",
        )
    if len(set(members)) != len(members):
        raise DomainValidationError(
            "Each member may appear only once in the split.",
            code="duplicate_member",
        )


def allocate_equal(total_satang: int, members: Sequence[str]) -> list[ShareLine]:
    """Split ``total_satang`` exactly, giving the remainder to members in order."""
    if total_satang <= 0:
        raise DomainValidationError(
            "The expense amount must be greater than 0.00 THB.",
            code="amount_not_positive",
        )
    _validate_members(members)

    base, remainder = divmod(total_satang, len(members))
    return [
        ShareLine(username=member, amount_satang=base + (1 if index < remainder else 0))
        for index, member in enumerate(members)
    ]


def allocate_exact(total_satang: int, shares: Mapping[str, int]) -> list[ShareLine]:
    """Validate that explicit shares sum exactly to the expense total."""
    if total_satang <= 0:
        raise DomainValidationError(
            "The expense amount must be greater than 0.00 THB.",
            code="amount_not_positive",
        )
    if not shares:
        raise DomainValidationError(
            "Choose at least one member for the split.",
            code="empty_split",
        )

    usernames = list(shares)
    _validate_members(usernames)
    negative = [username for username, satang in shares.items() if satang < 0]
    if negative:
        raise DomainValidationError(
            "Shares cannot be negative.",
            code="negative_share",
            details={"members": negative},
        )

    allocated = sum(shares.values())
    if allocated != total_satang:
        difference = total_satang - allocated
        direction = "unallocated" if difference > 0 else "over-allocated"
        raise DomainValidationError(
            "The shares do not add up to the total. "
            f"Shares total {format_satang(allocated)} THB but the expense is "
            f"{format_satang(total_satang)} THB ({format_satang(abs(difference))} THB "
            f"{direction}).",
            code="shares_do_not_match_total",
            details={
                "total": format_satang(total_satang),
                "allocated": format_satang(allocated),
                "difference": format_satang(difference),
            },
        )

    return [
        ShareLine(username=username, amount_satang=satang) for username, satang in shares.items()
    ]
