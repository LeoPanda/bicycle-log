import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from app.core.config import settings
from app.core.logger import setup_logging
from app.core.exceptions import generic_exception_handler
from app.core.database import init_db, engine

from app.models.category import PlaceCategory
from app.models.bike import Bike

from app.routers import (
    internal, bikes, place_categories, places, activities,
    stay_logs, tags, analytics, strava
)

# Setup JSON logging
setup_logging()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
app.add_exception_handler(Exception, generic_exception_handler)

# Include Routers
app.include_router(internal.router)
app.include_router(bikes.router)
app.include_router(place_categories.router)
app.include_router(places.router)
app.include_router(activities.router)
app.include_router(stay_logs.router)
app.include_router(tags.router)
app.include_router(analytics.router)
app.include_router(strava.router)

# Mount Uploads directory for images
uploads_dir = os.path.join(os.path.dirname(settings.DATABASE_URL.replace("sqlite:///", "")), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Mount production React build static directory if available
production_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(production_static_dir):
    app.mount("/static", StaticFiles(directory=production_static_dir, html=True), name="static")

@app.on_event("startup")
def on_startup():
    init_db()
    
    # Seed initial categories and bike if empty
    with Session(engine) as session:
        existing_cats = session.exec(select(PlaceCategory)).all()
        if not existing_cats:
            seed_categories = [
                PlaceCategory(name="カフェ", description="カフェ・喫茶店・ベーカリー", icon="coffee"),
                PlaceCategory(name="道の駅", description="道の駅・ドライブイン・観光案内所", icon="shopping-bag"),
                PlaceCategory(name="レストラン", description="レストラン・飲食店・食堂", icon="utensils"),
                PlaceCategory(name="公園", description="公園・緑地・展望台", icon="trees"),
                PlaceCategory(name="コンビニ", description="コンビニエンスストア・商店", icon="store"),
                PlaceCategory(name="未分類", description="未分類の滞在スポット", icon="map-pin"),
            ]
            for cat in seed_categories:
                session.add(cat)
            session.commit()
            
        existing_bikes = session.exec(select(Bike)).all()
        if not existing_bikes:
            default_bike = Bike(
                bike_code="BIKE-01",
                name="メインロードバイク",
                brand="Specialized",
                model="Tarmac SL7",
                notes="700C / Di2 コンポーネント"
            )
            session.add(default_bike)
            session.commit()

        # Seed mock activity & stay log data for demo test
        from app.services.strava_service import sync_strava_activities
        sync_strava_activities(session)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.VERSION}
