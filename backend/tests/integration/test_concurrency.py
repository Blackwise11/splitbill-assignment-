"""Concurrent idempotency test: many simultaneous requests, one row."""

from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal
from threading import Barrier

from app.main import app
from app.models import Expense
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from tests.conftest import auth

WORKERS = 8


def test_concurrent_same_idempotency_key_creates_exactly_one_expense(
    client: TestClient,
    session_factory: sessionmaker[Session],
) -> None:
    barrier = Barrier(WORKERS)
    payload = {
        "description": "Concurrent night market dinner",
        "paid_by": "alice",
        "amount": "100.00",
        "split": {"type": "equal", "members": ["alice", "bob", "carol"]},
    }

    def send() -> tuple[int, int, bool]:
        barrier.wait(timeout=10)
        with TestClient(app) as thread_client:
            response = thread_client.post(
                "/groups/1/expenses",
                headers={**auth("alice"), "Idempotency-Key": "race-key"},
                json=payload,
            )
            return (
                response.status_code,
                response.json()["id"],
                response.headers.get("Idempotent-Replayed") == "true",
            )

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        results = list(executor.map(lambda _: send(), range(WORKERS)))

    assert all(status in {200, 201} for status, _, _ in results), results
    assert len({expense_id for _, expense_id, _ in results}) == 1
    assert sum(1 for status, _, _ in results if status == 201) == 1
    assert sum(1 for _, _, replayed in results if replayed) == WORKERS - 1

    with session_factory() as session:
        count = session.scalar(select(func.count()).select_from(Expense))
    assert count == 1

    balance_response = client.get("/groups/1/balances", headers=auth("alice"))
    lines = {line["username"]: line["balance"] for line in balance_response.json()["members"]}
    assert lines == {"alice": "66.66", "bob": "-33.33", "carol": "-33.33"}
    assert sum(Decimal(value) for value in lines.values()) == Decimal("0.00")
