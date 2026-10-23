"""Tests for app/db_models.py: the database rules (unique email, cascade delete)."""

from fastapi.testclient import TestClient

from tests.helpers import CHECK, error_message, log_in, sign_up


def test_duplicate_email_any_case_is_409(client: TestClient) -> None:
    sign_up(client)
    response = client.post("/api/users", json={"user_name": "x", "user_email": "DEMO@example.com", "password": "12345678"})
    assert response.status_code == 409
    assert error_message(response) == "Email is already registered"


def test_delete_account_removes_history_and_invalidates_token(client: TestClient) -> None:
    from app.database import SessionLocal
    from app.db_models import HistoryData

    sign_up(client)
    headers = log_in(client)
    client.post("/api/history", json={"data_saved": CHECK}, headers=headers)
    assert client.delete("/api/me", headers=headers).status_code == 204
    assert client.get("/api/me", headers=headers).status_code == 401
    with SessionLocal() as db:
        assert db.query(HistoryData).count() == 0   # removed by ON DELETE CASCADE
