# PAT-DOC-003: Mermaid ダイアグラムにおける特殊記号・括弧を含むラベルのクォート強制規約および静的監査

- **パターンID**: `PAT-DOC-003`
- **分類**: Tier 2 (全体共通知見 / 汎用パターン)
- **対象プロファイル**: 全プロファイル共通 (ALL)
- **初回検知プロジェクト**: `bicycle-log`（過去事象: `template` a86ba88）
- **作成日**: 2026-10-28

---

## 1. 発生コンテキストと前提条件
- 設計書（`docs/`）およびリポジトリ `README.md` 等の Markdown 内で Mermaid フローチャートやシーケンス図を使用する全プロジェクト。
- GitHub などの Web UI（Rich Display）上で Markdown をレンダリングする環境。

---

## 2. 事象と根本原因分析 (RCA)

### 事象
GitHub 上で Markdown 内の Mermaid ダイアグラムが描画されず、以下のようなパースエラーが発生する。
```text
Unable to render rich display
Parse error on line XX:
... -->|Nearby Search (Fallback)| Places
-----------------------------------^
Expecting 'SQE', 'DOUBLECIRCLEEND', 'PE', ... got 'PS'
```

### 根本原因
1. **Mermaid 構文と記号の競合**:
   - Mermaid の矢印ラベル（`-->|ラベル|`）やノード定義内に丸括弧 `()` や隅付き括弧 `【】`、コロン等の特殊文字をクォートなしで記述すると、パーサーがノードの形状定義記号（丸角、スタジアム型など）と誤認して構文エラーを引き起こす。
2. **知見の未昇格による再発**:
   - 過去に別プロジェクト（`template` a86ba88）で同種の問題を個別修正していたが、Central Knowledge Hub へ CLAIM 原票として昇格・ルール化されていなかったため、機械的ガードレール（`harness_guard.py`）が整備されず、別プロジェクトの `README.md` で再発に至った。

---

## 3. 抽象化された処方箋・推奨ルール (Distilled Prescription)

1. **Mermaid ラベルにおける特殊文字のダブルクォーテーション強制**:
   - Markdown 内で Mermaid ダイアグラムを記述する際、矢印ラベル（`-->|"..."|`）やノード名に特殊記号（丸括弧 `()`、角括弧 `[]`、波括弧 `{}`、隅付き括弧 `【】`、スラッシュ `/`、コロン `:` 等）を含める場合は、必ずラベル全体をダブルクォーテーション（`"`）で囲むこと。
   ```mermaid
   %% 正しい記法 (Good)
   FastAPI -->|"Nearby Search (Fallback)"| Places
   P2 -->|"【承認ゲート】要件承認"| P3

   %% 誤った記法 (Bad: GitHubでパースエラー)
   FastAPI -->|Nearby Search (Fallback)| Places
   P2 -->|【承認ゲート】要件承認| P3
   ```
2. **静的検証スクリプトによる Shift-Left 機械的遮断**:
   - `harness_guard.py` またはドキュメントレビュアーツールにおいて、Markdown ファイル内の Mermaid ブロック（` ```mermaid `）を抽出し、クォートされていない括弧付き矢印ラベル（正規表現: `-->\|[^\"\|]*[\(\)\[\]\{\}【】][^\"\|]*\|`）を検出してコミット前に機械遮断・警告する監査ガードを導入する。

---

## 4. 検証エビデンス
- `bicycle-log` の `README.md` において `FastAPI -->|"Nearby Search (Fallback)"| Places` に修正し、構文エラーを解消。
- `template` リポジトリの `a86ba88` コミットにおける是正実績との整合性を確認。
