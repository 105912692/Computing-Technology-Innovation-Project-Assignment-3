"""
FastAPI app: the contract between the React front end and the model.

Run from the backend folder:  uvicorn app.main:app --host 127.0.0.1 --port 8000
Interactive API docs:          http://127.0.0.1:8000/docs
"""

from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import db_models
from .body_limit import BodySizeLimit
from .auth import CurrentUser, check_password, create_access_token, hash_password
from .database import Base, engine, get_db
from .errors import add_error_handlers
from .ml_model import load_model
from .rate_limit import RateLimiter
from .schemas import (CheckRequest, CheckResult, ErrorResponse, HealthResponse, HistoryCreate, HistoryOut,
                      LoginRequest, TokenResponse, UserCreate, UserOut)
from .settings import FRONTEND_ORIGIN, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_SECONDS, MAX_REQUEST_BYTES

model = load_model()  # loaded once at start-up, not on every request
Base.metadata.create_all(bind=engine)  # creates user_data and history_data if they do not exist yet (never drops data)

DbSession = Annotated[Session, Depends(get_db)]  # one database session per request, closed afterwards

app = FastAPI(
    title="Phishing URL Detection API",
    description="Checks whether a URL is phishing or benign, with the model's confidence.",
    version="0.1.0",
)
add_error_handlers(app)

# CORS: only our own front end may read responses from a browser
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

# Request size limit: bodies over MAX_REQUEST_BYTES get 413 before they are read (added last = runs first)
app.add_middleware(BodySizeLimit, max_bytes=MAX_REQUEST_BYTES)


def error_doc(code: int, description: str, message: str, details: list[dict[str, str]] | None = None) -> dict:
    """
    Describes one error response for /docs, with an example that matches that status code.

    Args:
        code (int): HTTP status code.
        description (str): When this error happens.
        message (str): The message the API returns.
        details (list[dict[str, str]] | None): Example per-field problems (for 422).

    Returns:
        dict: {code: {...}} to merge into a route's `responses`.
    """
    example = {"error": {"status": code, "message": message, "details": details or []}}
    return {code: {"model": ErrorResponse, "description": description, "content": {"application/json": {"example": example}}}}


ERRORS = error_doc(500, "Unexpected server error", "Something went wrong")


# READ  GET /api/health
#   Body:     none
#   200:      {"status": "ok", "model": "MODEL_FINAL.joblib"}
@app.get("/api/health", responses=ERRORS)
def check_server_health() -> HealthResponse:
    """Check that the server is running and which model is loaded."""
    return HealthResponse(status="ok", model=model.name)


# CHECK  POST /api/check  (runs the model; nothing is saved)
#   Body:     {"url": "example.com/login"}
#   200:      {"url": "example.com/login", "label": "phishing", "confidence": 0.85, "phishing_probability": 0.85}
#   422:      URL missing, empty or longer than 2048 characters
@app.post(
    "/api/check",
    responses={**error_doc(422, "The URL is missing, empty or too long", "Request is not valid",
                           [{"field": "body.url", "message": "String should have at least 1 character"}]), **ERRORS},
)
def check_phishing(request: CheckRequest) -> CheckResult:
    """Check one URL and return whether it is phishing or benign, with the model's confidence."""
    prediction = model.predict(request.url)
    return CheckResult(
        url=request.url,
        label=prediction.label,
        confidence=prediction.confidence,
        phishing_probability=prediction.phishing_probability,
    )


# ---------- Users, login and saved history (PostgreSQL) ----------
# The ORM sends every value as a query parameter, never pasted into the SQL, which prevents SQL injection.
# Routes with `user: CurrentUser` need "Authorization: Bearer <token>" from /api/login, and only ever touch that user's rows.

AUTH = error_doc(401, "Not logged in, or the login has expired", "Not logged in or session expired")
INVALID = error_doc(422, "The request body is not valid", "Request is not valid",
                    [{"field": "body.user_email", "message": "Enter a valid email address"}])
login_rate_limit = RateLimiter(LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_SECONDS)  # 5 login attempts per minute per IP


# CREATE  POST /api/users  (sign up)
#   Body:     {"user_name": "demo", "user_email": "demo@example.com", "password": "a-long-password"}
#   201:      {"user_id": 1, "user_name": "demo", "user_email": "demo@example.com"}
#   409:      email already registered     422: name > 20 chars, invalid email, password < 8 chars, extra fields
@app.post(
    "/api/users",
    status_code=status.HTTP_201_CREATED,
    responses={**error_doc(409, "The email is already registered", "Email is already registered"), **INVALID, **ERRORS},
)
def create_user(new_user: UserCreate, db: DbSession) -> UserOut:
    """Create an account (sign up). Only a hash of the password is stored."""
    user = db_models.UserData(
        user_name=new_user.user_name,
        user_email=new_user.user_email,
        password_hash=hash_password(new_user.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:  # the UNIQUE constraint on user_email
        db.rollback()
        raise HTTPException(status_code=409, detail="Email is already registered")
    db.refresh(user)
    return UserOut.model_validate(user)


# LOGIN  POST /api/login
#   Body:     {"user_email": "demo@example.com", "password": "a-long-password"}
#   200:      {"access_token": "eyJhbGciOi...", "token_type": "bearer"}   (send as the Authorization header, lasts 30 min)
#   401:      {"error": {"status": 401, "message": "Incorrect email or password", "details": []}}
#   429:      more than 5 attempts per minute from one IP (Retry-After header says how many seconds to wait)
@app.post(
    "/api/login",
    dependencies=[Depends(login_rate_limit)],
    responses={
        **error_doc(401, "Wrong email or password", "Incorrect email or password"),
        **error_doc(429, "More than 5 login attempts in a minute from this IP (see the Retry-After header)",
                    "Too many attempts. Try again later."),
        **INVALID, **ERRORS,
    },
)
def login(credentials: LoginRequest, db: DbSession) -> TokenResponse:
    """Log in with email and password. Returns a token that lasts 30 minutes."""
    user = db.scalars(select(db_models.UserData).where(db_models.UserData.user_email == credentials.user_email)).first()
    if not check_password(credentials.password, user.password_hash if user else None):
        # Same message for a wrong email or a wrong password, so attackers cannot find out which emails exist
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return TokenResponse(access_token=create_access_token(user.user_id))


# READ  GET /api/me  (my account)
#   Header:   Authorization: Bearer <access_token from /api/login>
#   Body:     none
#   200:      {"user_id": 1, "user_name": "demo", "user_email": "demo@example.com"}
#   401:      no token, invalid token or expired token
@app.get("/api/me", responses={**AUTH, **ERRORS})
def get_my_account(user: CurrentUser) -> UserOut:
    """The logged-in user's account."""
    return UserOut.model_validate(user)


# DELETE  DELETE /api/me  (my account and, by cascade, all my saved checks)
#   Header:   Authorization: Bearer <access_token from /api/login>
#   Body:     none
#   204:      no body          401: not logged in
@app.delete("/api/me", status_code=status.HTTP_204_NO_CONTENT, responses={**AUTH, **ERRORS})
def delete_my_account(user: CurrentUser, db: DbSession) -> Response:
    """Delete the logged-in user's account and all their saved checks."""
    db.delete(user)  # same session as get_current_user (FastAPI shares get_db within one request)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# CREATE  POST /api/history  (save one check for the logged-in user)
#   Header:   Authorization: Bearer <access_token from /api/login>
#   Body:     {"data_saved": {"id": "3f2b...", "url": "example.com/login", "label": "phishing", "confidence": 0.85,
#                             "phishingProbability": 0.85, "reasons": "", "time": 120, "checkedAt": "2026-10-23T00:20:00.000Z"}}
#             required: url, label ("phishing" | "benign"), confidence (0-1); the others are optional
#   201:      {"history_id": 1, "user_id": 1, "data_saved": {...the same fields...}}
#   401:      not logged in     422: wrong type, unknown label, value out of range, extra fields
@app.post("/api/history", status_code=status.HTTP_201_CREATED, responses={**AUTH, **INVALID, **ERRORS})
def save_user_history(entry: HistoryCreate, user: CurrentUser, db: DbSession) -> HistoryOut:
    """Save one URL check for the logged-in user."""
    history = db_models.HistoryData(user_id=user.user_id, data_saved=entry.data_saved.model_dump())
    db.add(history)
    db.commit()
    db.refresh(history)
    return HistoryOut.model_validate(history)


# READ  GET /api/history  (all my saved checks, newest first)
#   Header:   Authorization: Bearer <access_token from /api/login>
#   Body:     none
#   200:      [{"history_id": 2, "user_id": 1, "data_saved": {...}}, {"history_id": 1, "user_id": 1, "data_saved": {...}}]
#             ([] when there are none)     401: not logged in
@app.get("/api/history", responses={**AUTH, **ERRORS})
def list_user_history(user: CurrentUser, db: DbSession) -> list[HistoryOut]:
    """List the logged-in user's saved checks, newest first."""
    rows = db.scalars(
        select(db_models.HistoryData)
        .where(db_models.HistoryData.user_id == user.user_id)
        .order_by(db_models.HistoryData.history_id.desc())
    ).all()
    return [HistoryOut.model_validate(row) for row in rows]


# DELETE  DELETE /api/history  (all my saved checks)
#   Header:   Authorization: Bearer <access_token from /api/login>
#   Body:     none
#   204:      no body          401: not logged in
@app.delete("/api/history", status_code=status.HTTP_204_NO_CONTENT, responses={**AUTH, **ERRORS})
def clear_all_history(user: CurrentUser, db: DbSession) -> Response:
    """Delete all of the logged-in user's saved checks."""
    db.execute(delete(db_models.HistoryData).where(db_models.HistoryData.user_id == user.user_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# DELETE  DELETE /api/history/{history_id}  (one of my saved checks), e.g. DELETE /api/history/1
#   Header:   Authorization: Bearer <access_token from /api/login>
#   Body:     none
#   204:      no body          401: not logged in     404: no such id, or it belongs to another user
@app.delete(
    "/api/history/{history_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={**AUTH, **error_doc(404, "No saved check with this id for this user", "Saved check not found"), **ERRORS},
)
def delete_single_history_entry(history_id: int, user: CurrentUser, db: DbSession) -> Response:
    """Delete one of the logged-in user's saved checks."""
    history = db.get(db_models.HistoryData, history_id)
    # Someone else's entry gets the same 404 as a missing one, so ids of other users' data are not revealed
    if history is None or history.user_id != user.user_id:
        raise HTTPException(status_code=404, detail="Saved check not found")
    db.delete(history)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
