# 🚲 bicycle-log

> **サイクリング・ポタリングのアクティビティデータと立ち寄りスポット（カフェ・道の駅・公園など）の滞在記録を自動抽出し、走行軌跡ヒートマップや定番ルートと共に可視化・一元管理する Web プラットフォーム**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Litestream](https://img.shields.io/badge/Litestream-GCS_Replication-4285F4?style=flat-square)](https://litestream.io/)
[![Google Cloud Run](https://img.shields.io/badge/Google_Cloud_Run-IAP_Secured-4285F4?style=flat-square&logo=google-cloud&logoColor=white)](https://cloud.google.com/run)

---

## 📖 概要

**bicycle-log** は、個人の自転車走行ログ（ライド記録）と、走行中に立ち寄ったスポット（カフェ、レストラン、道の駅、観光名所など）の滞在情報を Strava および Google Places API と連携して自動抽出し、地図やグラフで美しく一元管理・可視化するためのパーソナル・サイクリング・ログ管理システムです。

走行軌跡のヒートマップ描画、独自アルゴリズムによる定番ルートの自動検出・グルーピング、立ち寄り地点での思い出写真やコメントの記録、バイクごとの走行統計分析など、サイクリストにとって価値ある情報を直感的な UI で提供します。

---

## 🌟 主な機能

### 1. 🚴 Strava 自動同期 & 滞在自動検知 (Stop Detection)
- **同日初回アクセス時の自動同期**: システムへの日次初回アクセス時、DB 内の最終取得日以降の新規アクティビティを Strava API から自動ダウンロードして保存。
- **時空間クラスタリングによる滞在検知**: Strava Activity Streams API (`latlng`, `time`, `moving`) を解析し、「半径 30m〜50m 以内に 30分（1800秒）以上」留まった区間を立ち寄りスポットとして自動抽出。滞在重心座標、到着・出発日時、滞在時間を自動算出。
- **二重キャッシュ構造 (DB 優先 & Google Places API)**:
  - 抽出した滞在座標から、まずローカル DB 内の既存登録スポット（半径 50m 以内）を照会（一次キャッシュ）。
  - 未登録地点のみ Google Places API (Nearby Search) を呼び出してスポット名・カテゴリ・住所を自動取得・保存し、外部 API コストとレイテンシを最小化。

### 2. 🗺️ 滞在記録マップ & スポット詳細管理
- **インタラクティブマップ**: Google Maps / Leaflet 上に滞在スポットをカテゴリ別アイコンでプロット。広域表示時はマーカークラスタリングにより視認性を向上。
- **インライン編集 & コメント管理**: スポット名称やコメントは画面上から直接クリックしてインライン編集が可能。
- **写真添付 & 自動最適化**:
  - 写真アップロード時にバックエンド側で自動的に 700×700px Center Crop & WebP (品質80%) 圧縮変換を行い、Google Cloud Storage (GCS) へ保存。
  - 外部 Web 画像のダイレクト URL 指定にも対応。写真ごとにキャプションコメントを編集可能。
- **通過アクティビティ連携**: 各滞在スポット詳細から、その場所を通過した過去のライド一覧へシームレスにジャンプ可能。

### 3. 🔥 走行軌跡ヒートマップ & 定番ルート自動検知
- **ヒートマップ描画**: 全アクティビティの Polyline データを地図上に重ね合わせてヒートマップを描画。特定ルートをクリックすると該当アクティビティを強調表示。
- **定番ルート自動検知アルゴリズム**: 球面距離（Haversine 点列照合）に基づき、走行軌跡の類似度が 70% を超えるアクティビティ群を「定番ルート (`routes`)」として自動グルーピング。
- **代表 Polyline 統合描画**: 定番ルートに紐づくアクティビティは地図上で 1 本の代表ラインに集約して表示し、ワンクリックで配下の個別ライド一覧および Strava ライド詳細ページへアクセス可能。

### 4. 📊 ダッシュボード & 走行データ可視化
- **主要サマリー**: 総走行距離、総上昇量、総ライド回数、累積訪問スポット数をカード形式で即座に把握。
- **滞在スポットランキング**: 訪問回数が多い上位 10 件の立ち寄りスポットをランキング表示。
- **多角的メトリクス分析**: 所有バイク (Bike ID) ごとに、走行距離 (km)、獲得標高 (m)、総走行時間、ライド回数、消費カロリー (kcal) を「年間 / 月間 / 週間」のタイムレンジ別にグラフ描画。

### 5. ⚙️ マスタ管理 & リアルタイム検索
- **各種マスタの CRUD 操作**:
  - 自転車マスタ (`bikes`)
  - 滞在カテゴリマスタ (`place_categories`)
  - 定番ルートマスタ (`routes`)
  - タグマスタ
- **リアルタイム絞り込み**: アクティビティやスポット一覧におけるキーワード絞り込み、カラムソート、ページネーション。

### 6. 🎨 モダン UI/UX & マルチテーマ
- **3 モードテーマ切り替え**: `Light` / `Dark` / `System (OS設定連動)` のシームレスな切り替え。
- **レスポンシブ対応**: デスクトップ大画面 (`max-w-[1800px]`) からスマートフォン (`md:` 未満) まで最適化されたレスポンシブ UI。

---

## 🏗️ システム構成 (Architecture)

本システムは、ローカル開発環境での迅速な反復開発と、Google Cloud 上での低コストかつ堅牢な本番運用を両立するハイブリッド構成を採用しています。

```mermaid
flowchart TB
    subgraph Client ["Client Layer"]
        Browser["Web Browser (PC / Mobile)"]
    end

    subgraph GCP ["Google Cloud Platform (Production)"]
        IAP["Identity-Aware Proxy (IAP)\nGoogle アカウント認証"]
        
        subgraph CloudRun ["Cloud Run Container (max-instances=1)"]
            Frontend["Frontend Static\n(React / Vite Build)"]
            FastAPI["Backend API\n(FastAPI / Python 3.11)"]
            SQLite[("SQLite 3\n/app/data/app.db")]
            Litestream["Litestream Sidecar Process"]
        end

        GCS_Bucket[("GCS Bucket\n・Litestream WAL Backup\n・Optimized WebP Images")]
        SecretManager["Secret Manager\nAPIキー・トークン一元管理"]
    end

    subgraph External ["External Services"]
        Strava["Strava API\n(Activities & Streams)"]
        Places["Google Places API\n(Nearby Search)"]
    end

    Browser -->|HTTPS Request| IAP
    IAP -->|JWT & User Email Header| CloudRun
    Frontend <--> FastAPI
    FastAPI <--> SQLite
    SQLite -.->|WAL Replication| Litestream
    Litestream -->|Realtime Backup| GCS_Bucket
    FastAPI -->|Image Upload| GCS_Bucket
    FastAPI -->|Sync Activities| Strava
    FastAPI -->|Nearby Search (Fallback)| Places
    SecretManager -.->|Inject Env| CloudRun
```

### アーキテクチャの特長
1. **SQLite 3 + Litestream による高信頼・低コスト運用**:
   - クラウドマネージド RDB を使用せず、高速かつ軽量な SQLite 3 を採用。
   - バックグラウンドで Litestream が WAL (Write-Ahead Logging) 変更差分を秒単位で Google Cloud Storage (GCS) へリアルタイムレプリケーション。コンテナ再起動時は GCS から自動リストア。
   - ※ SQLite の排他制御およびデータ整合性を担保するため、Cloud Run の最大インスタンス数は `max-instances=1` に制限運用。
2. **完全バックエンドプロキシによるセキュリティ担保**:
   - Strava API シークレットや Google Places API キーなどの機密情報はクライアント（ブラウザ）へ一切露出させず、FastAPI バックエンドが一元管理・プロキシ通信。
3. **IAP (Identity-Aware Proxy) による安全なアクセス制限**:
   - 前段の Google Cloud IAP により特定 Google アカウントのみアクセス許可。アプリケーション側では `x-goog-authenticated-user-email` ヘッダーを通じて安全にユーザーを識別。
4. **AI駆動・構造化 JSON ロギング**:
   - Twelve-Factor App に準拠し、すべてのログを標準出力に JSON フォーマット（JST 統一、UUIDv4 `log_id` 付与）で集約。AI による自律調査用の動的ログレベル切替 API を具備。

---

## 💻 技術スタック (Tech Stack)

| レイヤ | 技術 / ライブラリ | 用途 / 備考 |
| :--- | :--- | :--- |
| **Frontend** | React 18, TypeScript | SPA（シングルページアプリケーション）UI 実装 |
| | Vite 4 | 高速ビルドツール & 開発サーバー |
| | Tailwind CSS 3 | ユーティリティファースト CSS スタイリング |
| | Lucide React | アイコンセット |
| | Leaflet / Google Maps API | 地図描画、マーカープロット、ヒートマップ可視化 |
| **Backend** | Python 3.11+ | バックエンドランタイム |
| | FastAPI | 高速非同期 RESTful Web API フレームワーク |
| | SQLModel / SQLAlchemy | ORM / データベースモデリング |
| | Pydantic Settings | 型安全な環境変数設定管理 |
| | Pillow / Pillow-Heif | 画像最適化（WebP 80% 変換、Center Crop 700x700） |
| | HTTPX | 外部 API（Strava, Google Places）非同期 HTTP クライアント |
| **Database** | SQLite 3 | 軽量組み込みリレーショナルデータベース |
| | Litestream | SQLite WAL ログの GCS リアルタイムレプリケーション |
| **Infrastructure** | Google Cloud Run | サーバーレスコンテナ実行環境 (`max-instances=1`) |
| | Identity-Aware Proxy (IAP) | Google アカウントによる認証・認可ゲートウェイ |
| | Google Cloud Storage (GCS) | 最適化画像アセット保管および Litestream バックアップ保管 |
| | Google Secret Manager | 本番 API キー・シークレットの安全な一元注入 |
| | Docker / Docker Compose | 開発環境および本番マルチステージビルド |

---

## 📁 ディレクトリ構造

```text
bicycle-log/
├── .env                    # ローカル環境変数定義ファイル (非公開)
├── AGENTS.md               # AI エージェント運用ルール
├── docker-compose.yml      # ローカル開発用 Docker Compose 設定
├── Dockerfile              # ローカル・共通コンテナビルド定義
├── Dockerfile.prod         # 本番 Cloud Run 用マルチステージビルド定義
├── entrypoint.sh           # コンテナ起動用スクリプト (Litestream 連動)
├── litestream.yml          # Litestream バックアップ設定
│
├── backend/                # バックエンド (FastAPI) ソースコード
│   ├── app/
│   │   ├── api/            # API ルーター (activities, places, routes, etc.)
│   │   ├── core/           # 設定 (config), データベース接続, 構造化ロガー
│   │   ├── models/         # SQLModel データベースモデル定義
│   │   └── services/       # 滞在検知, 定番ルート判定, Strava/Places 連携ロジック
│   ├── data/               # SQLite データベース配置ディレクトリ (app.db)
│   ├── static/             # フロントエンド静的ビルド成果物格納先
│   ├── Dockerfile
│   └── requirements.txt    # Python 依存ライブラリ
│
├── frontend/               # フロントエンド (React + TypeScript) ソースコード
│   ├── src/
│   │   ├── components/     # 再利用可能 UI コンポーネント (Modal, Map, Cards)
│   │   ├── pages/          # 画面コンポーネント (Dashboard, Activities, Spots, etc.)
│   │   ├── services/       # バックエンド API 通信クライアント
│   │   └── types/          # TypeScript 型定義
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── docs/                   # システム仕様書・設計ドキュメント群
│   ├── 要件定義書.md
│   ├── 技術要件定義書.md
│   ├── 画面仕様書.md
│   ├── バックエンドAPI仕様書.md
│   ├── テーブルスキーマ定義書.md
│   ├── ビジネスロジック仕様書.md
│   ├── 定番ルート機能実装計画.md
│   ├── 本番適用作業手順書.md
│   └── APIキー安全管理・一元化設計書.md
│
├── tests/                  # シナリオテスト・E2E テスト・改訂レポート
└── rules/                  # システム改訂運用ルール定義
```

---

## 🚀 クイックスタート (ローカル開発環境)

### 1. 前提条件
- Docker および Docker Compose がインストールされていること。
- Node.js (v18+) および Python (3.11+) （ローカルで直接スクリプトを実行する場合）。

### 2. 環境変数の準備
リポジトリ直下に `.env` ファイルを作成し、必要な設定・API キーを設定します。

```env
TZ=Asia/Tokyo
LOG_LEVEL=DEBUG
APP_VERSION=1.1
INTERNAL_AI_TOKEN=your_secure_ai_token
DATABASE_URL=sqlite:///./data/app.db

# Strava API Credentials
STRAVA_CLIENT_ID="your_strava_client_id"
STRAVA_CLIENT_SECRET="your_strava_client_secret"
STRAVA_REFRESH_TOKEN="your_strava_refresh_token"

# Google APIs
GOOGLE_PLACES_API_KEY="your_google_places_api_key"
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"

# GCS Settings (本番・画像アップロード用)
GCS_BUCKET_NAME_IMAGES="your-bucket-images"
GCS_LITESTREAM_BACKUP_BUCKET="your-bucket-litestream"
```

### 3. Docker コンテナの起動
Docker Compose を使用して、バックエンドとフロントエンドを起動します。

```bash
docker compose up -d --build
```

### 4. 動作確認
- **フロントエンド UI**: [http://localhost:3000](http://localhost:3000)
- **バックエンド API ドキュメント (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API ヘルスチェック**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 5. フロントエンド静的ファイルのビルド（コンテナ反映時）
コード変更をバックエンド単一コンテナや静的ファイル提供へ反映する際は、以下のビルド手順を実施します。

```bash
cd frontend
npm run build
cp -r dist/* ../backend/static/
```

---

## 📚 ドキュメント一覧

詳細な仕様および設計については、`docs/` 配下の各ドキュメントを参照してください。

- [要件定義書](file:///Users/sakyo/Documents/workspace/AI/bicycle-log/docs/要件定義書.md): システムの全体目的、機能要件、非機能要件
- [技術要件定義書](file:///Users/sakyo/Documents/workspace/AI/bicycle-log/docs/技術要件定義書.md): 技術スタック、外部連携仕様、セキュリティ方針
- [画面仕様書](file:///Users/sakyo/Documents/workspace/AI/bicycle-log/docs/画面仕様書.md): 各画面のレイアウト、コンポーネント構成、インタラクション
- [バックエンドAPI仕様書](file:///Users/sakyo/Documents/workspace/AI/bicycle-log/docs/バックエンドAPI仕様書.md): RESTful API エンドポイント、リクエスト/レスポンス仕様
- [テーブルスキーマ定義書](file:///Users/sakyo/Documents/workspace/AI/bicycle-log/docs/テーブルスキーマ定義書.md): SQLite テーブル定義、リレーション、インデックス
- [ビジネスロジック仕様書](file:///Users/sakyo/Documents/workspace/AI/bicycle-log/docs/ビジネスロジック仕様書.md): 滞在検知アルゴリズム、定番ルート類似度判定ロジック
- [本番適用作業手順書](file:///Users/sakyo/Documents/workspace/AI/bicycle-log/docs/本番適用作業手順書.md): Google Cloud Run / IAP / Secret Manager 本番デプロイ手順
- [APIキー安全管理・一元化設計書](file:///Users/sakyo/Documents/workspace/AI/bicycle-log/docs/APIキー安全管理・一元化設計書.md): シークレット管理とフロントエンド秘匿化方針

---

## 🔒 ライセンス・運用ルール

- 本システムは個人用途向けのプライベートプロジェクトです。
- システムの改訂および保守運用については、[rules/システム改訂ルール.md](file:///Users/sakyo/Documents/workspace/AI/bicycle-log/rules/システム改訂ルール.md) および [AGENTS.md](file:///Users/sakyo/Documents/workspace/AI/bicycle-log/AGENTS.md) に規定された改訂ターン管理プロトコルに準拠します。
