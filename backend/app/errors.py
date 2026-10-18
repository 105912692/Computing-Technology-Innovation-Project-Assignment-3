"""Returns every error, including unexpected ones, in one JSON shape with no internal details."""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)


def error_response(status: int, message: str, details: list[dict[str, str]] | None = None,
                   headers: dict[str, str] | None = None) -> JSONResponse:
    """
    Builds the standard error response.

    Args:
        status (int): HTTP status code.
        message (str): Short message safe to show the user.
        details (list[dict[str, str]] | None): Optional per-field problems.
        headers (dict[str, str] | None): Headers the error must keep, e.g. Allow on a 405.

    Returns:
        JSONResponse: {"error": {"status", "message", "details"}}.
    """
    return JSONResponse(status_code=status, content={"error": {"status": status, "message": message, "details": details or []}},
                        headers=headers)


async def http_error(request: Request, error: HTTPException) -> JSONResponse:
    """Errors raised on purpose (404, 405 ...)."""
    return error_response(error.status_code, str(error.detail), headers=error.headers)


async def validation_error(request: Request, error: RequestValidationError) -> JSONResponse:
    """Input that does not match a Pydantic contract (422)."""
    details = [{"field": ".".join(str(part) for part in problem["loc"]), "message": problem["msg"]} for problem in error.errors()]
    return error_response(422, "Request is not valid", details)


async def unexpected_error(request: Request, error: Exception) -> JSONResponse:
    """Anything else (500). The full error goes to the server log, never to the client."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return error_response(500, "Something went wrong")


def add_error_handlers(app: FastAPI) -> None:
    """Registers the three handlers on the app."""
    app.add_exception_handler(HTTPException, http_error)
    app.add_exception_handler(RequestValidationError, validation_error)
    app.add_exception_handler(Exception, unexpected_error)
