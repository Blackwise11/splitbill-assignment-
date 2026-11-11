"""Expense, balance, idempotency, and soft-delete API tests."""

from decimal import Decimal

from app.models import Expense, ExpenseShare
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from tests.conftest import auth


def equal_payload(
    *,
    description: str = "Dinner at the night market",
    paid_by: str = "alice",
    amount: str = "100.00",
    members: list[str] | None = None,
) -> dict[str, object]:
    return {
        "description": description,
        "paid_by": paid_by,
        "amount": amount,
        "split": {
            "type": "equal",
            "members": members if members is not None else ["alice", "bob", "carol"],
        },
    }


def post_expense(
    client: TestClient,
    payload: dict[str, object],
    *,
    key: str = "test-key",
    user: str = "alice",
    group_id: int = 1,
):
    return client.post(
        f"/groups/{group_id}/expenses",
        headers={**auth(user), "Idempotency-Key": key},
        json=payload,
    )


def balances(client: TestClient, user: str = "alice", group_id: int = 1) -> dict[str, str]:
    response = client.get(f"/groups/{group_id}/balances", headers=auth(user))
    assert response.status_code == 200
    return {line["username"]: line["balance"] for line in response.json()["members"]}


def test_equal_split_100_three_ways_matches_required_allocation(client: TestClient) -> None:
    response = post_expense(client, equal_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["amount"] == "100.00"
    assert body["shares"] == {"alice": "33.34", "bob": "33.33", "carol": "33.33"}
    assert body["split_type"] == "equal"
    assert sum(Decimal(value) for value in body["shares"].values()) == Decimal("100.00")

    result = balances(client)
    assert result == {"alice": "66.66", "bob": "-33.33", "carol": "-33.33"}
    assert sum(Decimal(value) for value in result.values()) == Decimal("0.00")


def test_exact_split_must_sum_to_total(client: TestClient) -> None:
    payload = {
        "description": "Lunch",
        "paid_by": "bob",
        "amount": "1000.00",
        "split": {
            "type": "exact",
            "shares": {"alice": "500.00", "bob": "300.00", "carol": "100.00"},
        },
    }

    response = post_expense(client, payload)

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "shares_do_not_match_total"
    assert "The shares do not add up to the total" in error["message"]
    assert error["details"]["difference"] == "100.00"


def test_exact_split_accepts_exact_total(client: TestClient) -> None:
    payload = {
        "description": "Lunch",
        "paid_by": "bob",
        "amount": "1000.00",
        "split": {
            "type": "exact",
            "shares": {"alice": "500.00", "bob": "300.00", "carol": "200.00"},
        },
    }

    response = post_expense(client, payload, key="exact-ok")

    assert response.status_code == 201
    assert response.json()["shares"] == {
        "alice": "500.00",
        "bob": "300.00",
        "carol": "200.00",
    }
    assert balances(client, "bob") == {"alice": "-500.00", "bob": "700.00", "carol": "-200.00"}


def test_three_decimal_amount_is_rejected_with_description(client: TestClient) -> None:
    response = post_expense(client, equal_payload(amount="10.005"))

    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "validation_error"
    assert "2 decimal places" in error["message"]


def test_zero_and_negative_amounts_are_rejected(client: TestClient) -> None:
    zero = post_expense(client, equal_payload(amount="0.00"), key="zero")
    assert zero.status_code == 422
    assert "greater than 0.00" in zero.json()["error"]["message"]

    negative = post_expense(client, equal_payload(amount="-5.00"), key="negative")
    assert negative.status_code == 422

    numeric = post_expense(client, {**equal_payload(), "amount": 1000.0}, key="numeric")
    assert numeric.status_code == 422


def test_payer_and_every_participant_must_belong_to_group(client: TestClient) -> None:
    bad_payer = post_expense(client, equal_payload(paid_by="dan"), key="bad-payer")
    assert bad_payer.status_code == 422
    assert bad_payer.json()["error"]["code"] == "payer_not_in_group"

    bad_member = post_expense(
        client,
        equal_payload(members=["alice", "dan"]),
        key="bad-member",
    )
    assert bad_member.status_code == 422
    assert bad_member.json()["error"]["code"] == "split_member_not_in_group"


def test_repeated_idempotency_key_creates_one_expense(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    payload = equal_payload()

    first = post_expense(client, payload, key="repeat-key")
    second = post_expense(client, payload, key="repeat-key")

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.headers["Idempotent-Replayed"] == "true"
    assert first.json()["id"] == second.json()["id"]

    with session_factory() as session:
        count = session.scalar(select(func.count()).select_from(Expense))
    assert count == 1

    assert balances(client) == {"alice": "66.66", "bob": "-33.33", "carol": "-33.33"}


def test_optional_idempotency_key_still_creates_expense(client: TestClient) -> None:
    response = client.post(
        "/groups/1/expenses",
        headers=auth("alice"),
        json=equal_payload(description="No key supplied"),
    )
    assert response.status_code == 201


def test_idempotency_is_scoped_per_group(client: TestClient) -> None:
    group_one = post_expense(client, equal_payload(), key="shared-key", user="bob")
    group_two = post_expense(
        client,
        {
            "description": "Office lunch",
            "paid_by": "bob",
            "amount": "50.00",
            "split": {"type": "equal", "members": ["bob", "dan"]},
        },
        key="shared-key",
        user="bob",
        group_id=2,
    )

    assert group_one.status_code == 201
    assert group_two.status_code == 201
    assert group_one.json()["id"] != group_two.json()["id"]


def test_expenses_are_listed_newest_first(client: TestClient) -> None:
    first = post_expense(client, equal_payload(description="First"), key="first")
    second = post_expense(client, equal_payload(description="Second"), key="second")

    response = client.get("/groups/1/expenses", headers=auth("alice"))

    assert response.status_code == 200
    body = response.json()
    assert body["count"] == 2
    assert [item["id"] for item in body["expenses"]] == [
        second.json()["id"],
        first.json()["id"],
    ]


def test_only_payer_can_soft_delete_and_balances_exclude_it(
    client: TestClient, session_factory: sessionmaker[Session]
) -> None:
    created = post_expense(client, equal_payload(), key="delete-me")
    expense_id = created.json()["id"]

    forbidden = client.delete(f"/groups/1/expenses/{expense_id}", headers=auth("bob"))
    assert forbidden.status_code == 403
    assert forbidden.json()["error"]["code"] == "not_expense_payer"

    deleted = client.delete(f"/groups/1/expenses/{expense_id}", headers=auth("alice"))
    assert deleted.status_code == 204

    listed = client.get("/groups/1/expenses", headers=auth("alice")).json()
    assert listed["expenses"] == []
    assert balances(client) == {"alice": "0.00", "bob": "0.00", "carol": "0.00"}
    assert client.get("/groups/1/settle-up", headers=auth("alice")).json()["transactions"] == []

    with session_factory() as session:
        row = session.get(Expense, expense_id)
        assert row is not None
        assert row.is_deleted is True
        assert row.deleted_at is not None
        share_count = session.scalar(
            select(func.count())
            .select_from(ExpenseShare)
            .where(ExpenseShare.expense_id == expense_id)
        )
        assert share_count == 3


def test_second_delete_is_idempotent(client: TestClient) -> None:
    expense_id = post_expense(client, equal_payload(), key="delete-twice").json()["id"]

    for _ in range(2):
        response = client.delete(f"/groups/1/expenses/{expense_id}", headers=auth("alice"))
        assert response.status_code == 204


def test_deleting_unknown_expense_returns_404(client: TestClient) -> None:
    response = client.delete("/groups/1/expenses/9999", headers=auth("alice"))
    assert response.status_code == 404


def test_expenses_are_immutable(client: TestClient) -> None:
    expense_id = post_expense(client, equal_payload(), key="immutable").json()["id"]

    response = client.put(
        f"/groups/1/expenses/{expense_id}",
        headers=auth("alice"),
        json=equal_payload(amount="1.00"),
    )

    assert response.status_code == 405


def test_float_free_two_decimals_via_api(client: TestClient) -> None:
    payload = {
        "description": "Precision check",
        "paid_by": "alice",
        "amount": "0.30",
        "split": {
            "type": "exact",
            "shares": {"alice": "0.10", "bob": "0.20"},
        },
    }

    response = post_expense(client, payload, key="precision")

    assert response.status_code == 201
    assert response.json()["amount"] == "0.30"
    assert response.json()["shares"] == {"alice": "0.10", "bob": "0.20"}
