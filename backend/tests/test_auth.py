"""Tests for app/auth.py: password hashing, login, and which tokens are accepted."""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from app import auth
from tests.helpers import error_message, log_in, sign_up


def test_password_is_stored_as_argon2_hash(client: TestClient) -> None:
    from app.database import SessionLocal
    from app.db_models import UserData

    sign_up(client)
    with SessionLocal() as db:
        stored = db.get(UserData, 1).password_hash
    assert stored.startswith("$argon2id$") and "a-long-password" not in stored


def test_wrong_password_and_unknown_email_get_the_same_401(client: TestClient) -> None:
    sign_up(client)
    wrong_password = client.post("/api/login", json={"user_email": "demo@example.com", "password": "wrong-pass"})
    unknown_email = client.post("/api/login", json={"user_email": "nobody@example.com", "password": "wrong-pass"})
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert error_message(wrong_password) == error_message(unknown_email) == "Incorrect email or password"


def test_login_and_read_my_account(client: TestClient) -> None:
    sign_up(client)
    response = client.get("/api/me", headers=log_in(client, email="DEMO@example.com"))
    assert response.status_code == 200
    assert response.json()["user_email"] == "demo@example.com"


def test_protected_routes_need_a_token(client: TestClient) -> None:
    for method, path in [("GET", "/api/me"), ("DELETE", "/api/me"), ("GET", "/api/history"),
                         ("POST", "/api/history"), ("DELETE", "/api/history"), ("DELETE", "/api/history/1")]:
        assert client.request(method, path).status_code == 401, (method, path)


def test_bad_forged_none_and_expired_tokens_are_rejected(client: TestClient) -> None:
    sign_up(client)
    in_5_min = datetime.now(timezone.utc) + timedelta(minutes=5)
    tokens = {
        "garbage": "abc.def.ghi",
        "wrong key": jwt.encode({"sub": "1", "exp": in_5_min}, "a-different-secret-key-of-32-chars!!", algorithm="HS256"),
        "alg none": jwt.encode({"sub": "1"}, None, algorithm="none"),
        "expired": jwt.encode({"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
                              auth.SECRET_KEY, algorithm="HS256"),
    }
    for name, token in tokens.items():
        assert client.get("/api/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401, name
