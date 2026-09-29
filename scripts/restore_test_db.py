import os
import sys
from datetime import datetime, timezone, timedelta

# backend ディレクトリを pythonpath に追加
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.core.config import settings
from app.core.database import engine, init_db
from app.models.bike import Bike
from app.models.category import PlaceCategory
from app.models.route import Route
from app.models.tag import Tag
from app.models.activity import Activity
from app.models.place import Place
from app.models.stay_log import StayLog
from sqlmodel import Session

def reset_and_seed_db():
    # 接続プールを破棄
    engine.dispose()
    
    # DB ファイルおよび WAL / SHM ファイルを直接完全削除してクリーンアップ
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    for ext in ["", "-shm", "-wal"]:
        target_path = db_path + ext
        if os.path.exists(target_path):
            try:
                os.remove(target_path)
            except Exception as e:
                print(f"Warning: could not remove {target_path}: {e}")
            
    # テーブル・インデックス・ビューの全再生成
    init_db()
    
    jst = timezone(timedelta(hours=9))

    with Session(engine) as session:
        # 初期マスタデータのクリーンシード
        # 自転車マスタ
        bike1 = Bike(bike_code="BIKE-001", name="Road Bike Alpha", brand="Trek", model="Emonda")
        bike2 = Bike(bike_code="BIKE-002", name="Gravel Bike Beta", brand="Cannondale", model="Topstone")
        session.add(bike1)
        session.add(bike2)
        
        # カテゴリマスタ
        cat_cafe = PlaceCategory(name="カフェ", icon_name="coffee", description="喫茶・カフェ", sort_order=10)
        cat_park = PlaceCategory(name="公園", icon_name="tree", description="公園・景勝地", sort_order=20)
        cat_station = PlaceCategory(name="道の駅", icon_name="store", description="道の駅・休憩所", sort_order=30)
        session.add(cat_cafe)
        session.add(cat_park)
        session.add(cat_station)
        
        # タグマスタ
        tag_hill = Tag(name="ヒルクライム", color="#ff5722")
        tag_long = Tag(name="ロングライド", color="#2196f3")
        session.add(tag_hill)
        session.add(tag_long)
        
        session.commit()
        
        # スポット & アクティビティシード
        place1 = Place(
            id="place_test_01",
            name="山頂カフェ",
            category_id=cat_cafe.id,
            address="東京都西多摩郡奥多摩町",
            latitude=35.805,
            longitude=139.105
        )
        session.add(place1)
        session.commit()

        act1 = Activity(
            id=1001,
            name="奥多摩ヒルクライムライド",
            distance=45.5,
            total_elevation_gain=850.0,
            moving_time=7200,
            elapsed_time=9000,
            start_date=datetime(2026, 8, 20, 8, 0, 0, tzinfo=jst),
            summary_polyline="sample_polyline_data",
            bike_id=bike1.id,
            calories=1200.0
        )
        session.add(act1)
        session.commit()

        stay1 = StayLog(
            activity_id=act1.id,
            place_id=place1.id,
            arrived_at=datetime(2026, 8, 20, 10, 0, 0, tzinfo=jst),
            left_at=datetime(2026, 8, 20, 10, 45, 0, tzinfo=jst),
            stay_duration_seconds=2700,
            notes="アイスコーヒーで休憩",
            stay_latitude=35.805,
            stay_longitude=139.105
        )
        session.add(stay1)
        session.commit()
        
    engine.dispose()

if __name__ == "__main__":
    reset_and_seed_db()
