---
schema_version: "2.5.0"
claim_id: "CLAIM-20261028-bicycle-log-PAT-SYS-007"
pattern_id: "PAT-SYS-007"
title: "CIパイプライン・スケルトン・シナリオテスト間の整合性担保規約（FastAPI Ruff適合、ロックファイル追跡、実行ディレクトリ非依存パス）"
created_at: "2026-10-28T11:23:00+09:00"
source_project_profile: "Profile A"
applicable_profiles: ["Profile A", "Profile B", "Profile D"]
category: "SYS"
severity: "HIGH"
target_candidates:
  - file: "skeletons/profile-a/backend/pyproject.toml"
    section_anchor: "[tool.ruff.lint]"
    integration_type: "SUBSUMPTION"
  - file: "rules/AGENTS.md"
    section_anchor: "## 4. 2層構造システムプロファイル体系 & Shift-Left Hard Gate 規約"
    integration_type: "NEW_RULE"
status: "INBOX_PENDING"
consolidated_from: []
---

# CIパイプライン・スケルトン・シナリオテスト間の整合性担保規約

## 1. 発生コンテキストと前提条件 (Context & Preconditions)
- **対象環境**: Profile A / Profile B / Profile D における Web/API バックエンドおよびフロントエンド環境
- **適用フェーズ**: PHASE 1 (セットアップ) 〜 PHASE 6 (自動テスト) および CI 実行時
- **技術要素**: FastAPI, SQLModel, Ruff, Mypy, Node.js (`npm ci`), Pytest

## 2. 事象と根本原因分析 (Problem & Root Cause Analysis)
- **事象 1 (Frontend)**: リモート CI で `npm ci` が `EUSAGE: package-lock.json 不在` で失敗。
  - **根本原因**: レガシー `.gitignore` の `*.json` 設定により `package-lock.json` が除外されていた。
- **事象 2 (Backend Ruff)**: `ruff check .` が 522 件のエラーで失敗。
  - **根本原因**: スケルトンの `pyproject.toml` に FastAPI イディオム（`B008` 等）の ignore 設定がなく、さらにブラウンフィールド改訂時に `pyproject.toml` が補完されず素の Ruff が走った。
- **事象 3 (Backend Pytest)**: CI の `working-directory: backend` で `pytest` を実行するとシナリオテストでパス参照エラーが発生。
  - **根本原因**: テストコードがプロジェクトルート相対パス（`Path("frontend/...")`）をカレントディレクトリ依存で参照していた。

## 3. 抽象化された処方箋・推奨ルール (Distilled Prescription)
- バックエンドの静的解析設定（`pyproject.toml`）には、フレームワーク標準イディオム（FastAPI `Depends` 等）との競合抑止（`B008`, `E402` 等の ignore）および循環参照用型アノテーションの許容（`per-file-ignores`）を初期配備する。
- リポジトリの除外設定（`.gitignore`）において `*.json` などの広範な除外ルールを適用する場合でも、CI 再現性維持のため `!package-lock.json` は例外ホワイトリストとして保護する。
- モジュール境界を跨ぐシナリオテストコードにおいては、テストランナーの実行ディレクトリに依存しない `ROOT_DIR = Path(__file__).resolve().parent.parent.parent` 基準の解決パスを使用する。
- 改訂（ブラウンフィールド）セットアップ時、既存ディレクトリが存在する場合でも、`pyproject.toml` などの品質管理設定ファイルが欠落している場合は自動補完を行う。

## 4. 既存ルールとの意味的関係・統合指針 (Semantic Integration Guide)
- **コア不変原則との整合性**:
  - `INV-01 (決定論的自動化)`: CI 再現性の確保（`npm ci` 担保）と実行カレントディレクトリ非依存化により、ローカル/CI 間の結果乖離を根絶する。
  - `INV-04 (シフトレフト静的遮断)`: フレームワークの正当な実装を阻害しない実効的な静的解析ルールの標準化。
- **統合指針**:
  - `skeletons/profile-a/backend/pyproject.toml` の `[tool.ruff.lint]` に `ignore = ["B008", "E402"]` および `per-file-ignores` を追加。
  - `dev-phase1-setup` スキルに `.gitignore` の `!package-lock.json` 保証および `pyproject.toml` 欠落時補完ステップを追加。

## 5. 検証エビデンス (Verification Evidence)
- `bicycle-log` にて上記是正を実施後、ローカル CI シミュレーション（Ruff / Mypy / Pytest 39件 / npm type-check & build / harness_guard）がすべて Exit Code 0 で PASS することを確認。
