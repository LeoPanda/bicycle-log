# プロジェクト総合健全性診断レポート (bicycle-log)

- **測定日時**: 2026-10-28 09:52:18 JST
- **対象ワークスペース**: `/Users/sakyo/Documents/workspace/AI/bicycle-log`
- **測定モード**: 標準集計モード (トランスクリプト + 成果物)
- **解析セッション数**: 69 回
- **総合健全性スコア**: **68.9 / 100 点**
- **総合品質グレード**: **C (改善推奨 / Needs Improvement)**

---

## 1. カテゴリ別評価サマリ

| カテゴリ | 配点比重 | 獲得スコア | 100点換算 | 評価状況 |
| :--- | :---: | :---: | :---: | :--- |
| **リソース効率** | 25.0% | 16.02 点 | 64.1 点 | 🟡 標準 |
| **品質・堅牢性** | 35.0% | 34.9 点 | 99.7 点 | 🟢 良好 |
| **ナレッジ進化** | 15.0% | 0.0 点 | 0.0 点 | 🔴 要改善 |
| **ガバナンス** | 25.0% | 18.0 点 | 72.0 点 | 🟡 標準 |

---

## 2. 12指標詳細測定結果

| コード | 指標名 | カテゴリ | 実測値 | 配点 | 獲得点 | 評価基準概要 |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| `M-RES-01` | 最大コンテキスト消費率 | リソース効率 | **0.0 %** | 8.0点 | 8.0点 | 1Mウィンドウに対する最大消費率 (50%以下で満点) |
| `M-RES-02` | サブエージェント委譲率 | リソース効率 | **0.09 %** | 9.0点 | 0.02点 | 全ターンに対するサブエージェント委譲率 (40-60%推奨) |
| `M-RES-03` | 成果物トークン効率 | リソース効率 | **18998000.0 LOC/kTok** | 8.0点 | 8.0点 | 1kトークンあたりの追加コード行数 (2.0以上で満点) |
| `M-QLT-01` | 初回レビュー合格率 | 品質・堅牢性 | **100.0 %** | 12.0点 | 12.0点 | 3大レビューゲートの初回合格率 (100%満点) |
| `M-QLT-02` | 重大欠陥発生数 | 品質・堅牢性 | **0 件** | 10.0点 | 10.0点 | レビューで指摘された Critical / High 件数 (0件満点) |
| `M-QLT-03` | 重複ツール呼出率 | 品質・堅牢性 | **0.16 %** | 6.0点 | 5.9点 | 同一引数での連続ツール呼出率 (0%満点) |
| `M-QLT-04` | 自律修復収束ターン数 | 品質・堅牢性 | **1.0 ターン** | 7.0点 | 7.0点 | エラー発生から修復完了までの平均ステップ数 (1-2ターン満点) |
| `M-EVO-01` | プロジェクト固有知見数 | ナレッジ進化 | **0 件** | 8.0点 | 0.0点 | wiki/patterns/local に記録された知見数 (4件以上で満点) |
| `M-EVO-02` | 全体共通知見昇格数 | ナレッジ進化 | **0 件** | 7.0点 | 0.0点 | wiki/patterns/universal に昇格された汎用知見数 (3件以上で満点) |
| `M-GOV-01` | Single Writer 違反数 | ガバナンス | **0 件** | 10.0点 | 10.0点 | PROJECT_STATE.md の不正更新件数 (0件満点) |
| `M-GOV-02` | 不変則・規約逸脱件数 | ガバナンス | **0 件** | 8.0点 | 8.0点 | 生SQLや直書きモック等の規約逸脱件数 (0件満点) |
| `M-GOV-03` | 動的ターン予算超過率 | ガバナンス | **6.77 倍** | 7.0点 | 0.0点 | 動的ターン予算に対する所要ターン比率 (1.0倍以下満点) |

---

## 3. 開発リソース & セッション情報

- **通算会話ターン数**: 11684 ターン (ユーザー: 247 / モデル: 11437)
- **総所要時間**: 4528.9 分 (271735 秒)
- **総消費トークン**: 0 tokens (入力: 0 / 出力: 0)
- **キャッシュ読取トークン**: 0 tokens
- **ツール呼出総数**: 5569 回 (サブエージェント委譲: 10 回)
- **正味開発規模 (LOC)**: 18,998 行 (Git 全履歴通算挿入行数)
- **総コミット数**: 11 コミット
- **レビュー完了数**: 3 件 (初回合格: 3 件 / 初回合格率: 100.0%)
- **蓄積ナレッジ数**: 合計 0 件 (ローカル: 0 件 / 汎用昇格: 0 件)

### セッション別内訳

| No | トランスクリプトパス | ステップ数 | 消費トークン | 所要時間 |
| :---: | :--- | :---: | :---: | :---: |
| 1 | `~/.gemini/antigravity/brain/7b6788d8-2aaf-4a03-9d5f-5d57863a7c18/.system_generated/logs/transcript.jsonl` | 39 | 0 | 0.8分 |
| 2 | `~/.gemini/antigravity/brain/f86a9658-336a-41f1-9f2a-843942f08554/.system_generated/logs/transcript.jsonl` | 29 | 0 | 20.8分 |
| 3 | `~/.gemini/antigravity/brain/f76a75e0-7993-48f4-9cc7-ceed609da9b4/.system_generated/logs/transcript.jsonl` | 46 | 0 | 2.0分 |
| 4 | `~/.gemini/antigravity/brain/3667e38f-bab2-4d5f-a0e4-ff89d6061358/.system_generated/logs/transcript.jsonl` | 196 | 0 | 35.7分 |
| 5 | `~/.gemini/antigravity/brain/3d5e5bdf-3b85-48a3-97a2-5dc5143f7f4d/.system_generated/logs/transcript.jsonl` | 38 | 0 | 2.5分 |
| 6 | `~/.gemini/antigravity/brain/bd957db2-6ec1-4526-84d6-156471f1aba7/.system_generated/logs/transcript.jsonl` | 76 | 0 | 92.9分 |
| 7 | `~/.gemini/antigravity/brain/d39d2f17-8f38-4dc1-a543-fc9b06bb6c5d/.system_generated/logs/transcript.jsonl` | 135 | 0 | 156.6分 |
| 8 | `~/.gemini/antigravity/brain/12314327-5711-4917-96a5-63eedaa798ec/.system_generated/logs/transcript.jsonl` | 77 | 0 | 6.5分 |
| 9 | `~/.gemini/antigravity/brain/9b762d3e-505f-4c7b-8df9-28462ad6cc2a/.system_generated/logs/transcript.jsonl` | 101 | 0 | 16.9分 |
| 10 | `~/.gemini/antigravity/brain/969a951b-bee8-4f2c-a436-6b480af44f5c/.system_generated/logs/transcript.jsonl` | 91 | 0 | 25.1分 |
| 11 | `~/.gemini/antigravity/brain/73c7588e-0638-4e61-b96b-d3dc8f2af045/.system_generated/logs/transcript.jsonl` | 60 | 0 | 1.3分 |
| 12 | `~/.gemini/antigravity/brain/cdb97968-ac82-49b4-9ba0-f5e073c27b04/.system_generated/logs/transcript.jsonl` | 131 | 0 | 268.7分 |
| 13 | `~/.gemini/antigravity/brain/01afb66c-b1e5-4ce5-8ccb-34710277f347/.system_generated/logs/transcript.jsonl` | 212 | 0 | 11.8分 |
| 14 | `~/.gemini/antigravity/brain/11240e7a-26a6-4770-a4a3-34011890a448/.system_generated/logs/transcript.jsonl` | 41 | 0 | 4.8分 |
| 15 | `~/.gemini/antigravity/brain/98446305-f997-4407-9fb3-196e1739544d/.system_generated/logs/transcript.jsonl` | 85 | 0 | 382.3分 |
| 16 | `~/.gemini/antigravity/brain/73fb4420-9758-4dff-8bac-c93bf1adcbd6/.system_generated/logs/transcript.jsonl` | 91 | 0 | 9.7分 |
| 17 | `~/.gemini/antigravity/brain/61566ab2-eef7-4fbe-a92d-32dcd4286323/.system_generated/logs/transcript.jsonl` | 251 | 0 | 667.8分 |
| 18 | `~/.gemini/antigravity/brain/85b2bd6f-e98c-4464-9daa-57915c47912c/.system_generated/logs/transcript.jsonl` | 42 | 0 | 0.9分 |
| 19 | `~/.gemini/antigravity/brain/c6c38a95-dba2-41ef-851f-11e9d7763df4/.system_generated/logs/transcript.jsonl` | 199 | 0 | 108.9分 |
| 20 | `~/.gemini/antigravity/brain/c6b6904c-7114-4432-a32d-ab345bb4ec22/.system_generated/logs/transcript.jsonl` | 173 | 0 | 80.2分 |
| 21 | `~/.gemini/antigravity/brain/c41822ae-0da4-49c9-9a57-602baaa82835/.system_generated/logs/transcript.jsonl` | 137 | 0 | 16.0分 |
| 22 | `~/.gemini/antigravity/brain/5d3ef865-1004-4a74-846e-69c6ad91cb98/.system_generated/logs/transcript.jsonl` | 59 | 0 | 1.4分 |
| 23 | `~/.gemini/antigravity/brain/dfcd0557-a199-4766-9b3e-2be1fb902665/.system_generated/logs/transcript.jsonl` | 147 | 0 | 101.7分 |
| 24 | `~/.gemini/antigravity/brain/af7b30ec-2330-4aa1-a688-06682ac7db82/.system_generated/logs/transcript.jsonl` | 100 | 0 | 66.9分 |
| 25 | `~/.gemini/antigravity/brain/34b2c932-6d15-4408-9732-028d470dd1f6/.system_generated/logs/transcript.jsonl` | 82 | 0 | 1.9分 |
| 26 | `~/.gemini/antigravity/brain/b10d8ced-0afc-455d-8b55-f00a8eadcbc7/.system_generated/logs/transcript.jsonl` | 119 | 0 | 90.3分 |
| 27 | `~/.gemini/antigravity/brain/d0002ef7-ab7d-4b9e-bbe4-4b56058a60e6/.system_generated/logs/transcript.jsonl` | 29 | 0 | 62.1分 |
| 28 | `~/.gemini/antigravity/brain/f382b37f-ccbc-4804-8c45-337041d5988a/.system_generated/logs/transcript.jsonl` | 136 | 0 | 26.8分 |
| 29 | `~/.gemini/antigravity/brain/5021e627-9e17-46b3-b0ed-fa26f50052e1/.system_generated/logs/transcript.jsonl` | 89 | 0 | 24.5分 |
| 30 | `~/.gemini/antigravity/brain/03ccafe6-181c-4d49-92ea-6dafe9cb33df/.system_generated/logs/transcript.jsonl` | 105 | 0 | 16.4分 |
| 31 | `~/.gemini/antigravity/brain/5d949b6a-70f1-4aa4-adea-3bed9822c7ed/.system_generated/logs/transcript.jsonl` | 27 | 0 | 0.7分 |
| 32 | `~/.gemini/antigravity/brain/d6db9e24-8930-4123-8233-d355eb2a0286/.system_generated/logs/transcript.jsonl` | 101 | 0 | 1.9分 |
| 33 | `~/.gemini/antigravity/brain/7cda6a25-d447-41a6-8bb4-0badab132384/.system_generated/logs/transcript.jsonl` | 187 | 0 | 8.8分 |
| 34 | `~/.gemini/antigravity/brain/cfa9a531-d2aa-467d-ad84-582c6ea1fa9f/.system_generated/logs/transcript.jsonl` | 45 | 0 | 0.7分 |
| 35 | `~/.gemini/antigravity/brain/0525d416-fc43-4f5c-bd7b-69f013f61690/.system_generated/logs/transcript.jsonl` | 68 | 0 | 23.7分 |
| 36 | `~/.gemini/antigravity/brain/9554cdfe-5290-4636-b295-423cb3f014eb/.system_generated/logs/transcript.jsonl` | 168 | 0 | 174.4分 |
| 37 | `~/.gemini/antigravity/brain/ee1ef56e-e042-41fd-80be-b58dfd90473f/.system_generated/logs/transcript.jsonl` | 106 | 0 | 7.4分 |
| 38 | `~/.gemini/antigravity/brain/4b62624f-70c3-4d44-bdf5-955cdb5307e8/.system_generated/logs/transcript.jsonl` | 26 | 0 | 0.5分 |
| 39 | `~/.gemini/antigravity/brain/273c53b6-8810-45f5-9809-26edfa1a5956/.system_generated/logs/transcript.jsonl` | 41 | 0 | 0.8分 |
| 40 | `~/.gemini/antigravity/brain/3616ec45-1df6-4df2-8b20-de7af44f4820/.system_generated/logs/transcript.jsonl` | 794 | 0 | 150.8分 |
| 41 | `~/.gemini/antigravity/brain/2aa1c699-f199-4330-9c31-d78884b2dd6c/.system_generated/logs/transcript.jsonl` | 35 | 0 | 0.6分 |
| 42 | `~/.gemini/antigravity/brain/feabd147-a334-4838-8bfe-f72bf835a732/.system_generated/logs/transcript.jsonl` | 190 | 0 | 131.5分 |
| 43 | `~/.gemini/antigravity/brain/6acf6890-9a0a-4815-b1c2-bd725323f7aa/.system_generated/logs/transcript.jsonl` | 142 | 0 | 9.9分 |
| 44 | `~/.gemini/antigravity/brain/541400a2-2876-40ac-ab0f-8039e9a1a28a/.system_generated/logs/transcript.jsonl` | 27 | 0 | 0.9分 |
| 45 | `~/.gemini/antigravity/brain/a2a0ed93-c089-4303-a838-e3a2bb1a1e0a/.system_generated/logs/transcript.jsonl` | 165 | 0 | 6.5分 |
| 46 | `~/.gemini/antigravity/brain/31e45625-59c9-4a74-82a1-035d2739ae59/.system_generated/logs/transcript.jsonl` | 116 | 0 | 5.2分 |
| 47 | `~/.gemini/antigravity/brain/85f8479d-3fa2-484d-a74c-a1723dba1adb/.system_generated/logs/transcript.jsonl` | 82 | 0 | 4.5分 |
| 48 | `~/.gemini/antigravity/brain/78064eca-fc22-4544-8b91-61b5c1bbdf7c/.system_generated/logs/transcript.jsonl` | 64 | 0 | 10.0分 |
| 49 | `~/.gemini/antigravity/brain/c7667879-aafb-447a-9d3c-98f51f98b62b/.system_generated/logs/transcript.jsonl` | 184 | 0 | 11.7分 |
| 50 | `~/.gemini/antigravity/brain/a563ff49-939e-47dd-8c0c-b3b7f99c4e0d/.system_generated/logs/transcript.jsonl` | 162 | 0 | 9.9分 |
| 51 | `~/.gemini/antigravity/brain/ac33a9b3-765d-48a5-93f3-d2608ca418f9/.system_generated/logs/transcript.jsonl` | 48 | 0 | 2.5分 |
| 52 | `~/.gemini/antigravity/brain/831bc64e-9e35-42c7-9029-505aeb2341c1/.system_generated/logs/transcript.jsonl` | 285 | 0 | 93.7分 |
| 53 | `~/.gemini/antigravity/brain/ed207083-37a7-4a6d-a262-6f8160175686/.system_generated/logs/transcript.jsonl` | 186 | 0 | 37.0分 |
| 54 | `~/.gemini/antigravity/brain/7c6d4089-2660-49f7-b850-06ee11a0e854/.system_generated/logs/transcript.jsonl` | 407 | 0 | 498.4分 |
| 55 | `~/.gemini/antigravity/brain/e38b417c-f65a-4dc4-b811-b90fd15ad156/.system_generated/logs/transcript.jsonl` | 365 | 0 | 99.0分 |
| 56 | `~/.gemini/antigravity/brain/4aa75689-d16b-4fa9-bc99-2f4ea856de8f/.system_generated/logs/transcript.jsonl` | 366 | 0 | 291.5分 |
| 57 | `~/.gemini/antigravity/brain/027dbcb9-c502-48d3-9979-e04a5d0fefbb/.system_generated/logs/transcript.jsonl` | 426 | 0 | 116.1分 |
| 58 | `~/.gemini/antigravity/brain/94031c65-df97-4c82-8844-bede57216c19/.system_generated/logs/transcript.jsonl` | 650 | 0 | 95.9分 |
| 59 | `~/.gemini/antigravity/brain/450586ae-3270-4ca7-9c43-7e99685edcb1/.system_generated/logs/transcript.jsonl` | 144 | 0 | 39.2分 |
| 60 | `~/.gemini/antigravity/brain/c3058799-56ae-497b-b5d7-c4aee80002df/.system_generated/logs/transcript.jsonl` | 60 | 0 | 5.9分 |
| 61 | `~/.gemini/antigravity/brain/8995aa63-6003-42a2-96b4-ebe7dda37797/.system_generated/logs/transcript.jsonl` | 753 | 0 | 76.4分 |
| 62 | `~/.gemini/antigravity/brain/2f8d8eba-a08b-41df-a057-3b8a3e4805b4/.system_generated/logs/transcript.jsonl` | 716 | 0 | 129.8分 |
| 63 | `~/.gemini/antigravity/brain/22b1cef3-bea2-48fa-86df-6f320565cfda/.system_generated/logs/transcript.jsonl` | 162 | 0 | 18.6分 |
| 64 | `~/.gemini/antigravity/brain/0eb1b469-0331-47d2-b526-48e08ba7fa96/.system_generated/logs/transcript.jsonl` | 353 | 0 | 60.6分 |
| 65 | `~/.gemini/antigravity/brain/78a7748b-f575-4363-8cac-920f00878ea1/.system_generated/logs/transcript.jsonl` | 154 | 0 | 34.4分 |
| 66 | `~/.gemini/antigravity/brain/caeb5a36-82da-478e-ade7-2604ab5c74d9/.system_generated/logs/transcript.jsonl` | 216 | 0 | 17.0分 |
| 67 | `~/.gemini/antigravity/brain/90ba6a29-660a-4174-b729-019f8ed7d971/.system_generated/logs/transcript.jsonl` | 20 | 0 | 3.0分 |
| 68 | `~/.gemini/antigravity/brain/db025cb4-32bd-42a5-8b33-fc81ac3b7b37/.system_generated/logs/transcript.jsonl` | 22 | 0 | 1.3分 |
| 69 | `~/.gemini/antigravity/brain/20cab76f-fd22-4e70-8345-024fc6f26bc3/.system_generated/logs/transcript.jsonl` | 751 | 0 | 44.3分 |
