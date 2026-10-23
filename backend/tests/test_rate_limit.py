"""Tests for app/rate_limit.py: login attempts are limited per IP, the limit resets, and old IPs are forgotten."""

from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import rate_limit
from tests.helpers import sign_up


def test_login_is_rate_limited(client: TestClient) -> None:
    sign_up(client)
    wrong = {"user_email": "demo@example.com", "password": "wrong-pass"}
    for _ in range(5):
        assert client.post("/api/login", json=wrong).status_code == 401
    blocked = client.post("/api/login", json=wrong)
    assert blocked.status_code == 429
    assert int(blocked.headers["Retry-After"]) > 0
    # Even the right password is blocked until the window passes
    assert client.post("/api/login", json={"user_email": "demo@example.com", "password": "a-long-password"}).status_code == 429


# ---------- Unit tests on RateLimiter itself (fake clock, so no waiting) ----------


def fake_request(ip: str) -> SimpleNamespace:
    """A stand-in for a FastAPI Request: the limiter only reads request.client.host."""
    return SimpleNamespace(client=SimpleNamespace(host=ip))


def test_limit_resets_after_the_window(monkeypatch: pytest.MonkeyPatch) -> None:
    clock = [1000.0]
    monkeypatch.setattr(rate_limit.time, "monotonic", lambda: clock[0])
    limiter = rate_limit.RateLimiter(max_requests=2, window_seconds=60)
    limiter(fake_request("1.1.1.1"))
    limiter(fake_request("1.1.1.1"))
    with pytest.raises(HTTPException) as blocked:
        limiter(fake_request("1.1.1.1"))
    assert blocked.value.status_code == 429
    assert blocked.value.headers["Retry-After"] == "60", "Retry-After should be the real seconds left"
    clock[0] += 61
    limiter(fake_request("1.1.1.1"))  # allowed again: no exception


def test_old_ips_are_removed_from_memory(monkeypatch: pytest.MonkeyPatch) -> None:
    clock = [1000.0]
    monkeypatch.setattr(rate_limit.time, "monotonic", lambda: clock[0])
    limiter = rate_limit.RateLimiter(max_requests=5, window_seconds=60)
    for n in range(1000):
        limiter(fake_request(f"10.0.{n // 256}.{n % 256}"))
    assert len(limiter._hits) == 1000
    clock[0] += 61                      # a window later, all 1000 IPs are stale
    limiter(fake_request("192.0.2.1"))  # the next request triggers the automatic clean-up
    assert len(limiter._hits) == 1, "Stale IPs should be removed so memory does not keep growing"


def test_recent_ips_are_kept_by_cleanup(monkeypatch: pytest.MonkeyPatch) -> None:
    clock = [1000.0]
    monkeypatch.setattr(rate_limit.time, "monotonic", lambda: clock[0])
    limiter = rate_limit.RateLimiter(max_requests=5, window_seconds=60)
    limiter(fake_request("old"))
    clock[0] += 50
    limiter(fake_request("recent"))
    clock[0] += 15                      # "old" is 65 s ago (expired), "recent" is 15 s ago (kept)
    limiter.cleanup_expired()
    assert set(limiter._hits) == {"recent"}
