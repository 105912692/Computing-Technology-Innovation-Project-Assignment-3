"""Tests for app/main.py: what each route does (model check, sign up, saved history)."""

from fastapi.testclient import TestClient

from tests.helpers import CHECK, log_in, sign_up


# ---------- Model routes ----------

def test_health(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_check_returns_label_and_probability(client: TestClient) -> None:
    body = client.post("/api/check", json={"url": "paypal-login.example.com"}).json()
    assert body["label"] in ("phishing", "benign")
    assert 0 <= body["phishing_probability"] <= 1


def test_test_message_route_is_gone(client: TestClient) -> None:
    assert client.get("/api/message").status_code == 404


# ---------- Sign up ----------

def test_sign_up_returns_no_password_and_lowercases_email(client: TestClient) -> None:
    body = sign_up(client, email="Demo@Example.com")
    assert body == {"user_id": 1, "user_name": "demo", "user_email": "demo@example.com"}


# ---------- Saved history ----------

def test_save_and_list_history_newest_first(client: TestClient) -> None:
    sign_up(client)
    headers = log_in(client)
    first = client.post("/api/history", json={"data_saved": CHECK}, headers=headers)
    second = client.post("/api/history", json={"data_saved": {"url": "https://www.google.com", "label": "benign",
                                                               "confidence": 0.9}}, headers=headers)
    assert first.status_code == second.status_code == 201
    assert first.json()["data_saved"] == CHECK
    listed = client.get("/api/history", headers=headers).json()
    assert [entry["history_id"] for entry in listed] == [2, 1]


def test_delete_one_entry(client: TestClient) -> None:
    sign_up(client)
    headers = log_in(client)
    client.post("/api/history", json={"data_saved": CHECK}, headers=headers)
    assert client.delete("/api/history/1", headers=headers).status_code == 204
    assert client.delete("/api/history/1", headers=headers).status_code == 404
    assert client.get("/api/history", headers=headers).json() == []


def test_users_cannot_see_or_delete_each_others_history(client: TestClient) -> None:
    sign_up(client)
    sign_up(client, name="bob", email="bob@example.com", password="bob-password")
    demo, bob = log_in(client), log_in(client, "bob@example.com", "bob-password")
    client.post("/api/history", json={"data_saved": CHECK}, headers=demo)
    assert client.get("/api/history", headers=bob).json() == []
    assert client.delete("/api/history/1", headers=bob).status_code == 404   # demo's entry: same as "not found"
    assert client.delete("/api/history", headers=bob).status_code == 204     # clears only bob's (none)
    assert len(client.get("/api/history", headers=demo).json()) == 1


def test_clear_all_history(client: TestClient) -> None:
    sign_up(client)
    headers = log_in(client)
    for _ in range(3):
        client.post("/api/history", json={"data_saved": CHECK}, headers=headers)
    assert client.delete("/api/history", headers=headers).status_code == 204
    assert client.get("/api/history", headers=headers).json() == []
