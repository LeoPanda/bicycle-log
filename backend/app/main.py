import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select

from app.core.config import settings
from app.core.logger import setup_logging

logger = logging.getLogger("app.main")
from app.core.exceptions import generic_exception_handler
from app.core.database import init_db, engine

from app.models.category import PlaceCategory
from app.models.bike import Bike

from app.routers import (
    internal, bikes, place_categories, places, activities,
    stay_logs, tags, analytics, strava, routes, search
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
app.include_router(routes.router)
app.include_router(search.router)

# Mount Uploads directory for images
uploads_dir = os.path.join(os.path.dirname(settings.DATABASE_URL.replace("sqlite:///", "")), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Mount production React build static directory if available
production_static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(production_static_dir):
    assets_dir = os.path.join(production_static_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
    app.mount("/static", StaticFiles(directory=production_static_dir, html=True), name="static")

@app.on_event("startup")
def on_startup():
    init_db()
    
    # Seed / Sync initial categories if empty or missing
    with Session(engine) as session:
        default_categories = [
            ("宿泊施設", "ホテル・旅館・ゲストハウス等", "hotel", 10),
            ("カフェ", "カフェ・喫茶店・ベーカリー", "coffee", 20),
            ("レストラン", "レストラン・飲食店・食堂", "utensils", 30),
            ("コンビニ", "コンビニエンスストア・スーパー", "store", 40),
            ("公園", "公園・緑地・キャンプ場", "trees", 50),
            ("映画館", "映画館・シネマ", "film", 60),
            ("博物館・美術館", "博物館・美術館・文化施設", "landmark", 70),
            ("寺社・仏閣", "神社・寺院・教会", "church", 80),
            ("駅", "鉄道駅・バスターミナル", "train", 90),
            ("休憩スポット", "道の駅・休憩所・案内所", "coffee", 100),
            ("その他", "その他の施設・未分類", "map-pin", 110),
        ]

        existing_cats = {c.name: c for c in session.exec(select(PlaceCategory)).all()}

        # Migration mapping for old category names if present
        rename_map = {
            "寺社仏閣": "寺社・仏閣",
            "博物館": "博物館・美術館",
            "道の駅": "休憩スポット",
            "温泉": "休憩スポット",
        }
        for old_name, new_name in rename_map.items():
            if old_name in existing_cats and new_name not in existing_cats:
                cat = existing_cats[old_name]
                cat.name = new_name
                session.add(cat)
                session.commit()
                session.refresh(cat)
                existing_cats[new_name] = cat
                del existing_cats[old_name]

        for name, desc, icon, sort_order in default_categories:
            if name not in existing_cats:
                cat = PlaceCategory(name=name, description=desc, icon=icon, sort_order=sort_order)
                session.add(cat)
            else:
                cat = existing_cats[name]
                if getattr(cat, "sort_order", None) is None or cat.sort_order == 100:
                    cat.sort_order = sort_order
                    session.add(cat)
        session.commit()

from fastapi.responses import HTMLResponse, FileResponse

@app.get("/api/health")
def health_check():
    return {"status": "ok", "project": settings.PROJECT_NAME, "version": settings.APP_VERSION}

@app.get("/api/system/version")
def get_system_version():
    return {"version": settings.APP_VERSION}

@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not Found")
    target_file = os.path.join(production_static_dir, full_path)
    if os.path.isfile(target_file):
        return FileResponse(target_file)
    index_file = os.path.join(production_static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return HTMLResponse(content="<h1>bicycle-log Backend API Server</h1>")


