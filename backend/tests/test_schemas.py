"""Tests for app/schemas.py: invalid request bodies are rejected with 422 and readable messages."""

from fastapi.testclient import TestClient

from tests.helpers import log_in, sign_up


def test_check_rejects_empty_url(client: TestClient) -> None:
    assert client.post("/api/check", json={"url": ""}).status_code == 422


def test_sign_up_validation(client: TestClient) -> None:
    response = client.post("/api/users", json={"user_name": "a" * 21, "user_email": "bad", "password": "short"})
    assert response.status_code == 422
    fields = {detail["field"]: detail["message"] for detail in response.json()["error"]["details"]}
    assert set(fields) == {"body.user_name", "body.user_email", "body.password"}
    assert fields["body.user_email"] == "Enter a valid email address"


def test_sign_up_rejects_extra_fields(client: TestClient) -> None:
    response = client.post("/api/users", json={"user_name": "x", "user_email": "x@example.com",
                                               "password": "12345678", "is_admin": True})
    assert response.status_code == 422


def test_saved_check_must_match_the_entry_shape(client: TestClient) -> None:
    sign_up(client)
    bad = {"url": "x", "label": "maybe", "confidence": 2, "junk": 1}
    response = client.post("/api/history", json={"data_saved": bad}, headers=log_in(client))
    assert response.status_code == 422
    fields = {detail["field"] for detail in response.json()["error"]["details"]}
    assert {"body.data_saved.label", "body.data_saved.confidence", "body.data_saved.junk"} <= fields
