# **APIキー安全管理・一元化設計書 (API_KEY_MANAGEMENT.md)**

本ドキュメントは、「bicycle-log」において、Google Cloud Storage (GCS) や Litestream バックアップ、Cloud Run IAP 認証等に必要な API キーや認証資格情報（サービスアカウントキー / ADC）、内部 AI 制御トークン等を、PC（ローカル Docker 環境）および本番環境の双方から安全かつ一元的に扱うためのセキュリティ設計および実装・運用方針を定義する。

---

## **1. 基本セキュリティ方針（グランドルール）**

### **1.1. フロントエンド（クライアント側）の完全隠蔽**

React（Vite）等でビルドされたフロントエンドコード内、およびブラウザ/端末のローカル領域には、GCP サービスアカウントキーやストレージシークレット情報を一切ハードコードまたは保持してはならない。

### **1.2. バックエンド（FastAPI）プロキシ通信の徹底**

すべての外部 Cloud API（Google Cloud Storage 等）との通信は、バックエンド（FastAPI）が仲介（プロキシ）する。GCS 内の特定プレフィックスからの画像取得・降順ソート処理や参照 URL 変換もすべてバックエンド側で一括処理する。

### **1.3. ソースコード管理（Git）からの完全排除**

API キーや認証鍵が記載された `.env` などの構成ファイル、サービスアカウントの JSON 鍵ファイル、および SQLite データベースファイル (`app.db`) は、絶対に Git リポジトリにコミットしてはならない。

---

## **2. 環境に応じた環境変数注入仕様およびバケット命名規則**

- **システムバージョン一元管理**: システムバージョンは `.env` 内の `APP_VERSION`（例: `1.2`）で一元管理し、コンテナ起動時およびフロントエンドビルド時に動的に注入する。
- **フロントエンド向け公開APIキー**: Google Maps JavaScript API 用キー (`VITE_GOOGLE_MAPS_API_KEY`) は、Vite ビルドプロセスを通じてクライアント成果物へ注入する。HTTP リファラー制限等により GCP コンソール上で安全に保護する。
- **開発環境 (ローカルDocker)**: `docker-compose.yml` で `backend/.env` から環境変数 (`APP_VERSION`, `GOOGLE_APPLICATION_CREDENTIALS`, `GCS_BUCKET_NAME_IMAGES`, `GCS_LITESTREAM_BACKUP_BUCKET`, `INTERNAL_AI_TOKEN`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`, `GOOGLE_PLACES_API_KEY`, `DATABASE_URL` 等) をコンテナ内へマウントして注入する。
- **本番環境 (Google Cloud / Cloud Run)**: GCP `Secret Manager` 上にシークレット（内部AI認証トークン `INTERNAL_AI_TOKEN` や Strava 認証資格情報 `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN`, Google Places API キー `GOOGLE_PLACES_API_KEY` 等）を安全に登録し、Cloud Run のサービス起動時に動的に環境変数として単一統合コンテナにバインドする。
- **Litestream バックアップ用 GCS バケット命名規約**: 同一 GCP プロジェクト上で複数のサービスを稼働させる運用環境において、バケット名の衝突を防止するため、Litestream のバックアップ用 GCS バケット名には Docker コンテナ名を含めてユニーク化を図る（例: `<project-id>-litestream-<container-name>`）。

---

## **3. 改定履歴**

| バージョン | 改定日 | 改訂依頼番号 | 改定内容 |
| :--- | :--- | :--- | :--- |
| 1.1 | 2026-09-02 | 1.1.002 | `GOOGLE_PLACES_API_KEY` を管理対象シークレット仕様および本番 Secret Manager 注入仕様に追加 |
| 1.2 | 2026-09-30 | 1.2.001 | `APP_VERSION` の環境変数一元管理および `VITE_GOOGLE_MAPS_API_KEY` のフロントエンドビルド時注入仕様を追加 |

