# PAT-SYS-007: CIパイプライン・スケルトン・シナリオテスト間の整合性担保規約

- **パターンID**: `PAT-SYS-007`
- **分類**: Tier 2 (全体共通知見 / 汎用パターン)
- **対象プロファイル**: Profile A, Profile B, Profile D
- **初回検知プロジェクト**: `bicycle-log`
- **作成日**: 2026-10-28

---

## 1. 発生コンテキストと前提条件
- 新規開発または既存プロジェクト（ブラウンフィールド）の全面改訂において、`dev-phase1-setup` から展開された `.github/workflows/ci.yml` を用いて GitHub Actions CI を稼働させた時。
- バックエンドフレームワークとして FastAPI + SQLModel を採用している環境。

---

## 2. 事象と根本原因分析 (RCA)

### 事象 1: フロントエンド `npm ci` の即時失敗
- **原因**: プロジェクト既存の `.gitignore` で `*.json` が除外され、ホワイトリストに `package-lock.json` が含まれていなかったため、リポジトリにロックファイルが存在せず `npm ci` が `EUSAGE` で失敗した。

### 事象 2: バックエンド Ruff での大量エラー（500件以上）
- **原因 1**: ブラウンフィールド展開時、既存 `backend/` があったためスケルトンの `pyproject.toml` が配備されず、設定無しの Ruff が起動して不要な警告を全検知した。
- **原因 2**: スケルトン同梱の `pyproject.toml` においても `ignore = []` となっており、FastAPI の標準イディオムである `Depends(...)` が `B008` として必ずエラー検知される設計不整合が存在した。

### 事象 3: シナリオテストの実行ディレクトリ依存エラー
- **原因**: CI ワークフローは `working-directory: backend` で `pytest` を実行するのに対し、シナリオテストコードがプロジェクトルート相対パス（`Path("frontend/...")` や `scripts/harness_guard.py`）を暗黙の前提としており、ディレクトリ移動時にファイル未検出エラーとなった。

---

## 3. 抽象化された処方箋・推奨ルール (Distilled Prescription)

1. **FastAPI 適合型 Ruff 設定のスケルトン標準化**:
   - バックエンドの `pyproject.toml` には、FastAPI の `Depends` 構文誤認を防ぐ `B008`、sys.path 変更に伴う `E402`、および SQLModel の循環型参照（文字列引用 Forward Reference）を許容する `per-file-ignores` を標準装備する。
2. **`.gitignore` におけるロックファイル保護**:
   - `*.json` を除外対象とする場合は、必ず `!package-lock.json`（または `!**/package-lock.json`）を例外ホワイトリストへ明記し、CI の再現性（`npm ci`）を保証する。
3. **シナリオテストにおけるルート基準パス (`ROOT_DIR`) の強制**:
   - テストコード内で別ディレクトリ（`frontend/`, `scripts/`, `data/`）を参照する際は、カレントディレクトリに依存せず `ROOT_DIR = Path(__file__).resolve().parent.parent.parent` を基点とする絶対・解決パスを使用する。
4. **ブラウンフィールド改訂時の設定ファイル補完ガード**:
   - `dev-phase1-setup` において既存ディレクトリが存在する場合でも、`pyproject.toml`、`tsconfig.json` 等の静的解析設定が欠落している場合は自動配置・補完を行う。

---

## 4. 検証エビデンス
- `bicycle-log` にて `pyproject.toml` の配備、`.gitignore` 修正、`test_scenario_nonfunctional.py` の `ROOT_DIR` 基準化を実施。
- `ruff check .` (0 errors)、`mypy app` (0 issues)、`pytest` (39 passed)、`npm run build` (0 errors) の全パスを確認。
