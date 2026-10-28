# STAGE 3 詳細作業手順書: 要件定義と基本設計の再構築

- **ステージ番号**: STAGE 3
- **主担当エージェント**: 📐 設計立案スペシャリスト (`architect`), 🛡️ 品質監査スペシャリスト (`qa-engineer`)
- **統括**: 👑 プロジェクトコンダクター (`conductor`)
- **目的**: 現行システムの全機能を漏れなく踏襲しつつ、要件定義書を `[REQ-Fxx]`/`[REQ-NFxx]` 体系で再構築し、4大基本設計書と完全バインドして、基本設計レビュー（`dev-review-arch`）およびトレーサビリティ検証を PASS させる。
- **所要想定時間**: 1〜2 セッション
- **スレッドクローズ基準**: 基本設計レビュー合格後、ユーザー承認を得て Git コミットを実施。

---

## 1. 要件定義書の再構築（`docs/設計書/Current/要件定義書.md`）

担当: 📐 `architect`（**run_command 禁止**）

### 必須記載事項
1. **2層プロファイル選定ディシジョンツリー**:
   - Profile A（サーバーレス極小コストWeb型: Cloud Run + SQLite WAL + Alembic + Litestream + React SPA + Tailwind CSS + MSW）の選定根拠を明記。
2. **機能要件の体系的採番 (`[REQ-Fxx]`)**:
   - `[REQ-F01]`: 自転車・ギア管理機能（登録・編集・走行距離積算・デフォルトバイク設定）
   - `[REQ-F02]`: Strava 連携・アクティビティ自動同期機能（OAuth2認証・ストリームデータ取得・GPSポリライン解析）
   - `[REQ-F03]`: 滞在スポット自動検知・手動記録機能（速度ゼロ判定・ジオコーディング・Google Places補完）
   - `[REQ-F04]`: 走行ログ・写真ギャラリー管理機能（WebPリサイズ・GCSアップロード・EXIFメタデータ抽出）
   - `[REQ-F05]`: 定番ルート登録・マッチング機能（類似度スコアリング・ルート詳細モーダル）
   - `[REQ-F06]`: 統計分析・ダッシュボード機能（月間走行距離推移・カテゴリ別滞在比率・ヒートマップ表示）
   - `[REQ-F07]`: マスタ設定機能（カテゴリ・タグ・外部APIクレデンシャル管理）
3. **非機能要件の定常コア8項目バインド (`[REQ-NFxx]`)**:
   - `[REQ-NF01]`: Anti-God Component / 行数制限（フロント250行 / バック400行機械遮断）
   - `[REQ-NF02]`: 要件トレーサビリティ（要件-設計-テスト 100% カバレッジ、異常系 20% 以上）
   - `[REQ-NF03]`: ブラウザ感覚センサー（Console Error 0件、WCAG AA 4.5:1、A11y適合）
   - `[REQ-NF04]`: 型定義自動同期（OpenAPI ➔ TypeScript Codegen 適合）
   - `[REQ-NF05]`: シークレット厳格検証（Pydantic Settings による起動時即死ガード）
   - `[REQ-NF06]`: 統一タイムゾーン（Aware UTC 保存 / JST 表示）
   - `[REQ-NF07]`: モック制御アダプター層（MSW 集約、環境変数切替、実結合フォールバック禁止）
   - `[REQ-NF08]`: 画面グランドデザイン（4px/8pxグリッド、明暗ペア、デイライト視認性）

---

## 2. 4大基本設計書の再構築と要件バインド

担当: 📐 `architect`（画面仕様書は 🎨 `ui-designer` が支援）

1. **技術要件定義書 (`docs/設計書/Current/技術要件定義書.md`)**:
   - IAP JWT 署名検証ミドルウェア（`core/auth.py`）、外部API二重キャッシュ戦略（TTLメモリ＋DB）、Alembic 運用方針、FastAPI + Vite アーキテクチャを明記。対応する `[REQ-NFxx]` を明記。
2. **テーブルスキーマ定義書 (`docs/設計書/Current/テーブルスキーマ定義書.md`)**:
   - 既存データベース（`bikes`, `places`, `activities`, `stay_logs`, `routes`, `tags`, `activity_tags`, `place_tags`, `stay_log_images`）のスキーマを完全反映し、Alembic マイグレーションとのマッピングを定義。
3. **ビジネスロジック仕様書 (`docs/設計書/Current/ビジネスロジック仕様書.md`)**:
   - Strava ストリーム解析アルゴリズム、滞在スポットクラスタリングロジック、画像圧縮変換（Pillow / WebP）処理を記述。
4. **画面仕様書 (`docs/設計書/Current/画面仕様書.md`)**:
   - グランドデザイン新規格に準拠し、主要 6 画面（Dashboard, Items, ItemDetail, Analytics, Master, RouteDetail）のコンポーネント構成ツリー（250行以下）、カラートークン（明暗ペア）、レイアウトグリッドを定義。

---

## 3. 設計トレーサビリティ検証と基本設計レビュー

担当: 🛡️ `qa-engineer`（レビュー実行）、👑 コンダクター（コマンド実行）

### 実行コマンド
```bash
# 1. 設計トレーサビリティ機械検証
python3 scripts/traceability_checker.py --mode design

# 2. 基本設計レビュー (dev-review-arch)
# テンプレート ~/.gemini/config/plugins/system-dev-pipeline/templates/基本設計レビュー結果報告書.md.template に基づき監査
```

- 監査観点:
  - 定常コア 8 項目の充足性
  - Profile A 固有要件（Alembic、IAP JWT、MSW）の網羅性
  - `REQ-*` トレーサビリティ 100% カバレッジ
- 成果物: `docs/reports/基本設計レビュー結果報告書_v2.1.0.md`

---

## 4. 台帳更新

基本設計レビューが `PASS`（または `CONDITIONAL PASS`）となった後、コンダクターが台帳を更新する。

```bash
python3 scripts/state_manager.py record-review arch PASS docs/reports/基本設計レビュー結果報告書_v2.1.0.md
```

---

## 5. スレッドクローズと承認ゲート（Git Commit 準備）

コンダクターは以下のサマリをユーザーに提示し、承認を仰ぐ。

### ユーザー確認項目
- [ ] `要件定義書.md` に現行全機能（`[REQ-F01]`〜）および定常コア（`[REQ-NF01]`〜）が採番・明記されていること。
- [ ] 4大基本設計書が作成・更新され、要件IDとの紐付けが完了していること。
- [ ] `traceability_checker.py --mode design` が PASS していること。
- [ ] 基本設計レビュー結果報告書が作成され、判定が PASS であること。

> **承認後の Git コミットメッセージ例**:
> `docs(arch): STAGE 3 - 要件定義および4大基本設計書の再構築と基本設計レビュー合格`
