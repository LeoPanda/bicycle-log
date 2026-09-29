import os
from sqlmodel import SQLModel, create_engine, Session, text
from app.core.config import settings

# Ensure data directory exists
db_path = settings.DATABASE_URL.replace("sqlite:///", "")
db_dir = os.path.dirname(db_path)
if db_dir and not os.path.exists(db_dir):
    os.makedirs(db_dir, exist_ok=True)

connect_args = {"check_same_thread": False}
engine = create_engine(settings.DATABASE_URL, echo=settings.SQL_ECHO, connect_args=connect_args)

def init_db():
    # Enable PRAGMAs for SQLite
    with engine.connect() as conn:
        conn.execute(text("PRAGMA foreign_keys=ON;"))
        conn.execute(text("PRAGMA journal_mode=WAL;"))
        conn.commit()

    # Import models so SQLModel metadata is populated
    import app.models  # noqa

    SQLModel.metadata.create_all(engine)

    # Create view place_visit_summaries and indexes
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE VIEW IF NOT EXISTS place_visit_summaries AS
            SELECT 
                p.id AS place_id,
                p.name AS place_name,
                p.category_id,
                c.name AS category_name,
                p.address,
                p.latitude,
                p.longitude,
                COUNT(s.id) AS visit_count,
                SUM(s.stay_duration_seconds) AS total_stay_seconds,
                MAX(s.arrived_at) AS last_visited_at
            FROM places p
            LEFT JOIN place_categories c ON p.category_id = c.id
            JOIN stay_logs s ON p.id = s.place_id
            GROUP BY p.id;
        """))
        
        # Indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activities_bike_id ON activities(bike_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activities_start_date ON activities(start_date);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_places_category_id ON places(category_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_places_lat_lng ON places(latitude, longitude);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stay_logs_activity_id ON stay_logs(activity_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stay_logs_place_id ON stay_logs(place_id);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stay_logs_arrived_at ON stay_logs(arrived_at);"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_stay_log_images_stay_log_id ON stay_log_images(stay_log_id);"))
        
        # Add route_id column to activities if not exists
        try:
            conn.execute(text("ALTER TABLE activities ADD COLUMN route_id INTEGER REFERENCES routes(id);"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_activities_route_id ON activities(route_id);"))
        except Exception:
            pass  # Column likely already exists
        conn.commit()

def get_session():
    with Session(engine) as session:
        yield session
