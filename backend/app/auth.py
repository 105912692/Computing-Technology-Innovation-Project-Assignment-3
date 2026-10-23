"""Login: password hashing, login tokens (JWT) and finding the logged-in user for a request."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from . import db_models
from .database import get_db
from .settings import ACCESS_TOKEN_MINUTES, SECRET_KEY

if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY is missing or shorter than 32 characters. Add it to backend/.env (see backend/.env.example).")

ALGORITHM = "HS256"
password_hash = PasswordHash.recommended()  # Argon2: a slow, salted hash, so stolen hashes are hard to reverse
DUMMY_HASH = password_hash.hash("not-a-real-password")  # checked when the email is unknown, so both cases take the same time
bearer = HTTPBearer(auto_error=False)  # reads "Authorization: Bearer <token>"; adds the Authorize button to /docs

NOT_LOGGED_IN = HTTPException(status_code=401, detail="Not logged in or session expired",
                              headers={"WWW-Authenticate": "Bearer"})


def hash_password(password: str) -> str:
    """
    Hashes a password for storage.

    Args:
        password (str): The plain password.

    Returns:
        str: The Argon2 hash (includes its own random salt).
    """
    return password_hash.hash(password)


def check_password(password: str, stored_hash: str | None) -> bool:
    """
    Checks a password against a stored hash, taking the same time even when there is no user.

    Args:
        password (str): The password typed at login.
        stored_hash (str | None): The user's stored hash, or None if the email is not registered.

    Returns:
        bool: True only if the user exists and the password matches.
    """
    return password_hash.verify(password, stored_hash or DUMMY_HASH) and stored_hash is not None


def create_access_token(user_id: int) -> str:
    """
    Makes a signed login token that expires after ACCESS_TOKEN_MINUTES.

    Args:
        user_id (int): The user the token belongs to.

    Returns:
        str: The token (JWT) to send as "Authorization: Bearer <token>".
    """
    expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> db_models.UserData:
    """
    Finds the logged-in user from the request's token.

    Args:
        credentials (HTTPAuthorizationCredentials | None): The bearer token, if one was sent.
        db (Session): The request's database session.

    Returns:
        db_models.UserData: The user the token belongs to.

    Raises:
        HTTPException: 401 if the token is missing, invalid, expired, or its user no longer exists.
    """
    if credentials is None:
        raise NOT_LOGGED_IN
    try:
        # algorithms is fixed, so a token signed another way (e.g. "none") is rejected
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise NOT_LOGGED_IN
    user = db.get(db_models.UserData, user_id)
    if user is None:
        raise NOT_LOGGED_IN
    return user


CurrentUser = Annotated[db_models.UserData, Depends(get_current_user)]  # add to a route to require login
