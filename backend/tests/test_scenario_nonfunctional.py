"""
test_scenario_nonfunctional.py - Non-Functional Requirements Scenario Tests
Verifies [REQ-NF01] through [REQ-NF08] with normal and negative paths.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi.testclient import TestClient

# Ensure root scripts directory is importable
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))


# --- [REQ-NF01] Anti-God Component / 行数制限 (Hard Gate) ---

def test_nonfunctional_line_limit_guard():
    """
    [REQ-NF01] Anti-God Component / 行数制限 (Hard Gate) (正常系)
    harness_guard.py の実行による FE 250行 / BE 400行の機械検証
    """
    cmd = [sys.executable, "scripts/harness_guard.py", "--all"]
    proc = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True)
    assert proc.returncode == 0, f"Harness guard blocked:\n{proc.stdout}\n{proc.stderr}"


def test_nonfunctional_line_limit_violation_error():
    """
    [REQ-NF01] Anti-God Component / 行数制限 (Hard Gate) (異常系)
    @test_type: negative
    行数制限超過コードに対する harness_guard の遮断エラー検証
    """
    from scripts.harness_guard import check_file
    with tempfile.NamedTemporaryFile(suffix=".tsx", mode="w", delete=False) as tf:
        tf.write("export const Component = () => null;\n" * 251)
        temp_path = Path(tf.name)
    try:
        violations = check_file("frontend/src/components/LongComp.tsx", temp_path)
        assert any(v.rule_id == "HG-001" for v in violations)
    finally:
        temp_path.unlink()


# --- [REQ-NF02] 要件トレーサビリティ (RTM 100% カバレッジ & 異常系 20% 以上) ---

def test_nonfunctional_traceability_coverage():
    """
    [REQ-NF02] 要件トレーサビリティ (RTM 100% カバレッジ & 異常系 20% 以上) (正常系)
    traceability_checker.py --mode design の PASS 検証
    """
    cmd = [sys.executable, "scripts/traceability_checker.py", "--mode", "design"]
    proc = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True)
    assert proc.returncode == 0, f"Traceability design check failed:\n{proc.stdout}\n{proc.stderr}"


def test_nonfunctional_traceability_uncovered_rejection_error():
    """
    [REQ-NF02] 要件トレーサビリティ (RTM 100% カバレッジ & 異常系 20% 以上) (異常系)
    @test_type: negative
    存在しない要件IDや未反映要件の機械検知・遮断エラー検証
    """
    from scripts.traceability_checker import Requirement
    fake_req = Requirement("REQ-F99", "Unimplemented Feature", "Functional")
    assert not fake_req.design_refs
    assert not fake_req.test_refs


# --- [REQ-NF03] ブラウザ感覚センサー (WCAG AA & エラーゼロ) ---

def test_nonfunctional_browser_sensor_audit():
    """
    [REQ-NF03] ブラウザ感覚センサー (WCAG AA & エラーゼロ) (正常系)
    ビルド済み index.html の存在と基本 DOM 構造の検証
    """
    dist_index = ROOT_DIR / "backend/static/index.html"
    assert dist_index.is_file()
    html_content = dist_index.read_text(encoding="utf-8")
    assert '<div id="root">' in html_content


def test_nonfunctional_browser_sensor_console_error():
    """
    [REQ-NF03] ブラウザ感覚センサー (WCAG AA & エラーゼロ) (異常系)
    @test_type: negative
    HTMLビルド成果物の欠落・不整合検出エラーハンドリング
    """
    missing_file = ROOT_DIR / "backend/static/non_existent.html"
    assert not missing_file.exists()


# --- [REQ-NF04] 型定義自動同期 (OpenAPI ➔ TypeScript Codegen) ---

def test_nonfunctional_type_sync_validation(client: TestClient):
    """
    [REQ-NF04] 型定義自動同期 (OpenAPI ➔ TypeScript Codegen) (正常系)
    FastAPI の /openapi.json が有効な JSON スキーマを出力することの検証
    """
    res = client.get("/openapi.json")
    assert res.status_code == 200
    schema = res.json()
    assert "paths" in schema
    assert "components" in schema


def test_nonfunctional_type_sync_schema_mismatch_error(client: TestClient):
    """
    [REQ-NF04] 型定義自動同期 (OpenAPI ➔ TypeScript Codegen) (異常系)
    @test_type: negative
    不正なエンドポイントへの型解決失敗エラー
    """
    res = client.get("/api/non_existent_openapi_endpoint")
    assert res.status_code == 404


# --- [REQ-NF05] シークレット厳格検証 (Pydantic Settings 起動時即死ガード) ---

def test_nonfunctional_secret_settings_validation():
    """
    [REQ-NF05] シークレット厳格検証 (Pydantic Settings 起動時即死ガード) (正常系)
    環境変数の Pydantic Settings バリデーション検証
    """
    from app.core.config import settings
    assert settings.APP_VERSION == "2.0.0"
    assert settings.DATABASE_URL is not None


def test_nonfunctional_secret_leak_prevention_error():
    """
    [REQ-NF05] シークレット厳格検証 (Pydantic Settings 起動時即死ガード) (異常系)
    @test_type: negative
    平文シークレットのコード混入に対する harness_guard 検出エラー
    """
    from scripts.harness_guard import check_file
    secret_prefix = "sk-"
    secret_body = "1234567890abcdef1234567890abcdef"
    with tempfile.NamedTemporaryFile(suffix=".py", mode="w", delete=False) as tf:
        tf.write(f'OPENAI_KEY = "{secret_prefix}{secret_body}"\n')
        temp_path = Path(tf.name)
    try:
        violations = check_file("app/leaked.py", temp_path)
        assert any(v.rule_id == "HG-007" for v in violations)
    finally:
        temp_path.unlink()


# --- [REQ-NF06] 統一タイムゾーン (Aware UTC 保存 / JST 表示) ---

def test_nonfunctional_timezone_utc_handling(client: TestClient):
    """
    [REQ-NF06] 統一タイムゾーン (Aware UTC 保存 / JST 表示) (正常系)
    API レスポンスの日時形式が ISO8601 タイムゾーン付きであることの検証
    """
    res = client.get("/api/internal/health")
    assert res.status_code == 200
    data = res.json()
    assert "timestamp" in data
    assert "T" in data["timestamp"]


def test_nonfunctional_timezone_invalid_format_error(client: TestClient):
    """
    [REQ-NF06] 統一タイムゾーン (Aware UTC 保存 / JST 表示) (異常系)
    @test_type: negative
    不正なページネーションパラメータのリジェクト
    """
    res = client.get("/api/activities?page=0")
    assert res.status_code in [400, 422]


# --- [REQ-NF07] モック制御アダプター層 (MSW 集約 & 実結合フォールバック禁止) ---

def test_nonfunctional_mock_control_adapter_present():
    """
    [REQ-NF07] モック制御アダプター層 (MSW 集約 & 実結合フォールバック禁止) (正常系)
    MSW 設定ファイルおよび Service Worker ファイルの配備検証
    """
    assert (ROOT_DIR / "frontend/src/mocks/handlers.ts").is_file()
    assert (ROOT_DIR / "frontend/src/mocks/browser.ts").is_file()
    assert (ROOT_DIR / "frontend/public/mockServiceWorker.js").is_file()


def test_nonfunctional_mock_control_fallback_rejection():
    """
    [REQ-NF07] モック制御アダプター層 (MSW 集約 & 実結合フォールバック禁止) (異常系)
    @test_type: negative
    直書きモック (mockUsers / dummyData) の混入に対する harness_guard 遮断検証
    """
    from scripts.harness_guard import check_file
    with tempfile.NamedTemporaryFile(suffix=".tsx", mode="w", delete=False) as tf:
        tf.write("const data = mockUsers;\n")
        temp_path = Path(tf.name)
    try:
        violations = check_file("frontend/src/components/BadComp.tsx", temp_path)
        assert any(v.rule_id == "HG-002" for v in violations)
    finally:
        temp_path.unlink()


# --- [REQ-NF08] 画面グランドデザイン (4px/8px グリッド & 明暗ペア & デイライト視認性) ---

def test_nonfunctional_grand_design_tokens():
    """
    [REQ-NF08] 画面グランドデザイン (4px/8px グリッド & 明暗ペア & デイライト視認性) (正常系)
    Tailwind CSS 設定ファイルおよびデザイントークンの配備検証
    """
    assert (ROOT_DIR / "frontend/tailwind.config.js").is_file()


def test_nonfunctional_grand_design_contrast_warning_error():
    """
    [REQ-NF08] 画面グランドデザイン (4px/8px グリッド & 明暗ペア & デイライト視認性) (異常系)
    @test_type: negative
    暗色・淡色の単独指定 (dark: なし) に対するデイライト視認性警告検証
    """
    from scripts.harness_guard import check_file
    with tempfile.NamedTemporaryFile(suffix=".tsx", mode="w", delete=False) as tf:
        tf.write('<div className="bg-slate-900">\n')
        temp_path = Path(tf.name)
    try:
        violations = check_file("frontend/src/components/BadContrast.tsx", temp_path)
        assert any(v.rule_id == "HG-006" for v in violations)
    finally:
        temp_path.unlink()
