# Project Rules & Prompts (GEMINI.md)

本プロジェクトにおける開発・運用・開発AIエージェントの行動指針および共通ルールを定める。

---

## 1. システム改訂ルールの参照と遵守

システムおよび関連ドキュメントのすべての修正・改訂においては、[rules/システム改訂ルール.md](rules/システム改訂ルール.md) を必ず参照し、定められた改訂手続き（改訂ターン管理、履歴記録、テストレポートおよび作業完了レポート作成）を厳格に遵守すること。

---

## 2. ソースコード変更時の Docker コンテナ再構成ルール

システムの修正・改訂時にはソースコードの変更を確実に反映させるため、修正後に必ず `docker compose down` および `docker compose up -d --build` を実行し、Docker上のコンテナをビルド・再構成すること。

### 標準コンテナ反映手順
1. フロントエンド変更時: `cd frontend && node ./node_modules/vite/bin/vite.js build && cp -r dist/* ../backend/static/`
2. コンテナ停止・ビルド・再起動: `docker compose down && docker compose up -d --build`
3. 稼働確認: `docker compose ps` (すべてのサービスが Up であることを確認)

---

## 3. 開発・検証の基本原則

- コードの変更を行った後は、単体テスト・型チェックおよび Docker コンテナ環境での実動作確認を必ず実施すること。
- ドキュメント改訂時には、改定内容に応じた更新履歴を表形式で各文書末尾に追記すること。
