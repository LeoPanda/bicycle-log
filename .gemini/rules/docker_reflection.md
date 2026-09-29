---
description: ソースコード変更時の Docker コンテナ自動反映ルール
globs: ["**/*"]
---

# Docker コンテナ自動反映ルール

システムのソースコード（`backend/`, `frontend/`, 設定ファイルなど）を修正・機能追加・デバッグ等で変更した場合は、**必ず作業完了前に Docker コンテナへ最新ソースを反映させること**。

## 必須実行手順
1. フロントエンドのビルドおよび静的ファイルのコピー（フロントエンド更新時）:
   `node ./node_modules/vite/bin/vite.js build && cp -r dist/* ../backend/static/`
2. Docker コンテナの再ビルドと再起動:
   `docker compose up -d --build`
3. コンテナの稼働状態確認:
   `docker compose ps` (全コンテナが Up であることを確認)
