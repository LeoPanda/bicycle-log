#!/bin/sh
set -e

# データディレクトリの作成
mkdir -p /app/data

# ポート番号の取得 (Cloud Run は PORT=8080 を自動指定)
PORT=${PORT:-8000}

# FORCE_REBUILD=true が指定されている場合は既存リカバリをスキップ
if [ "$FORCE_REBUILD" = "true" ]; then
  echo "FORCE_REBUILD is set to true. Bypassing GCS restore and using local data-backup/app.db..."
  rm -f /app/data/app.db /app/data/app.db-wal /app/data/app.db-shm
else
  # GCSから既存のデータベースをリカバリ（二回目以降起動時）
  if [ -n "$GCS_LITESTREAM_BACKUP_BUCKET" ]; then
    echo "Attempting database restore from GCS..."
    litestream restore -if-replica-exists /app/data/app.db || true
  fi
fi

# リカバリ後も DB ファイルが存在しない、または0バイトの場合（初回本番デプロイ時または FORCE_REBUILD 時）、data-backup 等から初期データをロード
if [ ! -f /app/data/app.db ] || [ ! -s /app/data/app.db ]; then
  if [ -f /app/data-backup/app.db ]; then
    echo "Loading initial database from data-backup/app.db..."
    cp /app/data-backup/app.db /app/data/app.db
  fi
fi

# Alembic マイグレーション実行保証（スキーマ最新化 / フェイルセーフ）
echo "Checking database migration baseline..."
DB_PATH="/app/data/app.db"
if [ -f "$DB_PATH" ]; then
  HAS_BIKES=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='bikes';" 2>/dev/null || echo 0)
  HAS_ALEMBIC=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='alembic_version';" 2>/dev/null || echo 0)
  if [ "$HAS_BIKES" = "1" ] && [ "$HAS_ALEMBIC" = "0" ]; then
    echo "Existing v1.2 database detected without alembic_version. Stamping baseline 0001..."
    alembic stamp 0001
  fi
fi

echo "Running Alembic migrations..."
alembic upgrade head

# Litestreamの監視下でFastAPI(uvicorn app.main:app)を実行
if [ -n "$GCS_LITESTREAM_BACKUP_BUCKET" ]; then
  echo "Starting Litestream replication with uvicorn on port ${PORT}..."
  exec litestream replicate -exec "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"
else
  echo "Starting uvicorn on port ${PORT}..."
  exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
fi
