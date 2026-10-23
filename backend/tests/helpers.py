"""Shared helpers for the tests (not tests themselves, so the file name does not start with test_)."""

from fastapi.testclient import TestClient

# One saved check, in the same shape the front end stores (see SavedCheck in app/schemas.py)
CHECK = {"id": "abc", "url": "example.com/login", "label": "phishing", "confidence": 0.85,
         "phishingProbability": 0.85, "reasons": "", "time": 120, "checkedAt": "2026-10-23T00:20:00.000Z"}


def sign_up(client: TestClient, name: str = "demo", email: str = "demo@example.com",
            password: str = "a-long-password") -> dict:
    """
    Creates an account through POST /api/users.

    Args:
        client (TestClient): The test client.
        name (str): User name.
        email (str): Email address.
        password (str): Password.

    Returns:
        dict: The response body, e.g. {"user_id": 1, "user_name": "demo", "user_email": "demo@example.com"}.
    """
    response = client.post("/api/users", json={"user_name": name, "user_email": email, "password": password})
    assert response.status_code == 201, response.text
    return response.json()


def log_in(client: TestClient, email: str = "demo@example.com", password: str = "a-long-password") -> dict[str, str]:
    """
    Logs in through POST /api/login.

    Args:
        client (TestClient): The test client.
        email (str): Email address.
        password (str): Password.

    Returns:
        dict[str, str]: The Authorization header to send on routes that need login.
    """
    response = client.post("/api/login", json={"user_email": email, "password": password})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def error_message(response) -> str:
    """
    Reads the message from the standard error format.

    Args:
        response: A response whose body is {"error": {"status", "message", "details"}}.

    Returns:
        str: The error message.
    """
    return response.json()["error"]["message"]
