"""
Rejects request bodies that are too large (413), before the app reads or parses them.

Field limits (e.g. a URL of at most 2048 characters) only run AFTER the whole body has been read and parsed as JSON,
so on their own a client could still send a 100 MB body and make the server read it. This middleware stops that:
- a Content-Length header over the limit is rejected straight away, without reading the body;
- a body sent without Content-Length (chunked) is counted while it arrives and stopped once it passes the limit.
"""

from collections.abc import Awaitable, Callable, MutableMapping
from typing import Any

from fastapi import HTTPException
from starlette.types import ASGIApp, Receive, Scope, Send

from .errors import error_response

Message = MutableMapping[str, Any]


class BodySizeLimit:
    """Pure ASGI middleware: app.add_middleware(BodySizeLimit, max_bytes=65_536)."""

    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        """
        Wraps the app.

        Args:
            app (ASGIApp): The next app or middleware.
            max_bytes (int): The largest request body allowed, in bytes.
        """
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """
        Checks one request's size, then passes it on.

        Args:
            scope (Scope): The request details (method, path, headers ...).
            receive (Receive): Reads the body, in chunks.
            send (Send): Sends the response.
        """
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # 1. Declared size: reject before reading anything
        declared = dict(scope["headers"]).get(b"content-length")
        if declared is not None:
            if not declared.isdigit():
                await error_response(400, "Content-Length is not valid")(scope, receive, send)
                return
            if int(declared) > self.max_bytes:
                await self.too_large()(scope, receive, send)
                return

        # 2. Actual size: count the chunks as the app reads them (also catches a missing or wrong Content-Length)
        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    # FastAPI re-raises HTTPExceptions raised while reading the body, so this becomes the 413 below
                    raise HTTPException(413, self.message())
            return message

        await self.app(scope, limited_receive, send)

    def message(self) -> str:
        """
        The error message, with the limit in KB.

        Returns:
            str: e.g. "Request body is too large (limit 64 KB)".
        """
        return f"Request body is too large (limit {self.max_bytes // 1024} KB)"

    def too_large(self) -> Callable[[Scope, Receive, Send], Awaitable[None]]:
        """
        The 413 response in the standard error format.

        Returns:
            JSONResponse: {"error": {"status": 413, "message": "...", "details": []}}.
        """
        return error_response(413, self.message())
