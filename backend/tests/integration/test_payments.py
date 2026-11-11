"""Optional repayment and settle-up extension tests."""

from decimal import Decimal

from app.models import Payment
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from tests.conftest import auth


def _create_dinner(client: TestClient) -> None:
    response = client.post(
        "/groups/1/expenses",
        headers={**auth("alice"), "Idempotency-Key": "dinner"},
        json={
            "description": "Dinner",
            "paid_by": "alice",
            "amount": "100.00",
            "split": {"type": "equal", "members": ["alice", "bob", "carol"]},
        },
    )
    assert response.status_code == 201


def test_settle_up_suggests_two_transfers(client: TestClient) -> None:
    _create_dinner(client)

    response = client.get("/groups/1/settle-up", headers=auth("alice"))

    assert response.status_code == 200
    body = response.json()
    assert body["transaction_count"] == 2
    assert body["transactions"] == [
        {"from_user": "bob", "to_user": "alice", "amount": "33.33"},
        {"from_user": "carol", "to_user": "alice", "amount": "33.33"},
    ]


def test_recording_a_repayment_updates_balances(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    _create_dinner(client)

    response = client.post(
        "/groups/1/payments",
        headers={**auth("bob"), "Idempotency-Key": "bob-repays"},
        json={"from_user": "bob", "to_user": "alice", "amount": "33.33", "note": "Prompt pay"},
    )

    assert response.status_code == 201
    assert response.json()["amount"] == "33.33"

    balances = client.get("/groups/1/balances", headers=auth("bob")).json()
    by_user = {line["username"]: line["balance"] for line in balances["members"]}
    assert by_user == {"alice": "33.33", "bob": "0.00", "carol": "-33.33"}
    assert sum(Decimal(value) for value in by_user.values()) == Decimal("0.00")

    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Payment)) == 1


def test_repayment_idempotency_key_is_replay_safe(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    _create_dinner(client)
    headers = {**auth("bob"), "Idempotency-Key": "same-repayment"}
    payload = {"from_user": "bob", "to_user": "alice", "amount": "10.00"}

    first = client.post("/groups/1/payments", headers=headers, json=payload)
    second = client.post("/groups/1/payments", headers=headers, json=payload)

    assert first.status_code == 201
    assert second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    with session_factory() as session:
        assert session.scalar(select(func.count()).select_from(Payment)) == 1


def test_repayment_members_must_belong_to_group(client: TestClient) -> None:
    _create_dinner(client)

    response = client.post(
        "/groups/1/payments",
        headers={**auth("bob"), "Idempotency-Key": "bad-payment"},
        json={"from_user": "bob", "to_user": "dan", "amount": "10.00"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "payment_member_not_in_group"


def test_self_repayment_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/groups/1/payments",
        headers={**auth("bob"), "Idempotency-Key": "self-payment"},
        json={"from_user": "bob", "to_user": "bob", "amount": "10.00"},
    )

    assert response.status_code == 422
    assert "themselves" in response.json()["error"]["message"]


def test_repayment_requires_group_membership(client: TestClient) -> None:
    response = client.post(
        "/groups/2/payments",
        headers={**auth("alice"), "Idempotency-Key": "outsider-payment"},
        json={"from_user": "bob", "to_user": "dan", "amount": "10.00"},
    )
    assert response.status_code == 403
