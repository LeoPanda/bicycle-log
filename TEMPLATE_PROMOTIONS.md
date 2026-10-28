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
| - | - | - | 提案待機中 | - | - | - |

---

## 3. 提案詳細および最小パッチ概要

<!--
### [PROP-001]: [タイトル]
- **参照WikiパターンID**: PAT-CAT-xxx (./wiki/patterns/universal/PAT-CAT-xxx.md)
- **関連エージェント/スキル**: [conductor / architect / backend-engineer / ui-designer / qa-engineer]
- **改訂動機・背景**:
  - [なぜこのルール・スキルの修正が必要か]
- **変更内容概要**:
  - [変更対象ファイルおよび変更点]
- **PURPOSE.md 記録内容**:
  - [skills/{skill}/PURPOSE.md へ記載した内容]
- **出力パッチ**:
  - `./promotions/{target}.patch`
- **複合検証ゲート (Gating) 結果**:
  - 静的解析: PASS / ドキュメント整合性: PASS / シナリオテスト: PASS / トークン効率: PASS
-->
