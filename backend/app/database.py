# backend/app/database.py
"""SQLAlchemy engine, session and Base for PostgreSQL. The address comes from DATABASE_URL in backend/.env."""

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .settings import DATABASE_URL

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Add it to backend/.env (see backend/.env.example).")

# pool_pre_ping: checks a pooled connection still works before using it (e.g. after PostgreSQL restarts)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    """Parent class of every table in db_models.py."""


def get_db() -> Iterator[Session]:
    """
    Gives one database session per request and always closes it afterwards.

    Yields:
        Session: The session for this request (use with Depends(get_db) in a route).
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()