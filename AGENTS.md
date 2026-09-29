# AI Agent Operation Rules (AGENTS.md)

## 🚨 最重要ルール: ソースコード変更時の Docker コンテナ自動反映

システムのソースコード（バックエンド `backend/`、フロントエンド `frontend/`、設定ファイル、依存関係など）を変更した際には、**作業完了前に必ず Docker コンテナへ最新コードをビルド・再構成して起動すること**。
システムの修正・改訂時にはソースコードの変更を確実に反映させるため、修正後に必ず `docker compose down` および `docker compose up -d --build` を実行し、Docker上のコンテナをビルド・再構成すること。

---

### Docker コンテナ反映手順

ソース変更後の検証・完了処理として、以下の手順を必ず実行すること。

1. **フロントエンド静的ファイルのビルドと同期**（フロントエンド変更時）:
   ```bash
   cd frontend
   node ./node_modules/vite/bin/vite.js build
   cp -r dist/* ../backend/static/
   ```

2. **Docker コンテナのビルドおよび再起動**:
   ```bash
   docker compose down
   docker compose up -d --build
   ```

3. **コンテナ動作状態の確認**:
   ```bash
   docker compose ps
   ```
   - すべてのコンテナ（`backend`, `frontend`, `sqlite-web` など）が `Up` 状態であることを確認してから完了報告を行うこと。

---

## 📋 システム改訂ルールの遵守

今後のシステム改訂および運用保守にあたっては、[rules/システム改訂ルール.md](rules/システム改訂ルール.md) に規定された改訂手続きおよびルールを必ず参照・遵守すること。

- **バージョン管理**: `.env` 内の `APP_VERSION` による一元管理。
- **改訂ターンプロセス**: ユーザー要求に基づく Implementation Plan 作成、レビュー、承認、改訂実行、および `/revise-log/Vn.m/Vn.m_revise-review_xxx.md` への記録。
- **ドキュメント改定履歴**: 関連文書の変更時に末尾へ改定履歴を表形式で記録。
- **テスト・完了レポート**: `/tests/Vn.mシナリオテスト結果レポート.md` および `Vn.m改訂レポート.md` の作成。

---

## 開発・動作原則
- 変更を行った後は単体テスト/型チェックに加えて、必ず Docker コンテナ環境での稼働状態を確認すること。
- Docker の権限等でコマンドが失敗した場合は、適切な Bypass モード等を用いてコンテナ再起動を確実に行うこと。
