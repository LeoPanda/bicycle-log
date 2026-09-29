# **バックエンドAPI仕様書 (BACKEND_SERVICES_SPEC)**

本ドキュメントは、「**bicycle-log**」システムで提供されている全バックエンドサービス（FastAPI APIエンドポイント）のURL構造、HTTPメソッド、リクエストパラメータ、ヘッダー、リクエストボディ、レスポンス形式、およびエラーハンドリング仕様を明記したものです。

---

## **1. バックエンドサービス全般仕様**

### **1.1. 基本情報 & ベースURL**
- **フレームワーク**: FastAPI (Python 3.11+)
- **APIベースURL**: `/api`
- **標準データフォーマット**: JSON (`application/json`) ※画像アップロード時のみ `multipart/form-data`
- **標準タイムゾーン**: **日本標準時 (JST, UTC+9 / Asia/Tokyo)**

### **1.2. 認証 & 認可制御**
1. **本番運用認証 (Cloud Run IAP)**
   - 前段の Identity-Aware Proxy (IAP) より注入される HTTP ヘッダー (`x-goog-authenticated-user-email` / `x-goog-iap-jwt-assertion`) を通じてユーザーアクセス制御が行われます。
2. **内部 AI・システム制御認証 (X-AI-TOKEN)**
   - 内部システム制御API (例: `POST /api/internal/logger/level`) では、HTTP リクエストヘッダー `X-AI-TOKEN` の検証を行います。環境変数 `INTERNAL_AI_TOKEN` と一致しない場合は `401 Unauthorized` を返却します。

### **1.3. 共通エラーレスポンス構造**
HTTP ステータスコードが 4xx / 5xx の場合、以下の標準形式でエラー詳細を返却します。500 系のエラーが発生した場合、構造化ログ検索用の `log_id` (UUIDv4) が付与されます。

```json
{
  "detail": "エラーの具体的な詳細メッセージ",
  "log_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## **2. エンドポイント一覧**

| カテゴリ | HTTPメソッド | パス | 概要 | 認証 |
| :--- | :--- | :--- | :--- | :--- |
| **ヘルスチェック** | `GET` | `/api/health` | バックエンド稼働確認 | 不要 |
| **内部制御** | `POST` | `/api/internal/logger/level` | ロギングレベルの動的変更 | `X-AI-TOKEN` |
| **自転車管理** | `GET` | `/api/bikes` | 自転車一覧取得 | IAP |
| | `POST` | `/api/bikes` | 自転車新規登録 | IAP |
| | `GET` | `/api/bikes/{bike_id}` | 自転車詳細取得 | IAP |
| | `PUT` | `/api/bikes/{bike_id}` | 自転車情報更新 | IAP |
| | `DELETE` | `/api/bikes/{bike_id}` | 自転車削除 | IAP |
| **カテゴリ管理** | `GET` | `/api/place-categories` | スポットカテゴリ一覧取得 | IAP |
| | `POST` | `/api/place-categories` | スポットカテゴリ作成 | IAP |
| | `GET` | `/api/place-categories/{category_id}` | スポットカテゴリ詳細取得 | IAP |
| | `PUT` | `/api/place-categories/{category_id}` | スポットカテゴリ更新 | IAP |
| | `DELETE` | `/api/place-categories/{category_id}` | スポットカテゴリ削除 | IAP |
| **スポット管理** | `GET` | `/api/places` | 滞在スポット一覧（検索・ページネーション） | IAP |
| | `POST` | `/api/places` | 滞在スポット新規登録 | IAP |
| | `GET` | `/api/places/{place_id}` | 滞在スポット詳細取得（訪問履歴含む） | IAP |
| | `PUT` | `/api/places/{place_id}` | 滞在スポット更新 | IAP |
| | `DELETE` | `/api/places/{place_id}` | 滞在スポット削除 | IAP |
| **アクティビティ** | `GET` | `/api/activities` | アクティビティ一覧（絞り込み・ページネーション） | IAP |
| | `POST` | `/api/activities` | アクティビティ登録 | IAP |
| | `GET` | `/api/activities/{activity_id}` | アクティビティ詳細取得（滞在ログ一覧含む） | IAP |
| | `PUT` | `/api/activities/{activity_id}` | アクティビティ更新 | IAP |
| | `DELETE` | `/api/activities/{activity_id}` | アクティビティ削除（関連滞在ログ一括削除） | IAP |
| **滞在ログ** | `GET` | `/api/stay-logs` | 滞在ログ一覧取得 | IAP |
| | `POST` | `/api/stay-logs` | 滞在ログ登録 | IAP |
| | `GET` | `/api/stay-logs/{stay_id}` | 滞在ログ詳細取得 | IAP |
| | `PUT` | `/api/stay-logs/{stay_id}` | 滞在ログメモ更新 | IAP |
| | `POST` | `/api/stay-logs/{stay_id}/images` | 滞在ログ写真追加（WebP最適化処理） | IAP |
| | `PUT` | `/api/stay-logs/images/{image_id}` | 滞在写真コメント更新 | IAP |
| | `DELETE` | `/api/stay-logs/images/{image_id}` | 滞在写真削除 | IAP |
| **タグ管理** | `GET` | `/api/tags` | タグ一覧取得 | IAP |
| | `POST` | `/api/tags` | タグ新規登録 | IAP |
| | `DELETE` | `/api/tags/{tag_id}` | タグ削除 | IAP |
| **定番ルート管理** | `GET` | `/api/routes` | 定番ルート一覧取得 (配下アクティビティ数含む) | IAP |
| | `POST` | `/api/routes/detect` | 定番ルートの自動検出・一括グルーピング実行 | IAP |
| | `GET` | `/api/routes/{route_id}` | 定番ルート詳細取得 (代表Polyline, 配下アクティビティ一覧含む) | IAP |
| | `PUT` | `/api/routes/{route_id}` | ルート名 (`name`) の更新・編集 | IAP |
| | `DELETE` | `/api/routes/{route_id}` | 定番ルートの削除 | IAP |
| **統計・分析** | `GET` | `/api/analytics/dashboard` | ダッシュボードサマリー＆ランキング取得 | IAP |
| | `GET` | `/api/analytics/metrics` | 期間別パフォーマンス統計（週/月/年） | IAP |
| | `GET` | `/api/analytics/heatmap` | ルートポリライン・定番ルート＆全マーカーデータ取得 | IAP |
| **Strava連携** | `POST` | `/api/strava/sync` | Stravaアクティビティ手動・定期同期処理 | IAP |
| **静的ファイル** | `GET` | `/static/uploads/{filename}` | アップロード画像配信 | 不要 |

---

## **3. 各サービス・エンドポイント詳細仕様**

### **3.1. ヘルスチェック API**

#### **`GET /api/health`**
- **概要**: システムおよびコンテナの健全性を検証します。
- **リクエストパラメータ**: なし
- **レスポンス (`200 OK`)**:
  ```json
  {
    "status": "ok",
    "project": "bicycle-log",
    "version": "1.0.0"
  }
  ```

---

### **3.2. 内部制御・ロギング API**

#### **`POST /api/internal/logger/level`**
- **概要**: サービスを再起動することなく、オンメモリでルートロガーの出力レベルを動的に更新します。
- **ヘッダー**:
  - `X-AI-TOKEN` (string, 必須): 内部認証トークン
- **リクエストボディ (`JSON`)**:
  | フィールド名 | 型 | 必須 | 説明 |
  | :--- | :--- | :--- | :--- |
  | `level` | `string` | **必須** | 設定レベル (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`) |
- **レスポンス (`200 OK`)**:
  ```json
  {
    "status": "success",
    "current_level": "DEBUG"
  }
  ```
- **エラーレスポンス**:
  - `401 Unauthorized`: ヘッダー未指定またはトークン不一致
  - `400 Bad Request`: 不正なログレベル文字列を指定した場合

---

### **3.3. 自転車管理サービス (Bikes API)**

#### **`GET /api/bikes`**
- **概要**: 登録されている自転車を一覧取得します（登録日時の降順）。
- **レスポンス (`200 OK`)**: `List[Bike]`

#### **`POST /api/bikes`**
- **概要**: 新規自転車を登録します。
- **リクエストボディ (`JSON`)**:
  | フィールド名 | 型 | 必須 | 説明 |
  | :--- | :--- | :--- | :--- |
  | `bike_code` | `string` | **必須** | ユニークな自転車識別コード（例: `BIKE-01`） |
  | `name` | `string` | **必須** | 自転車の名称（例: `メインロードバイク`） |
  | `brand` | `string` | 任意 | ブランド・メーカー名 |
  | `model` | `string` | 任意 | モデル名・年式 |
  | `registered_at` | `string` (datetime) | 任意 | 登録日時 (ISO 8601) |
  | `notes` | `string` | 任意 | 備考・コンポーネント構成メモ |
- **レスポンス (`201 Created`)**: `Bike`
- **エラーレスポンス**:
  - `400 Bad Request`: 既に存在する `bike_code` を指定した場合

#### **`GET /api/bikes/{bike_id}`**
- **パスパラメータ**: `bike_id` (integer, **必須**): 自転車ID
- **レスポンス (`200 OK`)**: `Bike`

#### **`PUT /api/bikes/{bike_id}`**
- **パスパラメータ**: `bike_id` (integer, **必須**): 自転車ID
- **リクエストボディ (`JSON`)**: `BikeUpdate` (各項目任意更新)
- **レスポンス (`200 OK`)**: `Bike`

#### **`DELETE /api/bikes/{bike_id}`**
- **パスパラメータ**: `bike_id` (integer, **必須**): 自転車ID
- **レスポンス (`204 No Content`)**
- **エラーレスポンス**:
  - `409 Conflict`: 該当の自転車を参照しているアクティビティが存在する場合（参照整合性保護）

---

### **3.4. スポットカテゴリ管理サービス (Place Categories API)**

#### **`GET /api/place-categories`**
- **概要**: スポットカテゴリ一覧を取得します（ID昇順）。
- **レスポンス (`200 OK`)**: `List[PlaceCategory]`

#### **`POST /api/place-categories`**
- **リクエストボディ (`JSON`)**:
  | フィールド名 | 型 | 必須 | 説明 |
  | :--- | :--- | :--- | :--- |
  | `name` | `string` | **必須** | カテゴリ名（ユニーク） |
  | `description` | `string` | 任意 | 説明テキスト |
  | `icon` | `string` | 任意 | アイコン識別名（`coffee`, `store`, `utensils` 等） |
- **レスポンス (`201 Created`)**: `PlaceCategory`

#### **`GET /api/place-categories/{category_id}`**
- **パスパラメータ**: `category_id` (integer, **必須**)
- **レスポンス (`200 OK`)**: `PlaceCategory`

#### **`PUT /api/place-categories/{category_id}`**
- **パスパラメータ**: `category_id` (integer, **必須**)
- **リクエストボディ (`JSON`)**: `PlaceCategoryUpdate`
- **レスポンス (`200 OK`)**: `PlaceCategory`

#### **`DELETE /api/place-categories/{category_id}`**
- **パスパラメータ**: `category_id` (integer, **必須**)
- **レスポンス (`204 No Content`)**
- **エラーレスポンス**:
  - `409 Conflict`: 該当カテゴリを参照しているスポットが存在する場合

---

### **3.5. 滞在スポット管理サービス (Places API)**

#### **`GET /api/places`**
- **概要**: 滞在スポット一覧をキーワード検索・カテゴリ絞り込み・ページネーション付きで取得します。
- **クエリパラメータ**:
  | パラメータ名 | 型 | 必須 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `q` | `string` | 任意 | `null` | 名前・住所のあいまい検索キーワード |
  | `category_id` | `integer` | 任意 | `null` | カテゴリIDフィルター |
  | `page` | `integer` | 任意 | `1` | ページ番号 (1以上) |
  | `per_page` | `integer` | 任意 | `20` | 1ページあたりの件数 (1〜100) |
- **レスポンス (`200 OK`)**:
  ```json
  {
    "items": [
      {
        "id": "ChIJN1t_tDeuEmsRUsoyG83frY4",
        "name": "清里カフェ",
        "category_id": 1,
        "address": "山梨県北杜市...",
        "latitude": 35.925,
        "longitude": 138.435,
        "created_at": "2026-08-23T10:00:00",
        "updated_at": "2026-08-23T10:00:00",
        "category_name": "カフェ",
        "category_icon": "coffee",
        "visit_count": 3
      }
    ],
    "total": 1,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
  ```

#### **`POST /api/places`**
- **リクエストボディ (`JSON`)**:
  | フィールド名 | 型 | 必須 | 説明 |
  | :--- | :--- | :--- | :--- |
  | `id` | `string` | **必須** | Google Place ID または カスタムUUID |
  | `name` | `string` | **必須** | スポット名称 |
  | `category_id` | `integer` | 任意 | カテゴリID |
  | `address` | `string` | 任意 | 住所 |
  | `latitude` | `float` | **必須** | 緯度 |
  | `longitude` | `float` | **必須** | 経度 |
- **レスポンス (`201 Created`)**: `Place`

#### **`GET /api/places/{place_id}`**
- **パスパラメータ**: `place_id` (string, **必須**): スポットID
- **レスポンス (`200 OK`)**: スポット情報に加え、カテゴリ情報および訪問ログ履歴 (`stay_logs`) を内包するオブジェクト

#### **`PUT /api/places/{place_id}`**
- **パスパラメータ**: `place_id` (string, **必須**)
- **リクエストボディ (`JSON`)**: `PlaceUpdate`
- **レスポンス (`200 OK`)**: `Place`

#### **`DELETE /api/places/{place_id}`**
- **パスパラメータ**: `place_id` (string, **必須**)
- **レスポンス (`204 No Content`)**

---

### **3.6. アクティビティ管理サービス (Activities API)**

#### **`GET /api/activities`**
- **概要**: 走行アクティビティを一覧取得します。
- **クエリパラメータ**:
  | パラメータ名 | 型 | 必須 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `q` | `string` | 任意 | `null` | アクティビティ名のあいまい検索 |
  | `bike_id` | `integer` | 任意 | `null` | 自転車IDによる絞り込み |
  | `page` | `integer` | 任意 | `1` | ページ番号 |
  | `per_page` | `integer` | 任意 | `20` | 件数 |
- **レスポンス (`200 OK`)**: `{"items": [...], "total": int, "page": int, "per_page": int, "total_pages": int}`

#### **`POST /api/activities`**
- **リクエストボディ (`JSON`)**:
  | フィールド名 | 型 | 必須 | 説明 |
  | :--- | :--- | :--- | :--- |
  | `id` | `integer` | **必須** | Strava Activity ID |
  | `name` | `string` | **必須** | ライド名 |
  | `bike_id` | `integer` | 任意 | 使用自転車ID |
  | `start_date` | `string` (datetime) | **必須** | 走行開始日時 (JST / ISO 8601) |
  | `distance` | `float` | 任意 (`0.0`) | 走行距離（メートル） |
  | `moving_time` | `integer` | 任意 | 移動時間（秒） |
  | `elapsed_time` | `integer` | 任意 | 経過時間（秒） |
  | `total_elevation_gain` | `float` | 任意 (`0.0`) | 獲得標高（メートル） |
  | `calories` | `float` | 任意 | 消費カロリー (kcal) |
  | `summary_polyline` | `string` | 任意 | 圧縮ルートエンコード文字列 |
- **レスポンス (`201 Created`)**: `Activity`

#### **`GET /api/activities/{activity_id}`**
- **パスパラメータ**: `activity_id` (integer, **必須**): アクティビティID
- **レスポンス (`200 OK`)**: アクティビティ基本データに加え、自転車名および詳細な滞在スポットログ (`stay_logs` -> スポット情報・写真一覧含む) を返却します。

#### **`PUT /api/activities/{activity_id}`**
- **パスパラメータ**: `activity_id` (integer, **必須**)
- **リクエストボディ (`JSON`)**: `ActivityUpdate`
- **レスポンス (`200 OK`)**: `Activity`

#### **`DELETE /api/activities/{activity_id}`**
- **パスパラメータ**: `activity_id` (integer, **必須**)
- **概要**: アクティビティと、それに紐付く滞在ログ (`stay_logs`) をカスケード削除します。
- **レスポンス (`204 No Content`)**

---

### **3.7. 滞在ログ・写真管理サービス (Stay Logs API)**

#### **`GET /api/stay-logs`**
- **概要**: 全滞在ログを到着日時の降順で取得します。
- **レスポンス (`200 OK`)**: `List[StayLogDict]`

#### **`POST /api/stay-logs`**
- **リクエストボディ (`JSON`)**:
  | フィールド名 | 型 | 必須 | 説明 |
  | :--- | :--- | :--- | :--- |
  | `activity_id` | `integer` | **必須** | 紐付くアクティビティID |
  | `place_id` | `string` | **必須** | 紐付く滞在スポットID |
  | `arrived_at` | `string` (datetime) | **必須** | 到着日時 |
  | `left_at` | `string` (datetime) | **必須** | 出発日時 |
  | `stay_duration_seconds` | `integer` | **必須** | 滞在時間（秒） |
  | `stay_latitude` | `float` | **必須** | 検出緯度 |
  | `stay_longitude` | `float` | **必須** | 検出経度 |
  | `notes` | `string` | 任意 | 滞在時のメモ・感想 |
- **レスポンス (`201 Created`)**: `StayLog`

#### **`GET /api/stay-logs/{stay_id}`**
- **パスパラメータ**: `stay_id` (integer, **必須**)
- **レスポンス (`200 OK`)**: 滞在ログ詳細、関連スポット情報、写真添付一覧 (`images`)

#### **`PUT /api/stay-logs/{stay_id}`**
- **パスパラメータ**: `stay_id` (integer, **必須**)
- **リクエストボディ (`JSON`)**: `{"notes": "メモ内容"}`
- **レスポンス (`200 OK`)**: `StayLog`

#### **`POST /api/stay-logs/{stay_id}/images`**
- **概要**: 滞在ログに写真・画像を添付します。
- **Content-Type**: `multipart/form-data`
- **フォームパラメータ**:
  | パラメータ名 | 型 | 必須 | 説明 |
  | :--- | :--- | :--- | :--- |
  | `file` | `UploadFile` | 任意 | 写真画像ファイル (自動的に **700x700 center crop, WebP 80%** へ変換保存) |
  | `image_url` | `string` | 任意 | 直リンク用外部画像URL (`file` と `image_url` のいずれか必須) |
  | `comment` | `string` | 任意 | 画像キャプション |
- **レスポンス (`200 OK`)**: `StayLogImage`
- **エラーレスポンス**:
  - `400 Bad Request`: `file` と `image_url` の両方が未指定の場合

#### **`PUT /api/stay-logs/images/{image_id}`**
- **パスパラメータ**: `image_id` (integer, **必須**)
- **リクエストボディ (`JSON`)**: `{"comment": "更新後のコメント/キャプション"}`
- **レスポンス (`200 OK`)**: `StayLogImage`

#### **`DELETE /api/stay-logs/images/{image_id}`**
- **パスパラメータ**: `image_id` (integer, **必須**)
- **レスポンス (`204 No Content`)**

---

### **3.8. タグ管理サービス (Tags API)**

#### **`GET /api/tags`**
- **概要**: 全タグ一覧を取得します（名前順）。
- **レスポンス (`200 OK`)**: `List[Tag]`

#### **`POST /api/tags`**
- **リクエストボディ (`JSON`)**:
  | フィールド名 | 型 | 必須 | 説明 |
  | :--- | :--- | :--- | :--- |
  | `name` | `string` | **必須** | タグ名（一意） |
- **レスポンス (`201 Created`)**: `Tag`
- **エラーレスポンス**:
  - `400 Bad Request`: タグ名が重複した場合

#### **`DELETE /api/tags/{tag_id}`**
- **パスパラメータ**: `tag_id` (integer, **必須**)
- **レスポンス (`204 No Content`)**

---

### **3.9. 統計・分析・ダッシュボードサービス (Analytics API)**

#### **`GET /api/analytics/dashboard`**
- **概要**: ダッシュボード表示用の統計サマリー、直近5アクティビティ、訪問数トップ10スポットランキングを一括取得します。
- **レスポンス (`200 OK`)**:
  ```json
  {
    "summary": {
      "total_distance_km": 1540.2,
      "total_elevation_gain_m": 12450.0,
      "total_ride_count": 24,
      "total_stay_spots": 18
    },
    "recent_activities": [
      {
        "id": 1234567,
        "name": "富士五湖周遊ライド",
        "start_date": "2026-08-20T07:30:00",
        "bike_name": "メインロードバイク",
        "distance_km": 115.4,
        "elevation_gain": 1420.0
      }
    ],
    "ranking": [
      {
        "place_id": "ChIJ...",
        "place_name": "富士山5合目レストハウス",
        "category_name": "道の駅",
        "visit_count": 6,
        "last_visited_at": "2026-08-20T11:45:00"
      }
    ]
  }
  ```

#### **`GET /api/analytics/metrics`**
- **概要**: 指定した期間単位（週/月/年）および自転車で集計した走行パフォーマンス指標データを取得します。
- **クエリパラメータ**:
  | パラメータ名 | 型 | 必須 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `range_type` | `string` | 任意 | `"monthly"` | 集計単位 (`annual`, `monthly`, `weekly`) |
  | `bike_id` | `integer` | 任意 | `null` | 特定自転車IDフィルター |
- **レスポンス (`200 OK`)**:
  ```json
  {
    "range_type": "monthly",
    "metrics": [
      {
        "period": "2026-08",
        "distance_km": 420.8,
        "elevation_m": 3400.0,
        "moving_hours": 18.25,
        "ride_count": 6,
        "calories_kcal": 8450.0
      }
    ]
  }
  ```

#### **`GET /api/analytics/heatmap`**
- **概要**: 走行ルートポリラインデータ一覧と全滞在スポットマーカーデータを集約取得します（ヒートマップ / Mapbox / Leaflet 表示用）。
- **レスポンス (`200 OK`)**:
  ```json
  {
    "polylines": [
      {
        "activity_id": 1234567,
        "name": "富士五湖周遊ライド",
        "start_date": "2026-08-20T07:30:00",
        "polyline": "a~l~F..._pE",
        "strava_url": "https://www.strava.com/activities/1234567"
      }
    ],
    "markers": [
      {
        "place_id": "ChIJ...",
        "name": "富士山5合目レストハウス",
        "address": "山梨県...",
        "latitude": 35.36,
        "longitude": 138.73,
        "category_name": "道の駅",
        "category_icon": "shopping-bag",
        "visit_count": 6
      }
    ]
  }
  ```

---

### **3.10. Strava 連携サービス (Strava Sync API)**

#### **`POST /api/strava/sync`**
- **概要**: Strava API より最新のアクティビティを取得し、GPSタイムスタンプストリームから停滞時間を自動判定・Google Places キャッシュと照合して `stay_logs` を自動生成します。
- **クエリパラメータ**:
  | パラメータ名 | 型 | 必須 | デフォルト | 説明 |
  | :--- | :--- | :--- | :--- | :--- |
  | `limit_months` | `integer` | 任意 | `null` | 過去の指定月数分のみ同期対象を限定するオプション (例: `1`, `3`, `6`, `12`) |
  | `all_time` | `boolean` | 任意 | `false` | DB内の最新ログ日時に関わらずStravaアカウント上の全期間アクティビティを同期するフラグ |
- **レスポンス (`200 OK`)**:
  ```json
  {
    "status": "success",
    "synced_activities": 3,
    "detected_stops": 5,
    "created_places": 2
  }
  ```

---

### **3.11. 定番ルート管理サービス (Routes API)**

#### **`GET /api/routes`**
- **概要**: 登録されている定番ルートマスタ一覧（配下アクティビティ数含む）を取得します。
- **レスポンス (`200 OK`)**:
  ```json
  [
    {
      "id": 1,
      "name": "定番ルート #1",
      "summary_polyline": "a~l~F..._pE",
      "activity_count": 5,
      "created_at": "2026-08-20T00:00:00",
      "updated_at": "2026-08-20T00:00:00"
    }
  ]
  ```

#### **`POST /api/routes/detect`**
- **概要**: 全アクティビティの Polyline 類似度（70%超）を自動計算し、定番ルートの検出・一括グルーピングを実行します。
- **レスポンス (`200 OK`)**:
  ```json
  {
    "status": "success",
    "created_routes_count": 2,
    "assigned_activities_count": 8
  }
  ```

#### **`GET /api/routes/{route_id}`**
- **パスパラメータ**: `route_id` (integer, **必須**): ルートID
- **レスポンス (`200 OK`)**: ルート基本データ、代表 Polyline、および紐づくアクティビティ一覧 (`activities`) を内包するオブジェクト

#### **`PUT /api/routes/{route_id}`**
- **パスパラメータ**: `route_id` (integer, **必須**)
- **リクエストボディ (`JSON`)**: `{"name": "変更後のルート名"}`
- **レスポンス (`200 OK`)**: `Route`

#### **`DELETE /api/routes/{route_id}`**
- **パスパラメータ**: `route_id` (integer, **必須**)
- **概要**: 定番ルートを削除します（配下アクティビティの `route_id` は NULL に設定されます）。
- **レスポンス (`200 OK`)**: `{"status": "deleted", "id": 1}`

---

### **3.12. 静的ファイル配信・コンテンツ配信**

#### **`GET /static/uploads/{filename}`**
- **概要**: アップロードおよび最適化（700x700 Center Crop, WebP）された画像静的ファイルを配信します。

#### **`GET /static/...`**
- **概要**: 本番環境で単一コンテナ化された際の React フロントエンド成果物（HTML, JS, CSS）を静的配信します。

---

## **4. ドキュメント改訂履歴**

| バージョン | 改定日 | 改訂依頼番号 | 改定内容 |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-08-23 | - | 初版作成：全バックエンドサービス（11カテゴリ、25+ エンドポイント）のURL・パラメータ・レスポンス仕様の文書化 |
| 1.1.0 | 2026-08-30 | - | 定番ルート管理サービス (Routes API) およびカテゴリ表示順 (`sort_order`) 仕様の追加・一元化 |
| 1.1 | 2026-09-02 | 1.1.001 | Placeモデルへの `comment` 列追加および `PUT /api/stay-logs/images/{image_id}` 写真コメント更新APIの追加 |
