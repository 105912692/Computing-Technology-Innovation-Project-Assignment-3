"""Request and response contracts shared with the front end (Pydantic models)."""

import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic_core import PydanticCustomError

from .settings import MAX_URL_LENGTH

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")  # simple shape check: something@something.something


class CheckRequest(BaseModel):
    """A URL to check. Anything else in the body, or a URL outside the length limits, returns 422."""

    model_config = ConfigDict(extra="forbid", json_schema_extra={"examples": [{"url": "example.com/login"}]})

    url: str = Field(min_length=1, max_length=MAX_URL_LENGTH, description="The URL to check")


class CheckResult(BaseModel):
    """The verdict for one URL."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [
            {"url": "example.com/login", "label": "phishing", "confidence": 0.85, "phishing_probability": 0.85}
        ]}
    )

    url: str = Field(description="The URL that was checked")
    label: Literal["phishing", "benign"] = Field(description="The model's verdict")
    confidence: float = Field(ge=0, le=1, description="How sure the model is of the label, from 0 to 1")
    phishing_probability: float = Field(
        ge=0, le=1,
        description="The model's probability that the URL is phishing, from 0 to 1 (same scale for every result; "
                    "at or above the threshold means phishing)",
    )


class HealthResponse(BaseModel):
    """Whether the server and the model are ready."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"status": "ok", "model": "MODEL_FINAL.joblib"}]})

    status: Literal["ok"]
    model: str = Field(description="Name of the loaded model")


class ErrorDetail(BaseModel):
    """One problem with the request, e.g. a field that failed validation."""

    field: str
    message: str


class ErrorBody(BaseModel):
    status: int
    message: str
    details: list[ErrorDetail] = []


class ErrorResponse(BaseModel):
    """The single JSON shape every error is returned in."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"error": {"status": 422, "message": "Request is not valid",
                                                   "details": [{"field": "body.url", "message": "String should have at least 1 character"}]}}]}
    )

    error: ErrorBody


# ---------- Users, login and saved history (PostgreSQL) ----------

def clean_email(value: str) -> str:
    """
    Trims and lower-cases an email and checks its shape.

    Args:
        value (str): The email as typed.

    Returns:
        str: The cleaned email.

    Raises:
        PydanticCustomError: If it does not look like an email (returned as a 422 with a readable message).
    """
    value = value.strip().lower()
    if not EMAIL_PATTERN.match(value):
        raise PydanticCustomError("email", "Enter a valid email address")
    return value


class UserCreate(BaseModel):
    """A new account. The password is hashed before it is stored and is never sent back."""

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"user_name": "demo", "user_email": "demo@example.com", "password": "a-long-password"}]},
    )

    user_name: str = Field(min_length=1, max_length=20, description="Display name (up to 20 characters)")
    user_email: str = Field(max_length=255, description="Email address, used once per account")
    password: str = Field(min_length=8, max_length=128, description="At least 8 characters")

    _clean_email = field_validator("user_email")(clean_email)


class LoginRequest(BaseModel):
    """Email and password to log in with."""

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"user_email": "demo@example.com", "password": "a-long-password"}]},
    )

    user_email: str = Field(max_length=255)
    password: str = Field(min_length=1, max_length=128)

    _clean_email = field_validator("user_email")(clean_email)


class TokenResponse(BaseModel):
    """A login token. Send it as "Authorization: Bearer <access_token>" on routes that need login."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"


class UserOut(BaseModel):
    """An account as returned to the client (no password)."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    user_name: str
    user_email: str


class SavedCheck(BaseModel):
    """One URL check as the front end stores it (same fields as an entry in useUrlHistory.js)."""

    model_config = ConfigDict(extra="forbid")

    id: str | None = Field(default=None, max_length=64, description="Front-end id of the entry")
    url: str = Field(min_length=1, max_length=MAX_URL_LENGTH)
    label: Literal["phishing", "benign"]
    confidence: float = Field(ge=0, le=1)
    phishingProbability: float | None = Field(default=None, ge=0, le=1)
    reasons: str = Field(default="", max_length=5000)
    time: int | None = Field(default=None, ge=0, description="How long the check took, in whole ms")
    checkedAt: str | None = Field(default=None, max_length=40, description="When it was checked (ISO 8601)")


class HistoryCreate(BaseModel):
    """One URL check to save for the logged-in user, stored as JSONB."""

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={"examples": [{"data_saved": {"url": "example.com/login", "label": "phishing", "confidence": 0.85,
                                                         "phishingProbability": 0.85, "time": 120,
                                                         "checkedAt": "2026-10-23T00:20:00.000Z"}}]},
    )

    data_saved: SavedCheck


class HistoryOut(BaseModel):
    """One saved check as returned to the client."""

    model_config = ConfigDict(from_attributes=True)

    history_id: int
    user_id: int
    data_saved: dict[str, Any]
