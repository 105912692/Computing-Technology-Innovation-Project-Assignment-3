"""
Test setup: points the app at a SEPARATE test database, then gives each test empty tables and a client.

Needs TEST_DATABASE_URL in backend/.env (a different database from DATABASE_URL, because every test wipes it).
"""

import os
from collections.abc import Iterator
from pathlib import Path

import pytest
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if not TEST_DATABASE_URL:
    pytest.exit("TEST_DATABASE_URL is not set in backend/.env (see backend/.env.example and the README).", returncode=1)
if TEST_DATABASE_URL == os.environ.get("DATABASE_URL"):
    pytest.exit("TEST_DATABASE_URL must be a different database from DATABASE_URL: the tests delete all its data.", returncode=1)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL  # must happen before the app is imported, as it connects on import

from fastapi.testclient import TestClient  # noqa: E402  (imported after the environment is set)

from app.database import Base, engine  # noqa: E402
from app.main import app, login_rate_limit  # noqa: E402


@pytest.fixture
def client() -> Iterator[TestClient]:
    """
    A test client with empty tables and a fresh login rate limit.

    Yields:
        TestClient: Sends requests straight to the app (no server needed).
    """
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    login_rate_limit.reset()
    with TestClient(app) as test_client:
        yield test_client
