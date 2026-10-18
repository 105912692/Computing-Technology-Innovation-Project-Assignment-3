"""Settings read from backend/.env, so nothing environment-specific or secret lives in the code."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

FRONTEND_ORIGIN: str = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")  # only origin allowed by CORS
MAX_URL_LENGTH: int = 2048  # longest URL accepted, enforced on the back end
