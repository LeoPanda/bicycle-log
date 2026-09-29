# ドキュメント改訂強制ルール (.agents/rules/system-revision.md)

本ファイルは、今後のシステム修正・改訂作業においてドキュメント更新および環境反映を強制するためのエージェントルールである。

---

## 1. システム改訂ルールの遵守義務

すべての改訂作業において、[rules/システム改訂ルール.md](rules/システム改訂ルール.md) を参照し、以下を確実に遂行すること。

1. **改訂ターンの記録**:
   - `/revise-log/Vn.m/Vn.m_revise-review_xxx.md` の作成・更新
2. **ドキュメント改定履歴の記録**:
   - 変更を行った全仕様書・設計書・構成ドキュメントの末尾に表形式で改定履歴を追記。
3. **テストレポート・完了レポート**:
   - `/tests/Vn.mシナリオテスト結果レポート.md` の作成・追記
   - 本番反映後の `Vn.m改訂レポート.md` の作成と `revise-review` ファイルのクリーンアップ

---

## 2. Docker コンテナ再構成の義務

システムの修正・改訂時にはソースコードの変更を確実に反映させるため、修正後に必ず `docker compose down` および `docker compose up -d --build` を実行し、Docker上のコンテナをビルド・再構成すること。

### 必須実行ステップ
- フロントエンド変更時: `cd frontend && node ./node_modules/vite/bin/vite.js build && cp -r dist/* ../backend/static/`
- Docker 再構築: `docker compose down` および `docker compose up -d --build`
- ステータス確認: `docker compose ps` で全コンテナが `Up` であることを検証
