"""
CarbonTrace Database Configuration and Session Management.

Provides the SQLAlchemy 2.x engine, declarative base, session factory,
and FastAPI database dependency for PostgreSQL.
"""

import os
from collections.abc import Generator
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# Load environment variables from .env file if present
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# PostgreSQL is the primary target database.
# Configurable via environment variable: DATABASE_URL
DEFAULT_DATABASE_URL = "postgresql+psycopg2://postgres:postgres@localhost:5432/carbontrace"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)

# Safe configuration: pass check_same_thread only if SQLite is explicitly configured in DATABASE_URL
connect_args: dict[str, object] = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# SQLAlchemy 2.x Engine
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,  # Validates connection health prior to checkout
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# SQLAlchemy 2.x Declarative Base
class Base(DeclarativeBase):
    """Declarative Base class for all CarbonTrace SQLAlchemy models."""
    pass


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency yielding a SQLAlchemy session.
    Guarantees the session is closed cleanly in all execution paths.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
