"""A small in-memory rate limiter, used to slow down password guessing on /api/login."""

import math
import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


class RateLimiter:
    """
    Allows at most `max_requests` per client IP in any `window_seconds` (sliding window log).

    Kept in memory, so it resets when the server restarts and is per server process.
    IPs with no recent requests are removed about once per window, so memory does not grow with every IP ever seen.
    """

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        """
        Sets the limit.

        Args:
            max_requests (int): Requests allowed per client in one window.
            window_seconds (int): Length of the window in seconds.
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()  # plain `def` routes run in a thread pool, so two requests can arrive at once
        self._last_cleanup = time.monotonic()

    def __call__(self, request: Request) -> None:
        """
        Records one request and rejects it if the client is over the limit (used with Depends).

        Args:
            request (Request): The incoming request; its client IP is the key.

        Raises:
            HTTPException: 429 with a Retry-After header (seconds) when the limit is reached.
        """
        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with self._lock:
            if now - self._last_cleanup >= self.window_seconds:  # at most once per window, so it stays cheap
                self._remove_expired(now)
            hits = self._hits[key]
            while hits and hits[0] <= now - self.window_seconds:  # forget requests older than the window
                hits.popleft()
            if len(hits) >= self.max_requests:
                retry_after = math.ceil(hits[0] + self.window_seconds - now)
                raise HTTPException(status_code=429, detail="Too many attempts. Try again later.",
                                    headers={"Retry-After": str(retry_after)})
            hits.append(now)

    def cleanup_expired(self) -> None:
        """Removes every IP whose requests are all older than the window (also runs automatically, see __call__)."""
        with self._lock:
            self._remove_expired(time.monotonic())

    def _remove_expired(self, now: float) -> None:
        """
        Deletes IPs with no request inside the window. The caller must already hold the lock.

        Kept separate from cleanup_expired because threading.Lock cannot be taken twice by the same thread:
        calling cleanup_expired from inside __call__ (which holds the lock) would wait forever.

        Args:
            now (float): The current time.monotonic() value.
        """
        cutoff = now - self.window_seconds
        expired = [ip for ip, hits in self._hits.items() if not hits or hits[-1] <= cutoff]  # newest is old: all are
        for ip in expired:
            del self._hits[ip]
        self._last_cleanup = now

    def reset(self) -> None:
        """Forgets all counts (used by the tests)."""
        with self._lock:
            self._hits.clear()
            self._last_cleanup = time.monotonic()
