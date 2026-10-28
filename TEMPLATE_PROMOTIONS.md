# 知見昇格レビュー用提示サマリ (TEMPLATE_PROMOTIONS)

本ファイルは、プロジェクト開発・改訂中に獲得され、`./wiki/patterns/universal/` に永続化された「汎用知見（Tier 2: 全体共通知見）」を基に、👑 プロジェクトコンダクター（`wiki-proposer` 実行）が立案した改善パッチ・提案内容を、PHASE 8 においてユーザーが承認判断するための **「提示サマリ」** です。

---

## 1. 昇格先ルーティング仕様 (EXECUTION_MODE 連動)

ユーザー承認後、`PROJECT_STATE.md` に記録された `EXECUTION_MODE` に応じて安全に処理されます：
- **`GLOBAL_PLUGIN` モード**:
  - グローバル資産への直接書き込みを防止し、`./promotions/` ディレクトリ配下に差分パッチ（`./promotions/*.patch`）を自動出力します。
- **`LOCAL_STANDALONE` モード**:
  - ローカルプラグイン資産（`.agents/plugins/system-dev-pipeline/`）へ直接反映します。

---

## 2. 昇格提案一覧

| 提案ID | 参照Wikiパターン | 対象スキル / ルール | 提案タイトル | 複合検証 (Gating) | ユーザー承認 | 判定日 |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| PROP-001 | PAT-SYS-007 | skeletons/profile-a/, rules/AGENTS.md | CI・スケルトン・シナリオテスト整合性担保規約 | ✅ PASS (検証完了) | 待機中 | 2026-10-28 |

---

## 3. 提案詳細および最小パッチ概要

### [PROP-001]: CI・スケルトン・シナリオテスト整合性担保規約
- **原票ID**: `CLAIM-20261028-bicycle-log-PAT-SYS-007` (./promotions/CLAIM-20261028-bicycle-log-PAT-SYS-007.md)
- **参照WikiパターンID**: PAT-SYS-007 (./wiki/patterns/universal/PAT-SYS-007_ci_skeleton_consistency.md)
- **関連エージェント/スキル**: `conductor` / `qa-engineer` / `dev-phase1-setup`
- **改訂動機・背景**:
  - GitHub Actions CI において、FastAPI標準の `Depends` 構文が Ruff `B008` で誤認検知される問題、既存プロジェクト改訂時に `package-lock.json` が除外される問題、およびシナリオテストの実行ディレクトリ依存エラーを根絶するため。
- **変更内容概要**:
  - `skeletons/profile-a/backend/pyproject.toml`: FastAPI 適合ルール (`B008`, `E402`, `per-file-ignores`) の標準装備
  - `skeletons/common/.github/workflows/ci.yml`: パス基準化および実スクリプト適合
  - `dev-phase1-setup`: ブラウンフィールド改訂時の `pyproject.toml` 欠落自動補完および `.gitignore` のロックファイル保護
- **Central Knowledge Hub 状態**: `~/.gemini/knowledge-hub/inbox/` へ投函完了 (INBOX_PENDING)
