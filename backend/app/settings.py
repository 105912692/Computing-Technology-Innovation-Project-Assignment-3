"""Settings read from backend/.env, so nothing environment-specific or secret lives in the code."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

FRONTEND_ORIGIN: str = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")  # only origin allowed by CORS
MAX_URL_LENGTH: int = 2048  # longest URL accepted, enforced on the back end

# PostgreSQL address, e.g. postgresql+psycopg://app_user:password@localhost:5432/phishing (secret: only in .env).
# Optional for now, so the app still starts without a database; database.py stops with a clear error if it is used unset.
DATABASE_URL: str | None = os.environ.get("DATABASE_URL")

# Signs login tokens (JWT). Secret: only in .env. Make one with:  python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY: str | None = os.environ.get("SECRET_KEY")
ACCESS_TOKEN_MINUTES: int = 30  # how long a login lasts before the user must log in again

# Login rate limit (against password guessing): at most this many attempts per client IP per window
LOGIN_MAX_ATTEMPTS: int = 5
LOGIN_WINDOW_SECONDS: int = 60

# Largest request body accepted (bytes), checked before the body is read (app/body_limit.py). The biggest real request
# is one saved check (a few KB), so 64 KB leaves plenty of room while still stopping huge bodies.
MAX_REQUEST_BYTES: int = 64 * 1024
