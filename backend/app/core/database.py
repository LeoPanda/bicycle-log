import logging
import os

from alembic.config import Config
from sqlalchemy import create_engine, event
from sqlmodel import Session

from alembic import command
from app.core.config import settings

logger = logging.getLogger(__name__)

# Ensure data directory exists
db_path = settings.DATABASE_URL.replace("sqlite:///", "")
db_dir = os.path.dirname(db_path)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

connect_args = {
    "check_same_thread": False,
    "timeout": 5.0,
}
engine = create_engine(settings.DATABASE_URL, echo=settings.SQL_ECHO, connect_args=connect_args)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON;")
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.execute("PRAGMA busy_timeout=5000;")
    cursor.close()

def init_db():
    """Run Alembic migrations to upgrade database to head."""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
        alembic_ini_path = os.path.join(backend_dir, "alembic.ini")
        if os.path.exists(alembic_ini_path):
            alembic_cfg = Config(alembic_ini_path)
            # Ensure alembic script_location is resolved correctly
            alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
            command.upgrade(alembic_cfg, "head")
            logger.info("Alembic database migrations applied successfully.")
    except Exception as e:
        logger.error(f"Error during database migration: {e}")
        raise

def get_session():
    with Session(engine) as session:
        yield session
