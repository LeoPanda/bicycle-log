# 定番ルート情報の追加機能 実装計画書 (Implementation Plan)

本文書は、自転車ログシステムにおける「定番ルート情報の追加機能」に関する詳細な設計・実装計画書です。

---

## 1. 概要・目的

自転車走行ログにおいて、同じコースや類似したルート（定番ルート）を繰り返し走行することが頻繁に発生します。
本機能では、Stravaから取得した走行アクティビティの GPS Encoded Polyline (`summary_polyline`) の幾何学的類似度を計算し、類似度が **70% を超える** アクティビティ同士を自動的にグループ化し、「定番ルートマスタ」として管理できるようにします。

---

## 2. 要件一覧

### ① 定番ルートの検出機能
- **定番ルートマスタ (`routes` テーブル)** の新設
  - ルートid (`id`: INTEGER PRIMARY KEY AUTOINCREMENT)
  - ルート名 (`name`: TEXT, 自動生成初期値: "定番ルート #1" 等)
  - 代表 `summary_polyline` (`summary_polyline`: TEXT)
- `activities` テーブルを走査し、`summary_polyline` の近似値が 70% を超える activity 同士をグルーピング。
- グルーピングされた activities は定番ルートマスタに紐付け (`route_id` 外部キー設定)、代表の `summary_polyline` を定番ルートマスタに設定。
- マスタ管理機能に定番ルートマスタを追加。詳細画面で代表 polyline と配下 activity を一覧表示し、ルート名を編集できるようにする。
- 定番ルートの検出機能は、ダッシュボード等の Strava 同期ボタンの隣に専用ボタンを設けて呼び出せるようにする。

### ② Strava同期時の自動追加機能
- Strava同期を行う際、新しい activity の `summary_polyline` と既存の定番ルートマスタの `summary_polyline` に 70% 以上の近似性が見られるときは、その activity を定番ルートマスタの下に自動紐付けする。

### ③ ヒートマップの表示方法変更
- 定番ルートマスタに紐づけられた activity は個別のヒートマップ表示からは外し、代わりに定番ルート（代表 `summary_polyline`）を表示する。
- 一覧に表示された定番ルートには配下の activity 数を表示し、詳細画面・マスタ画面へ遷移できるリンクを用意する。

---

## 3. システムアーキテクチャ & 詳細設計

### 3.1. データベース設計

#### `routes` テーブル (新規)
```sql
CREATE TABLE routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR NOT NULL,
    summary_polyline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### `activities` テーブル (拡張)
```sql
ALTER TABLE activities ADD COLUMN route_id INTEGER REFERENCES routes(id);
CREATE INDEX idx_activities_route_id ON activities(route_id);
```

---

### 3.2. Polyline 類似度判定アルゴリズム (近似値 70% 超)

1. **Polyline Decoding**:
   - Google Encoded Polyline を `(latitude, longitude)` の点配列 $P$ にデコード。
2. **Haversine 距離 & 最短距離一致率**:
   - 軌跡 $A$ と 軌跡 $B$ を一定間隔（例: 50m〜100m）でサンプリング。
   - $A$ の各点について、$B$ までの最短球面距離が許容誤差（例: 100m）以内である割合 $R_{A \to B}$ を算出。
   - $B$ の各点について、$A$ までの最短球面距離が許容誤差以内である割合 $R_{B \to A}$ を算出。
   - 類似度 $S(A, B) = \min(R_{A \to B}, R_{B \to A})$。
3. **判定条件**:
   - $S(A, B) \ge 0.70$ （70% 以上）の場合に近似ルートと判定。

---

### 3.3. バックエンド API 設計

| メソッド | エンドポイント | 説明 |
| :--- | :--- | :--- |
| `GET` | `/api/routes` | 定番ルートマスタ一覧取得 (配下アクティビティ数含む) |
| `GET` | `/api/routes/{id}` | 定番ルート詳細取得 (代表Polyline, 配下アクティビティ一覧含む) |
| `PUT` | `/api/routes/{id}` | ルート名 (`name`) の更新・編集 |
| `DELETE` | `/api/routes/{id}` | 定番ルートの削除 (配下アクティビティの `route_id` は NULL 設定) |
| `POST` | `/api/routes/detect` | 定番ルートの自動検出・一括グルーピング実行 |
| `GET` | `/api/analytics/heatmap` | ヒートマップデータ取得 (未紐付けactivityのみ個別描画, 定番ルートは代表polyline描画) |

---

### 3.4. フロントエンド UI 設計

1. **ダッシュボード画面 (`DashboardPage.tsx`)**:
   - 「Stravaデータ同期」ボタンの横に「定番ルート検出」ボタンを配置。
2. **マスタ管理画面 (`MasterPage.tsx`)**:
   - 「定番ルートマスタ」タブの追加。
   - ルート一覧、ルート名編集、代表 Polyline の Leaflet プレビュー、配下アクティビティ一覧表示。
3. **ヒートマップ・分析画面 (`AnalyticsPage.tsx`)**:
   - 定番ルート代表 Polyline の描画と未紐付けアクティビティ Polyline の描画。
   - 通過ルート一覧にて定番ルートの配下アクティビティ数表示および詳細遷移リンクを配置。

---

## 4. 開発・デプロイ・検証手順

1. ソースコードの実装 (バックエンド Python / フロントエンド React)
2. フロントエンド静的ファイルのビルド・同期:
   ```bash
   cd frontend
   node ./node_modules/vite/bin/vite.js build
   cp -r dist/* ../backend/static/
   ```
3. Docker コンテナのビルドおよび再起動 (`AGENTS.md` 遵守):
   ```bash
   docker compose up -d --build
   ```
4. コンテナ動作確認:
   ```bash
   docker compose ps
   ```
