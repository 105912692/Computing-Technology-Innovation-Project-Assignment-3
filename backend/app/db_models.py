"""SQLAlchemy tables for user accounts and their saved URL checks (PostgreSQL)."""

from typing import Any

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base   # the ONE shared Base - tables must use it so create_all() can find them


class UserData(Base):
    """An account that owns saved URL checks."""

    __tablename__ = "user_data"

    user_id: Mapped[int] = mapped_column(primary_key=True)
    user_name: Mapped[str] = mapped_column(String(20), nullable=False)
    user_email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)   # Argon2 hash only, never the password itself

    # ORM shortcut: user.histories gives this user's saved checks; deleting a user deletes them too
    histories: Mapped[list["HistoryData"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class HistoryData(Base):
    """One saved URL check, owned by a user."""

    __tablename__ = "history_data"

    history_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("user_data.user_id", ondelete="CASCADE"), nullable=False, index=True)
    # The saved check as PostgreSQL JSONB, e.g. {"url": ..., "label": ..., "phishingProbability": ...}
    data_saved: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    # ORM shortcut: history.user gives the owning account
    user: Mapped["UserData"] = relationship(back_populates="histories")
