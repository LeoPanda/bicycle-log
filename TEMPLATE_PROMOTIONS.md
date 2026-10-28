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
| PROP-002 | PAT-SYS-008 | rules/AGENTS.md, scripts/state_manager.py | フェーズ・ステージ境界厳格遵守および状態台帳完全性監査規約 | ✅ PASS (投函完了) | 待機中 | 2026-10-28 |
| PROP-003 | PAT-DOC-003 | rules/AGENTS.md, scripts/harness_guard.py | Mermaid特殊記号・括弧クォート強制および静的監査規約 | ✅ PASS (投函完了) | 待機中 | 2026-10-28 |

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

### [PROP-002]: フェーズ・ステージ境界厳格遵守および状態台帳完全性監査規約
- **原票ID**: `CLAIM-20261028-bicycle-log-PAT-SYS-008` (./promotions/CLAIM-20261028-bicycle-log-PAT-SYS-008.md)
- **参照WikiパターンID**: PAT-SYS-008 (./wiki/patterns/universal/PAT-SYS-008_stage_boundary_and_ledger_audit.md)
- **関連エージェント/スキル**: `conductor` / `dev-git-release` / `state_manager`
- **改訂動機・背景**:
  - 「Stage 7 完了」「終端処理」の指示に対して、本来 Stage 8 で行うべき GitHub push を先走って実行してしまった問題、および改訂完了時に状態台帳（`project_state.json` / `PROJECT_STATE.md`）の決定事項欄が着手時の古い状態のまま取り残された問題を根絶するため。
- **変更内容概要**:
  - `system-dev-pipeline/rules/AGENTS.md`: 指示された Stage / Phase 境界の厳格遵守規約（不可逆な外部影響操作の先走り禁止）の明記
  - `system-dev-pipeline/rules/AGENTS.md`: 改訂完了時における全セクション完全監査規約（決定事項・未決事項・バージョン・ブランチの一致検証）の明記
  - `scripts/state_manager.py`: `complete-revision` 実行時に決定事項の更新とメタデータの完全性監査を行う安全機構の組み込み
- **Central Knowledge Hub 状態**: `~/.gemini/knowledge-hub/inbox/` へ投函完了 (INBOX_PENDING)

### [PROP-003]: Mermaid特殊記号・括弧クォート強制および静的監査規約
- **原票ID**: `CLAIM-20261028-bicycle-log-PAT-DOC-003` (./promotions/CLAIM-20261028-bicycle-log-PAT-DOC-003.md)
- **参照WikiパターンID**: PAT-DOC-003 (./wiki/patterns/universal/PAT-DOC-003_mermaid_label_quoting.md)
- **関連エージェント/スキル**: `architect` / `conductor` / `qa-engineer` / `harness_guard`
- **改訂動機・背景**:
  - `README.md` 等の Mermaid ダイアグラムにおいて、矢印ラベル内に丸括弧 `()` や隅付き括弧 `【】` 等の特殊記号がクォートなしで記述され、GitHub 上で `Unable to render rich display` パースエラーが発生した問題を根絶するため。過去に `template` リポジトリでも同種修正（コミット `a86ba88`）があったが知見未昇格だったため再発していた。
- **変更内容概要**:
  - `system-dev-pipeline/rules/AGENTS.md`: Mermaid 矢印ラベルおよびノード名に特殊記号を含む場合は必ずダブルクォーテーション（`"..."`）で囲む規約の明文化
  - `scripts/harness_guard.py`: Markdown 内の Mermaid ブロックを抽出し、クォートされていない括弧付き矢印ラベルをコミット前に機械遮断・警告するルールの導入
- **Central Knowledge Hub 状態**: `~/.gemini/knowledge-hub/inbox/` へ投函完了 (INBOX_PENDING)
