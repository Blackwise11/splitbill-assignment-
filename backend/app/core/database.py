"""Database engine and session management."""

from collections.abc import Iterator

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def create_db_engine(database_url: str) -> Engine:
    """Create an engine with SQLite test-friendly settings where needed."""
    is_sqlite = database_url.startswith("sqlite")
    connect_args: dict[str, object] = {}
    if is_sqlite:
        connect_args["check_same_thread"] = False
        connect_args["timeout"] = 30

    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        connect_args=connect_args,
    )

    if is_sqlite:

        @event.listens_for(engine, "connect")
        def _configure_sqlite(dbapi_connection: object, _: object) -> None:
            cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=30000")
            cursor.close()

    return engine


engine = create_db_engine(settings.database_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    """FastAPI dependency that yields one transaction-scoped session."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
