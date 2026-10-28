# STAGE 1 詳細作業手順書: 台帳移行と不要ルール撤廃

- **ステージ番号**: STAGE 1
- **主担当エージェント**: 👑 プロジェクトコンダクター (`conductor`)
- **目的**: 現行プロジェクトの全履歴・データを保全した上で、状態管理台帳を V2.6 機械正本（`project_state.json`）へ移行し、開発のノイズとなる旧ルール文書・不要ファイルを撤廃する。
- **所要想定時間**: 1 セッション
- **スレッドクローズ基準**: 台帳整合性確認およびデータバックアップ完了後、ユーザー承認を得て Git コミットを実施。

---

## 1. 事前データバックアップ（データ保全手順）

改訂作業に伴う事故を完全に防ぐため、現行データベースのコールドバックアップを取得し、レコード数を記録する。

### 実行コマンド
```bash
# 1. バックアップディレクトリの準備
mkdir -p backup/v2.1.0_snapshots

# 2. 現行DBのコールドバックアップ（タイムスタンプ付き）
cp data/app.db backup/v2.1.0_snapshots/app_pre_stage1_$(date +%Y%m%d_%H%M%S).db
cp data/app.db backup/v2.1.0_pre_upgrade_snapshot.db

# 3. 現行レコード数の記録
sqlite3 data/app.db "
SELECT 'bikes', count(*) FROM bikes UNION ALL
SELECT 'places', count(*) FROM places UNION ALL
SELECT 'activities', count(*) FROM activities UNION ALL
SELECT 'stay_logs', count(*) FROM stay_logs UNION ALL
SELECT 'routes', count(*) FROM routes UNION ALL
SELECT 'tags', count(*) FROM tags UNION ALL
SELECT 'activity_tags', count(*) FROM activity_tags UNION ALL
SELECT 'place_tags', count(*) FROM place_tags UNION ALL
SELECT 'stay_log_images', count(*) FROM stay_log_images;
" > backup/v2.1.0_snapshots/record_counts_baseline.txt

cat backup/v2.1.0_snapshots/record_counts_baseline.txt
```

---

## 2. 機械正本 `project_state.json` の作成と履歴引き継ぎ

現行 `PROJECT_STATE.md` に記録されている新規開発フェーズ（PHASE 1〜8完了）、改訂履歴（1.1.001, 1.2.001, 1.2.002）、展開プロファイル（Profile A）等の全情報を `project_state.json` へ引き継ぎ、V2.6 スキーマに準拠して新規作成する。

### 引き継ぐ主要メタデータ
- `project_name`: `bicycle-log`
- `app_version`: `2.1.0`
- `deployment_profile`: `Profile A: クラウド公開 (Cloud-Native Web Service)`
- `mock_mode`: `ENABLED`
- `execution_mode`: `GLOBAL_PLUGIN`
- `current_branch`: `feature`
- `phases`: PHASE 1〜8 はすべて COMPLETED（履歴保持）
- `revisions`:
  - `current_revision_status`: `ACTIVE`
  - `active_revision_id`: `2.1.001`
  - `current_turn`: 1
  - `history`: 過去の 1.1.001, 1.2.001, 1.2.002 を完全格納

### 実行コマンド
```bash
# scripts/state_manager.py をプラグインから一時コピーして検証に使用
cp ~/.gemini/config/plugins/system-dev-pipeline/scripts/state_manager.py scripts/
python3 scripts/state_manager.py verify-integrity
```

---

## 3. 不要ルール文書および一時ファイルの撤廃

ユーザー方針に基づき、AIエージェントのプロンプトノイズとなる旧ルール文書を排除する。

### 削除対象ファイル
1. **ルート直下の旧ルールファイル**:
   - `AGENTS.md`
   - `GEMINI.md`
2. **`rules/` 配下の旧規約ファイル**:
   - `rules/dev-process-standards.md`
   - `rules/システム改訂ルール.md`
3. **作業残骸・不要ディレクトリ**:
   - `restore_tmp/`（空ディレクトリ削除）
   - `data/app.db.before_*`, `data/app.db.old`（`backup/archive/` へ移動・整理）

### 実行コマンド
```bash
# 1. 旧ルールのバックアップ退避（万一の参照用）
mkdir -p .agents/rules_legacy_backup
cp AGENTS.md GEMINI.md rules/dev-process-standards.md rules/システム改訂ルール.md .agents/rules_legacy_backup/

# 2. プロジェクトからの削除
rm -f AGENTS.md GEMINI.md
rm -f rules/dev-process-standards.md rules/システム改訂ルール.md

# 3. 不要データファイルの退避・整理
mkdir -p backup/archive
mv data/app.db.before_* backup/archive/ 2>/dev/null || true
mv data/app.db.old backup/archive/ 2>/dev/null || true
rmdir restore_tmp 2>/dev/null || true
```

---

## 4. 完了検証と台帳再生成

1. `python3 scripts/state_manager.py verify-integrity` を実行し、`project_state.json` のスキーマ検証と `PROJECT_STATE.md` の決定論的再生成を行う。
2. `git status` で変更内容を確認する。

---

## 5. スレッドクローズと承認ゲート（Git Commit 準備）

本ステージの作業完了後、コンダクターは以下のサマリをユーザーに提示し、承認を仰ぐ。

### ユーザー確認項目
- [ ] `data/app.db` のコールドバックアップが正常に取得されていること。
- [ ] `project_state.json` が生成され、過去の改訂履歴・進捗が引き継がれていること。
- [ ] 旧ルールファイル（`AGENTS.md`, `GEMINI.md`, `rules/*`）が削除され、プラグイン規約に一本化されていること。

> **承認後の Git コミットメッセージ例**:
> `feat(governance): STAGE 1 - 状態台帳project_state.json移行と旧ルール文書撤廃`
