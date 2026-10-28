# STAGE 4 詳細作業手順書: バックエンドリファクタリングとAlembic統合

- **ステージ番号**: STAGE 4
- **主担当エージェント**: 💻 バックエンドエンジニア (`backend-engineer`)
- **統括**: 👑 プロジェクトコンダクター (`conductor`)
- **目的**: バックエンドコードを V2.6 アーキテクチャ規約（AST適応度、DTO完全分離、Alembic厳格運用、400行制限、レイヤーバイパス排除、IAP二重検証、生SQL排除）に 100% 適合させ、かつ本番データを 100% 保全する。
- **所要想定時間**: 1〜2 セッション
- **スレッドクローズ基準**: バックエンド単体テスト合格およびデータ整合性検証完了後、ユーザー承認を得て Git コミットを実施。

---

## 1. Alembic マイグレーション基盤の導入とデータ保全

手動生SQL DDL（`database.py:59`）を完全撤廃し、SQLAlchemy + Alembic による決定論的マイグレーションへ移行する。既存の `data/app.db` を破壊しないよう、ベースラインマイグレーションを慎重に適用する。

### 実行手順
1. **Alembic 環境初期化**:
   - `backend/alembic.ini` および `backend/alembic/` をスケルトンから配備。
   - `alembic/env.py` で `backend/app/models` のメタデータを参照するよう設定。
2. **既存スキーマのベースライン化**:
   - 現行モデルに基づく初回マイグレーションファイル `alembic/versions/0001_initial_baseline.py` を生成。
   - 生の `data/app.db` に対し `alembic stamp head` を実行し、既存データを維持したまま Alembic 管理下に収容する。
3. **生SQL DDL の撤廃**:
   - `backend/app/core/database.py` の `CREATE TABLE IF NOT EXISTS ...` 生SQLコードを完全削除。
4. **データ整合性検証**:
   - マイグレーション適用後にレコード件数を取得し、STAGE 1 で取得した `backup/v2.0.0_snapshots/record_counts_baseline.txt` と 1 件の狂いもなく一致することを確認。

---

## 2. DTO層（`backend/app/schemas/`）の新設とレイヤーバイパス解消

ルーターから `models` への直接アクセス（`[HG-005]` 違反）を排除し、Clean Architecture を確立する。

### 新設する DTO モジュール
- `backend/app/schemas/bike.py` (BikeCreate, BikeUpdate, BikeResponse)
- `backend/app/schemas/activity.py` (ActivityResponse, ActivitySyncRequest)
- `backend/app/schemas/place.py` (PlaceCreate, PlaceResponse, PlaceSearchQuery)
- `backend/app/schemas/stay_log.py` (StayLogCreate, StayLogResponse)
- `backend/app/schemas/route.py` (RouteResponse, RouteMatchRequest)
- `backend/app/schemas/tag.py` (TagResponse, TagCreate)
- `backend/app/schemas/analytics.py` (AnalyticsSummaryResponse, DistanceChartData)

### ルーターのリファクタリング
- `backend/app/routers/*.py` において、`models` からの直接インポートをすべて削除。
- 入出力はすべて `schemas/` の Pydantic モデルで行い、データアクセスおよびビジネスロジックは `services/` 経由で実行する。

---

## 3. バックエンド行数超過（400行制限）是正

`backend/app/services/strava_service.py` (417行) を責務に応じて物理分割する。

### 分割構成
1. `backend/app/services/strava_client.py`:
   - Strava OAuth2 トークンリフレッシュ、REST API 通信（HTTP クライアント処理）。
2. `backend/app/services/strava_parser.py`:
   - アクティビティストリーム解析、GPS 緯度経度・標高・速度データのパース処理。
3. `backend/app/services/strava_service.py` (オーケストレーション / 200行程度):
   - 同期処理のメインフロー、DB への格納ロジック。

---

## 4. コア機能の統合・セキュリティ・例外処理

1. **IAP JWT 署名検証ミドルウェア (`backend/app/core/auth.py`)**:
   - Google Cloud IAP の `X-Goog-IAP-JWT-Assertion` ヘッダーを検証するミドルウェアを導入。
   - 開発環境（`ENV=development`）ではモックバイパス可能としつつ、本番（Cloud Run）での二重防御を確立。
2. **外部API二重キャッシュ機構 (`backend/app/core/cache.py`)**:
   - Google Places API および Strava API のレスポンスをメモリ（TTLキャッシュ）および SQLite キャッシュテーブルへ保存し、不要な課金・レートリミットを防止。
3. **Pydantic Settings (`backend/app/core/config.py`)**:
   - 必須環境変数（`DATABASE_URL`, `APP_VERSION`, `INTERNAL_AI_TOKEN` 等）の起動時即死ガードを実装。
4. **例外握りつぶし (`except: pass`) の完全排除**:
   - `core/database.py`, `services/image_service.py` 等で発見された握りつぶしをログ記録（`logger.error`）と適切な `HTTPException` 送出へ修正。

---

## 5. 検査と完了確認

### 実行コマンド
```bash
# 1. バックエンド規約チェック
python3 scripts/harness_guard.py --files backend/app/

# 2. 単体テスト実行
pytest backend/tests/ -v

# 3. データ整合性チェック
python3 scripts/restore_test_db.py --verify-only
```

---

## 6. スレッドクローズと承認ゲート（Git Commit 準備）

コンダクターは以下のサマリをユーザーに提示し、承認を仰ぐ。

### ユーザー確認項目
- [ ] Alembic が正常導入され、生SQL DDL が撤廃されたこと。
- [ ] レコード件数が改訂前と完全に一致していること（データ損失ゼロ）。
- [ ] `backend/app/schemas/` が新設され、ルーターからの `models` 直接インポートが 0 件になったこと。
- [ ] `strava_service.py` が分割され、400行制限をクリアしたこと。
- [ ] バックエンド単体テストがすべて PASS していること。

> **承認後の Git コミットメッセージ例**:
> `refactor(backend): STAGE 4 - DTO新設・Alembic統合・レイヤーバイパス完全解消`
