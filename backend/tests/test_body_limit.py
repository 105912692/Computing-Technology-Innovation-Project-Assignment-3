"""Tests for the request size limit (app/body_limit.py, brief 2.3): bodies over MAX_REQUEST_BYTES get 413."""

from fastapi.testclient import TestClient

from app.settings import MAX_REQUEST_BYTES
from tests.helpers import CHECK, error_message, log_in, sign_up


def test_oversized_body_is_413_in_the_standard_format(client: TestClient) -> None:
    response = client.post("/api/check", content=b"x" * (MAX_REQUEST_BYTES + 1),
                           headers={"Content-Type": "application/json"})
    assert response.status_code == 413
    assert response.json()["error"]["status"] == 413
    assert "too large" in error_message(response)


def test_oversized_chunked_body_without_content_length_is_413(client: TestClient) -> None:
    def chunks():   # no Content-Length header: the size is only known while reading
        for _ in range(MAX_REQUEST_BYTES // 1024 + 2):
            yield b"x" * 1024

    response = client.post("/api/check", content=chunks(), headers={"Content-Type": "application/json"})
    assert response.status_code == 413


def test_invalid_content_length_is_400(client: TestClient) -> None:
    response = client.post("/api/check", content=b"{}", headers={"Content-Type": "application/json",
                                                                 "Content-Length": "abc"})
    assert response.status_code == 400


def test_normal_requests_are_not_affected(client: TestClient) -> None:
    assert client.post("/api/check", json={"url": "https://example.com"}).status_code == 200
    sign_up(client)
    headers = log_in(client)
    biggest = {**CHECK, "url": "https://example.com/" + "a" * 2000, "reasons": "r" * 5000}
    assert client.post("/api/history", json={"data_saved": biggest}, headers=headers).status_code == 201
