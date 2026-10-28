---
schema_version: "2.5.0"
claim_id: "CLAIM-20261028-bicycle-log-PAT-SYS-009"
pattern_id: "PAT-SYS-009"
title: "改訂作業における5大エージェント協調モデルの自律委譲強制およびコンダクター直接編集制限規約"
created_at: "2026-10-28T14:26:00+09:00"
source_project_profile: "Profile A"
applicable_profiles: ["Profile A", "Profile B", "Profile C", "Profile D", "Profile E"]
category: "SYS"
severity: "HIGH"
target_candidates:
  - file: "rules/AGENTS.md"
    section_anchor: "## 2. 5大エージェント協調モデルと責務分担 (V2.6)"
    integration_type: "REFINEMENT"
  - file: "rules/AGENTS.md"
    section_anchor: "## 10. ドキュメント管理および改訂ライフサイクル規約 (Revision Lifecycle)"
    integration_type: "REFINEMENT"
status: "INBOX_PENDING"
consolidated_from: []
---

# 改訂作業における5大エージェント協調モデルの自律委譲強制およびコンダクター直接編集制限規約

## 1. 発生コンテキストと前提条件 (Context & Preconditions)
- **対象環境**: 全プロファイル (Profile A〜E) の自律型エージェント開発環境
- **適用フェーズ**: システム改訂ライフサイクル (Revision Lifecycle: 機能改訂、リファクタリング、Hotfix)
- **関連エージェント**: `conductor` (Main), `architect` (Subagent), `backend-engineer` (Subagent), `ui-designer` (Subagent), `qa-engineer` (Subagent)
- **関連ツール**: `invoke_subagent`, `scripts/state_manager.py`, `rules/AGENTS.md`

## 2. 事象と根本原因分析 (Problem & Root Cause Analysis)
### 事象: 改訂作業におけるコンダクターの自己完結と専門エージェントの形骸化
- **事象**: システム改訂（v2.1.0）および本番デプロイ作業において、本来 `system-dev-pipeline` で定義されている専門エージェント群（`architect`, `backend-engineer`, `ui-designer`, `qa-engineer`）への委譲が行われず、メインエージェント（コンダクター）が一人で設計書修正、ソースコード編集、テスト修正、デプロイ設定をすべて抱え込んで直接実行した。その結果、ユーザーから「エージェント群があまり活躍していないように見えた。改訂作業においてもエージェントを積極的に使うべき」との強い指摘を受けた。
- **根本原因**:
  1. **コンダクターの編集権限境界の欠如**: `architect`（run_command禁止）や `qa-engineer`（コード改変禁止）とは異なり、コンダクターに対する「ソースコードや設計書の直接編集の制限」が規約上明文化されていなかった。
  2. **セルフレビューによる潜在不具合の見落とし**: コンダクターが実装とレビューを兼任したことで客観的監査が機能せず、デプロイ時に「コンテナ内パス解決不備（`alembic.ini`）」や「既存DBへの baseline stamp 考慮漏れ」といった事後エラーを誘発した。
  3. **改訂ライフサイクルにおける委譲シーケンスの未定義**: 新規立ち上げフェーズ（PHASE 1〜8）に比べ、改訂サイクル（Revision）において「どのステップでどのサブエージェントを呼ぶべきか」が強制力を持つプロトコルとして定義されていなかった。

## 3. 抽象化された処方箋・推奨ルール (Distilled Prescription)
1. **👑 コンダクターの直接コード・設計編集禁止規約 (Conductor Delegation Invariant)**:
   - コンダクター（Main Agent）の責務は「全体オーケストレーション、ユーザー対話、進行管理、CLI環境操作、Git操作、本番デプロイ、状態台帳（`project_state.json`）の一元更新」に限定する。
   - **コンダクターが `docs/設計書/`、`backend/`、`frontend/` 配下のファイルを直接編集（`edit_file`, `write_file`）することを原則禁止する。**
   - 設計変更は必ず `architect`、実装は `backend-engineer` または `ui-designer` へ `invoke_subagent` 経由で委譲しなければならない。
2. **改訂ライフサイクル（Revision Lifecycle）における4段階エージェントディスパッチ義務化**:
   - 改訂起票後、コンダクターは以下のシーケンスでサブエージェントを必ず呼び出さなければならない：
     - **Step 1 (差分要件・設計)**: `architect` を呼び出し、要件差分（`[REQ-*]` 採番）および `docs/設計書/Current/` の更新を実施。
     - **Step 2 (差分実装)**: `backend-engineer`（BE）および `ui-designer`（FE）を呼び出し、AST規約・250行/400行制限・直書きモック排除に準拠して実装。
     - **Step 3 (独立監査・回帰検証)**: `qa-engineer` を呼び出し、`harness_guard.py`、`traceability_checker.py`、実ブラウザ感覚センサーによる客観的レビューを実施。
     - **Step 4 (リリース・終端)**: コンダクター専任でデプロイ、Gitリリース、台帳クローズ（`complete-revision`）を実行。
3. **改訂完了ゲートでの委譲監査 (Delegation Audit Guard)**:
   - `complete-revision` 実行時、改訂作業において専任サブエージェントへの委譲またはレビュー結果報告書が存在するかを指差し確認し、セルフ完結による改訂のクローズを抑止する。

## 4. 既存ルールとの意味的関係・統合指針 (Semantic Integration Guide)
- **コア不変原則との整合性**:
  - `INV-02 (関心事の分離)`: コンダクター（進行・環境）、アーキテクト（設計）、エンジニア（実装）、QA（監査）の責務境界を改訂時にも厳格維持。
  - `INV-03 (Single Writer 原則)`: 状態台帳はコンダクター専任、コード・設計書は専門エージェント専任とし、書き込み権限の完全分離を確立。
  - `INV-04 (シフトレフト静的遮断)`: コンダクターの直接編集を規約レベルで物理遮断し、セルフレビューによる品質劣化を未然防止。
- **統合指針**:
  - `system-dev-pipeline/rules/AGENTS.md` の「2. 5大エージェント協調モデル（コンダクター責務）」および「10. 改訂ライフサイクル規約」へ追記。
  - `~/.gemini/knowledge-hub/overlay/LOCAL_FEEDBACK_RULES.md` の `## [ORG] 拡張ガードレール` に即時反映。
