"""Group listing, identity, and 403 access-control tests."""

from fastapi.testclient import TestClient

from tests.conftest import auth


def _equal_expense_payload() -> dict[str, object]:
    return {
        "description": "Lunch",
        "paid_by": "bob",
        "amount": "100.00",
        "split": {"type": "equal", "members": ["bob", "dan"]},
    }


def test_alice_only_sees_her_groups(client: TestClient) -> None:
    response = client.get("/groups", headers=auth("alice"))

    assert response.status_code == 200
    assert [group["id"] for group in response.json()] == [1]
    assert response.json()[0]["members"] == ["alice", "bob", "carol"]


def test_bob_sees_both_seeded_groups(client: TestClient) -> None:
    response = client.get("/groups", headers=auth("bob"))
    assert response.status_code == 200
    assert [group["id"] for group in response.json()] == [1, 2]


def test_group_detail_includes_members(client: TestClient) -> None:
    response = client.get("/groups/1", headers=auth("alice"))

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Chiang Mai trip"
    assert body["members"] == ["alice", "bob", "carol"]
    assert body["member_count"] == 3


def test_alice_cannot_read_group_two(client: TestClient) -> None:
    for path in (
        "/groups/2",
        "/groups/2/expenses",
        "/groups/2/balances",
        "/groups/2/settle-up",
        "/groups/2/payments",
    ):
        response = client.get(path, headers=auth("alice"))
        assert response.status_code == 403, path
        assert response.json()["error"]["code"] == "not_group_member"
        assert "not a member" in response.json()["error"]["message"]


def test_alice_cannot_write_to_group_two(client: TestClient) -> None:
    response = client.post(
        "/groups/2/expenses",
        headers={**auth("alice"), "Idempotency-Key": "outsider-write"},
        json=_equal_expense_payload(),
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "not_group_member"


def test_missing_and_unknown_identity_are_rejected(client: TestClient) -> None:
    missing = client.get("/groups")
    assert missing.status_code == 401
    assert missing.json()["error"]["code"] == "missing_x_user"

    unknown = client.get("/groups", headers=auth("mallory"))
    assert unknown.status_code == 401
    assert unknown.json()["error"]["code"] == "unknown_user"


def test_unknown_group_returns_404_for_member(client: TestClient) -> None:
    response = client.get("/groups/999", headers=auth("alice"))
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "group_not_found"


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
