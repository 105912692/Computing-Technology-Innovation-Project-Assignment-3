"""Request and response contracts shared with the front end (Pydantic models)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .settings import MAX_URL_LENGTH


class CheckRequest(BaseModel):
    """A URL to check. Anything else in the body, or a URL outside the length limits, returns 422."""

    model_config = ConfigDict(extra="forbid", json_schema_extra={"examples": [{"url": "example.com/login"}]})

    url: str = Field(min_length=1, max_length=MAX_URL_LENGTH, description="The URL to check")


class CheckResult(BaseModel):
    """The verdict for one URL."""

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"url": "example.com/login", "label": "phishing", "confidence": 0.85}]}
    )

    url: str = Field(description="The URL that was checked")
    label: Literal["phishing", "benign"] = Field(description="The model's verdict")
    confidence: float = Field(ge=0, le=1, description="How sure the model is of the label, from 0 to 1")


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


class MessageResponse(BaseModel):
    """A plain text message from the back end."""

    model_config = ConfigDict(json_schema_extra={"examples": [{"message": "THIS IS A FASTAPI RESPONSE MESSAGE CHECK!"}]})

    message: str