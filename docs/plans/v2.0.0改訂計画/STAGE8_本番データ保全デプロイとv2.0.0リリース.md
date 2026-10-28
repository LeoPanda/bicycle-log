# STAGE 8 詳細作業手順書: 本番データ保全デプロイとv2.0.0リリース

- **ステージ番号**: STAGE 8
- **主担当エージェント**: 👑 プロジェクトコンダクター (`conductor`)
- **目的**: データベースの実データを100%保全した上で、バージョン表記を v2.0.0 に統一し、本番適用手順を最新化し、Git 本番リリース（main マージ・v2.0.0 タグ付与）および開発メトリクス集計を完了させて台帳を `PRODUCTION_ACTIVE` へ移行する。
- **所要想定時間**: 1 セッション
- **スレッドクローズ基準**: 全面改訂完了報告およびユーザー最終完了承認。

---

## 1. バージョン表記の統一確認

改訂後のバージョンがシステム全体で `v2.0.0` に統一されていることを確認する。

### 対象ファイルと設定値
- `.env`: `APP_VERSION=2.0.0`
- `frontend/package.json`: `"version": "2.0.0"`
- `backend/app/core/config.py`: デフォルトバージョン `2.0.0`
- `project_state.json`: `app_version: "2.0.0"`

---

## 2. データベース実データ最終保全検証

改訂前（STAGE 1）に記録したベースラインレコード数と現在の `data/app.db` を照合し、1 件のデータ損耗もないことを最終確認する。

### 実行コマンド
```bash
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
" > backup/v2.0.0_snapshots/record_counts_final.txt

diff -u backup/v2.0.0_snapshots/record_counts_baseline.txt backup/v2.0.0_snapshots/record_counts_final.txt
```
差分がゼロであることを確認。

---

## 3. 本番適用作業手順書の最新化

担当: 👑 コンダクター

`docs/設計書/Current/本番適用作業手順書.md` を最新の Profile A 構成（Cloud Run, Litestream, GCS バケット, Alembic 適用コマンド）に合わせて更新する。

---

## 4. 定量メトリクス集計

パイプラインの定量メトリクス集計スクリプトを実行し、総合健全性スコアおよび診断レポートを出力する。

```bash
PLUGIN_DIR="$HOME/.gemini/config/plugins/system-dev-pipeline"
python3 "$PLUGIN_DIR/skills/dev-metrics-collector/scripts/metrics_collector.py" --all --sync-state
```

---

## 5. GitHub 本番リリースとブランチ刷新 (`dev-git-release`)

担当: 👑 コンダクター専任実行

```bash
# 1. main ブランチへのチェックアウトとマージ
git checkout main
git merge --squash feature
git commit -m "release: bicycle-log v2.0.0全面改訂 (system-dev-pipeline V2.6適合)"

# 2. バージョンタグの付与
git tag -a v2.0.0 -m "Release v2.0.0 - Pipeline V2.6 Full Compliance"

# 3. リモートへの push
git push origin main --tags

# 4. feature ブランチの再作成
git branch -D feature
git checkout -b feature
```

---

## 6. 台帳の最終クローズ (`PRODUCTION_ACTIVE`)

```bash
python3 scripts/state_manager.py complete-revision
python3 scripts/state_manager.py set-phase PRODUCTION_ACTIVE
```

- 成果物: `docs/reports/v2.0.0全面改訂完了レポート.md`
- `project_state.json` および `PROJECT_STATE.md` が `PRODUCTION_ACTIVE` となり、改訂ライフサイクルが完了する。

---

## 7. ユーザー最終完了報告

コンダクターは全面改訂完了レポートおよびコンテナ稼働状態（`docker compose ps`）をユーザーへ提示し、v2.0.0 適合改訂の完了承認を仰ぐ。
