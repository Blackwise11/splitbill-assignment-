"""Greedy minimum-cash-flow settlement suggestions."""

from __future__ import annotations

from dataclasses import dataclass

from app.core.exceptions import InvariantError
from app.services.balances import BalanceReport


@dataclass(frozen=True, slots=True)
class Transfer:
    from_user: str
    to_user: str
    amount_satang: int


def settle_up(report: BalanceReport) -> list[Transfer]:
    """Return a small, deterministic set of transfers that clears all balances.

    The greedy algorithm repeatedly matches the largest debtor with the largest
    creditor. It is not guaranteed to find the mathematically minimum number of
    transfers for every graph (that problem is NP-hard), but it is the standard
    min-cash-flow heuristic and never emits more than ``n - 1`` transfers.
    """
    if report.total_satang != 0:
        raise InvariantError("Cannot settle a non-zero-sum balance report.")

    creditors = sorted(
        ([line.username, line.balance_satang] for line in report.lines if line.balance_satang > 0),
        key=lambda item: (-item[1], item[0]),
    )
    debtors = sorted(
        ([line.username, -line.balance_satang] for line in report.lines if line.balance_satang < 0),
        key=lambda item: (-item[1], item[0]),
    )

    transfers: list[Transfer] = []
    creditor_index = 0
    debtor_index = 0
    while creditor_index < len(creditors) and debtor_index < len(debtors):
        creditor = creditors[creditor_index]
        debtor = debtors[debtor_index]
        amount = min(creditor[1], debtor[1])
        if amount > 0:
            transfers.append(
                Transfer(
                    from_user=debtor[0],
                    to_user=creditor[0],
                    amount_satang=amount,
                )
            )
        creditor[1] -= amount
        debtor[1] -= amount
        if creditor[1] == 0:
            creditor_index += 1
        if debtor[1] == 0:
            debtor_index += 1

    if any(amount != 0 for _, amount in creditors) or any(amount != 0 for _, amount in debtors):
        raise InvariantError("Settlement left a non-zero balance behind.")
    return transfers
