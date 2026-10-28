# STAGE 2 詳細作業手順書: ディレクトリ構造標準化とスケルトン配備

- **ステージ番号**: STAGE 2
- **主担当エージェント**: 👑 プロジェクトコンダクター (`conductor`)
- **目的**: system-dev-pipeline V2.6 のディレクトリ構造規約に 100% 準拠させ、ドキュメントの Single Source of Truth（`docs/設計書/Current/`）を確立し、パイプライン管理ツール群および Git pre-commit フックを配備する。
- **所要想定時間**: 1 セッション
- **スレッドクローズ基準**: ディレクトリ構造変更およびスクリプト配備完了後、ユーザー承認を得て Git コミットを実施。

---

## 1. ドキュメント構造の標準化（`docs/` の正規化）

V2.6 規約では、`docs/設計書/Current/` を唯一の正本（Single Source of Truth）とし、検討中メモや過渡期資料は `docs/検討課題/` へ完全分離する。

### 実行コマンド
```bash
# 1. 標準ディレクトリの作成
mkdir -p docs/設計書/Current
mkdir -p docs/検討課題/archive
mkdir -p docs/plans/scenario-test
mkdir -p docs/plans/metrics
mkdir -p docs/reports

# 2. 正式設計書を docs/設計書/Current/ へ移動
mv docs/要件定義書.md docs/設計書/Current/
mv docs/技術要件定義書.md docs/設計書/Current/
mv docs/テーブルスキーマ定義書.md docs/設計書/Current/
mv docs/ビジネスロジック仕様書.md docs/設計書/Current/
mv docs/画面仕様書.md docs/設計書/Current/
mv docs/バックエンドAPI仕様書.md docs/設計書/Current/
mv docs/本番適用作業手順書.md docs/設計書/Current/

# 3. 過渡期資料・個別機能メモを docs/検討課題/archive/ へ退避
mv docs/implementation_plan.md docs/検討課題/archive/ 2>/dev/null || true
mv docs/定番ルート機能実装計画.md docs/検討課題/archive/ 2>/dev/null || true
mv docs/データベースの再アップロード手順.md docs/検討課題/archive/ 2>/dev/null || true
mv docs/AI駆動システム開発フェーズ定義書.md docs/検討課題/archive/ 2>/dev/null || true
mv docs/AI駆動ロギングシステム仕様書.md docs/検討課題/archive/ 2>/dev/null || true
mv docs/APIキー安全管理・一元化設計書.md docs/検討課題/archive/ 2>/dev/null || true
mv docs/滞在記録方式.md docs/検討課題/archive/ 2>/dev/null || true

# 4. docs/plans/ および docs/reports/ の整理
# legacy ディレクトリが残っている場合は archive へ統合
```

---

## 2. パイプライン管理スクリプトおよび Shift-Left Hard Gate 配備

プラグイン共通資産からパイプライン管理ツール群および Git フックを配備する。

### 実行コマンド
```bash
PLUGIN_DIR="$HOME/.gemini/config/plugins/system-dev-pipeline"

# 1. scripts/ 配下へ管理ツールを配備
cp "$PLUGIN_DIR/scripts/state_manager.py" scripts/
cp "$PLUGIN_DIR/scripts/harness_guard.py" scripts/
cp "$PLUGIN_DIR/scripts/traceability_checker.py" scripts/
chmod +x scripts/*.py

# 2. .githooks/pre-commit の配備
mkdir -p .githooks
cp "$PLUGIN_DIR/skeletons/common/.githooks/pre-commit" .githooks/
chmod +x .githooks/pre-commit

# 3. Git フックパスの設定
git config core.hooksPath .githooks

# 4. CI/CD およびエディタ共通設定の配備
mkdir -p .github/workflows
cp "$PLUGIN_DIR/skeletons/common/.github/workflows/ci.yml" .github/workflows/
cp "$PLUGIN_DIR/skeletons/common/.editorconfig" ./
```

---

## 3. ドキュメント内相対パスリンクの点検

`README.md` 等の文書内に絶対パス（`file:///` や `/Users/...`）が含まれていないか確認し、対象ファイル間の相対パスに修正する。

### 実行コマンド
```bash
# Markdown 相対パス違反の検出
python3 scripts/harness_guard.py --files README.md
```

---

## 4. 完了検証と台帳更新

1. `python3 scripts/state_manager.py verify-integrity` を実行。
2. ディレクトリ構造が V2.6 規約に準拠していることを確認。

---

## 5. スレッドクローズと承認ゲート（Git Commit 準備）

コンダクターは以下のサマリをユーザーに提示し、承認を仰ぐ。

### ユーザー確認項目
- [ ] `docs/設計書/Current/` に 7 大設計書が集約され、`docs/検討課題/` に過渡期資料が退避されていること。
- [ ] `scripts/` に `state_manager.py`, `harness_guard.py`, `traceability_checker.py` が配備されていること。
- [ ] `.githooks/pre-commit` が有効化されていること。

> **承認後の Git コミットメッセージ例**:
> `chore(infra): STAGE 2 - ディレクトリ構造V2.6標準化とパイプライン管理ツール配備`
