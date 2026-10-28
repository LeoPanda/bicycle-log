---
schema_version: "2.5.0"
claim_id: "CLAIM-20261028-bicycle-log-PAT-DOC-003"
pattern_id: "PAT-DOC-003"
title: "Mermaid ダイアグラムにおける特殊記号・括弧を含むラベルのクォート強制規約および静的監査"
created_at: "2026-10-28T13:57:00+09:00"
source_project_profile: "Profile A"
applicable_profiles: ["ALL"]
category: "DOC"
severity: "MEDIUM"
target_candidates:
  - file: "rules/AGENTS.md"
    section_anchor: "## 1. ドキュメントおよびコードの文字コード・フォーマット"
    integration_type: "NEW_RULE"
  - file: "scripts/harness_guard.py"
    section_anchor: "def check_mermaid_syntax"
    integration_type: "SUBSUMPTION"
status: "INBOX_PENDING"
consolidated_from: []
---

# Mermaid ダイアグラムにおける特殊記号・括弧を含むラベルのクォート強制規約および静的監査

## 1. 発生コンテキストと前提条件 (Context & Preconditions)
- **対象環境**: 全プロファイル共通（ALL）
- **適用フェーズ**: 設計書（`docs/`）およびリポジトリ `README.md` 等の Markdown 作成・改訂時
- **技術要素**: Markdown, Mermaid (`flowchart`, `sequenceDiagram`), GitHub Rich Display

## 2. 事象と根本原因分析 (Problem & Root Cause Analysis)
- **事象**: GitHub 上で `README.md` 等の Mermaid フローチャートが `Unable to render rich display` / `Parse error: Expecting ... got 'PS'` となり、ダイアグラムが描画されない。
- **根本原因**:
  1. Mermaid の矢印ラベル（`-->|ラベル|`）やノード定義内に、丸括弧 `()` や隅付き括弧 `【】` などの特殊記号がダブルクォーテーションでクォートされずに直書きされていたため、パーサーがノード形状定義記号（丸角・スタジアム型など）と誤認して構文エラーを引き起こした。
  2. 過去に別プロジェクト（`template` リポジトリ `a86ba88`）で同一の問題を手動修正していたが、Central Knowledge Hub に知見原票として昇格・ルール化されていなかったため、機械的ガードレール（`harness_guard.py`）が整備されず、別プロジェクトの `README.md` で再発に至った。

## 3. 抽象化された処方箋・推奨ルール (Distilled Prescription)
- 設計書および Markdown 内で Mermaid ダイアグラムを記述する際、矢印ラベル（`-->|"..."|`）やノード名に特殊記号（丸括弧 `()`、角括弧 `[]`、波括弧 `{}`、隅付き括弧 `【】`、スラッシュ `/`、コロン `:` 等）を含める場合は、必ずラベル全体をダブルクォーテーション（`"`）で囲まなければならない。
- コミット前検証スクリプト（`harness_guard.py`）およびドキュメントレビュアーツールにおいて、Markdown ファイル内の Mermaid ブロック（` ```mermaid `）を抽出し、クォートされていない括弧付き矢印ラベル（正規表現: `-->\|[^\"\|]*[\(\)\[\]\{\}【】][^\"\|]*\|`）を検出してコミット前に機械遮断・警告する静的監査ガードを導入する。

## 4. 既存ルールとの意味的関係・統合指針 (Semantic Integration Guide)
- **コア不変原則との整合性**:
  - `INV-04 (シフトレフト静的遮断)`: ドキュメント構文の欠陥をリモート push 前にローカル静的解析で機械遮断し、GitHub 上でのレンダリング障害を根絶する。
  - `INV-01 (決定論的自動化)`: 閲覧環境に左右されない安全な Markdown/Mermaid 記法の標準化。
- **統合指針**:
  - `rules/AGENTS.md` の「## 1. ドキュメントおよびコードの文字コード・フォーマット」に、Mermaid 特殊文字クォートの標準規約を明記。
  - `scripts/harness_guard.py` に `check_mermaid_labels` ルールを追加。

## 5. 検証エビデンス (Verification Evidence)
- `bicycle-log` の `README.md` において `FastAPI -->|"Nearby Search (Fallback)"| Places` へクォートを適用し、構文エラーが解消されることを確認。
- `template` リポジトリの `a86ba88` コミットにおける修正実績と整合。
