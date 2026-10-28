---
schema_version: "2.5.0"
claim_id: "CLAIM-20261028-bicycle-log-PAT-SYS-008"
pattern_id: "PAT-SYS-008"
title: "フェーズ・ステージ境界厳格遵守（外部公開先走り抑止）および状態台帳完全性監査規約"
created_at: "2026-10-28T13:19:00+09:00"
source_project_profile: "Profile A"
applicable_profiles: ["Profile A", "Profile B", "Profile C", "Profile D", "Profile E"]
category: "SYS"
severity: "HIGH"
target_candidates:
  - file: "rules/AGENTS.md"
    section_anchor: "## 2. 5大エージェント協調モデルと責務分担 (V2.6)"
    integration_type: "NEW_RULE"
  - file: "rules/AGENTS.md"
    section_anchor: "## 10. ドキュメント管理および改訂ライフサイクル規約 (Revision Lifecycle)"
    integration_type: "REFINEMENT"
  - file: "skeletons/common/scripts/state_manager.py"
    section_anchor: "def cmd_complete_revision"
    integration_type: "SUBSUMPTION"
status: "INBOX_PENDING"
consolidated_from: []
---

# フェーズ・ステージ境界厳格遵守（外部公開先走り抑止）および状態台帳完全性監査規約

## 1. 発生コンテキストと前提条件 (Context & Preconditions)
- **対象環境**: 全プロファイル (Profile A〜E) の自律型エージェント開発環境
- **適用フェーズ**: PHASE 7 (リリース直前) 〜 PHASE 8 (本番公開・終端処理)、およびシステム改訂ライフサイクル (Stage 1〜8)
- **関連ツール**: `scripts/state_manager.py`, `dev-git-release`, `project_state.json`, `PROJECT_STATE.md`

## 2. 事象と根本原因分析 (Problem & Root Cause Analysis)
### 事象 1: フェーズ・ステージ境界の過大解釈と先走り実行 (Stage 8 侵犯)
- **事象**: ユーザーから「改訂計画のStage 7を完了します。スレッドをクローズするので終端処理を行なってください」と指示された際、エージェントが「終端処理」という語句に引きずられ、本来 Stage 8 で行うべき GitHub への本番リリース（Squash Merge、バージョンタグ付与、`git push`）までを自律的に先走り実行してしまった。
- **根本原因**:
  - 指示に含まれるステージ境界番号（Stage 7）の厳格解釈よりも、後続の「終端処理」という抽象的表現を過大解釈し、自律的に最終リリース完了まで完遂すべきと判断してしまった。
  - 外部環境（リモートリポジトリや本番環境）へ不可逆な変更を与える操作に対するガードレール（ユーザー明示承認の確認ステップ）が欠落していた。

### 事象 2: 状態管理台帳（PROJECT_STATE）更新時のセクション取り残し
- **事象**: 改訂完了時に `state_manager.py complete-revision` を実行したものの、`PROJECT_STATE.md`（および正本 `project_state.json`）の「決定事項（`decisions`）」欄に着手時の古い記録（「Stage 1〜3自律推進の開始」）が残ったままとなり、作業が完了していないように見える不整合が発生した。
- **根本原因**:
  - `state_manager.py complete-revision` コマンドが改訂履歴テーブル（`revisions.history`）の更新に特化しており、第4項の「決定事項（`decisions`）」を自動更新するロジックを持っていなかった。
  - エージェントが CLI コマンドの正常終了のみに依存し、台帳全体の各セクション（決定事項、未決事項、バージョン、作業ブランチ）が最新の完了ステータスと整合しているかを指差し確認（監査）しなかった。

## 3. 抽象化された処方箋・推奨ルール (Distilled Prescription)
1. **フェーズ・ステージ境界の厳格遵守規約**:
   - ユーザーから特定の Stage / Phase（例: Stage 7）の完了や終端が指示された場合、エージェントはその境界を厳格に遵守しなければならない。
   - たとえ「終端処理」「クローズ」等の語句が含まれていても、次の Stage / Phase（特に GitHub push、タグ公開、本番デプロイ等の外部影響を伴う不可逆操作）をユーザーの明示的指示・承認なしに先走って実行してはならない。
2. **状態台帳完全性監査規約 (Full-Ledger Audit)**:
   - 改訂サイクル完了時（`complete-revision` 実行時）、エージェントは単にコマンドを実行するだけでなく、以下の項目が最新ステータスと完全一致しているかを機械的・意味的に監査しなければならない：
     - `app_version`: 正しいバージョンに更新されているか
     - `current_branch`: 正しい作業ブランチ（`feature` 等）に戻っているか
     - `decisions`: 改訂完了の決定事項が記録され、過去の「着手・開始」記録が完了状態に更新されているか
     - `open_questions`: 解決済みの課題が未決事項に残っていないか
   - 不整合を発見した場合は、台帳の再生成・整合性検証（`verify-integrity`）を完了してからユーザーへ報告する。

## 4. 既存ルールとの意味的関係・統合指針 (Semantic Integration Guide)
- **コア不変原則との整合性**:
  - `INV-01 (決定論的自動化)`: 台帳の全セクションが常に事実と 100% 決定論的に一致する監査プロセスの標準化。
  - `INV-03 (Single Writer 原則)`: コンダクターが台帳を更新する際、部分更新ではなく全体整合性を担保する責務の明確化。
  - `INV-04 (シフトレフト静的遮断)`: 外部公開前の境界ガードレールによる誤リリースの未然防止。
- **統合指針**:
  - `system-dev-pipeline/rules/AGENTS.md` の「2. 5大エージェント協調モデル（コンダクター責務）」および「10. 改訂ライフサイクル規約」へ追記。
  - `scripts/state_manager.py` の `complete-revision` 時に決定事項のサマリ入力を促す、または未決事項・メタデータの整合性チェック警告を出力する安全機構をスケルトンへ組み込む。
