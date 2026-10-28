# 要件トレーサビリティマトリクス (RTM: Requirements Traceability Matrix)

- **生成ツール**: `scripts/traceability_checker.py` (Profile E)
- **要件総数**: 15 件
- **総テストケース数**: 59 件 (うち異常系・境界値: 33 件, 異常系比率: 55.9%)

| 要件ID | 分類 | 要件概要 | 基本設計反映 | テスト反映 | 充足ステータス |
| :--- | :---: | :--- | :--- | :--- | :---: |
| REQ-F01 | Functional | 自転車・ギア管理機能 | テーブルスキーマ定義書.md, 技術要件定義書.md, バックエンドAPI仕様書.md, ビジネスロジック仕様書.md, 画面仕様書.md | test_scenario_functional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-F02 | Functional | Strava 連携・アクティビティ自動同期機能 | テーブルスキーマ定義書.md, 技術要件定義書.md, バックエンドAPI仕様書.md, ビジネスロジック仕様書.md, 本番適用作業手順書.md, 画面仕様書.md | test_scenario_functional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-F03 | Functional | 滞在スポット自動検知・手動記録機能 | テーブルスキーマ定義書.md, 技術要件定義書.md, バックエンドAPI仕様書.md, ビジネスロジック仕様書.md, 本番適用作業手順書.md, 画面仕様書.md | test_scenario_functional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-F04 | Functional | 走行ログ・写真ギャラリー管理機能 | テーブルスキーマ定義書.md, 技術要件定義書.md, バックエンドAPI仕様書.md, ビジネスロジック仕様書.md, 本番適用作業手順書.md, 画面仕様書.md | test_scenario_functional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-F05 | Functional | 定番ルート登録・マッチング機能 | テーブルスキーマ定義書.md, 技術要件定義書.md, バックエンドAPI仕様書.md, ビジネスロジック仕様書.md, 画面仕様書.md | test_scenario_functional.py, シナリオテスト計画書.md, test_analytics_and_routes.py | ✅ PASS |
| REQ-F06 | Functional | 統計分析・ダッシュボード機能 | 技術要件定義書.md, バックエンドAPI仕様書.md, ビジネスロジック仕様書.md, 画面仕様書.md | test_scenario_functional.py, シナリオテスト計画書.md, test_analytics_and_routes.py | ✅ PASS |
| REQ-F07 | Functional | マスタ設定機能 | テーブルスキーマ定義書.md, 技術要件定義書.md, バックエンドAPI仕様書.md, ビジネスロジック仕様書.md, 画面仕様書.md | test_scenario_functional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-NF01 | Non-Functional | Anti-God Component / 行数制限 (Hard Gate) | 技術要件定義書.md, バックエンドAPI仕様書.md, 本番適用作業手順書.md, 画面仕様書.md | test_scenario_nonfunctional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-NF02 | Non-Functional | 要件トレーサビリティ (RTM 100% カバレッジ & 異常系 20% 以上) | 技術要件定義書.md, 本番適用作業手順書.md | test_scenario_nonfunctional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-NF03 | Non-Functional | ブラウザ感覚センサー (WCAG AA & エラーゼロ) | 技術要件定義書.md, 本番適用作業手順書.md, 画面仕様書.md | test_scenario_nonfunctional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-NF04 | Non-Functional | 型定義自動同期 (OpenAPI ➔ TypeScript Codegen) | 技術要件定義書.md, バックエンドAPI仕様書.md | test_scenario_nonfunctional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-NF05 | Non-Functional | シークレット厳格検証 (Pydantic Settings 起動時即死ガード) | 技術要件定義書.md, バックエンドAPI仕様書.md, 本番適用作業手順書.md | test_scenario_nonfunctional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-NF06 | Non-Functional | 統一タイムゾーン (Aware UTC 保存 / JST 表示) | テーブルスキーマ定義書.md, 技術要件定義書.md, バックエンドAPI仕様書.md, ビジネスロジック仕様書.md, 本番適用作業手順書.md | test_scenario_nonfunctional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-NF07 | Non-Functional | モック制御アダプター層 (MSW 集約 & 実結合フォールバック禁止) | 技術要件定義書.md, ビジネスロジック仕様書.md, 本番適用作業手順書.md, 画面仕様書.md | test_scenario_nonfunctional.py, シナリオテスト計画書.md | ✅ PASS |
| REQ-NF08 | Non-Functional | 画面グランドデザイン (4px/8px グリッド & 明暗ペア & デイライト視認性) | 技術要件定義書.md, 画面仕様書.md | test_scenario_nonfunctional.py, シナリオテスト計画書.md | ✅ PASS |
