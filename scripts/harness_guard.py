#!/usr/bin/env python3
"""
harness_guard.py - AI Harness Hard Gate Static Enforcement Engine (Profile E)
Enforces architectural invariants before commit and review phases.
"""
import argparse
import ast
import json
import os
import re
import subprocess
import sys
from pathlib import Path

# Limits & Thresholds
FE_LINE_LIMIT = 250
BE_LINE_LIMIT = 400
IGNORE_DIRS = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build", "coverage", ".agents"}

SECRET_PATTERNS = [
    (re.compile(r"AIza[0-9A-Za-z-_]{35}"), "Google API Key"),
    (re.compile(r"sk-[a-zA-Z0-9]{20,}"), "OpenAI API Key"),
    (re.compile(r"ghp_[0-9a-zA-Z]{36}"), "GitHub Personal Access Token"),
    (re.compile(r"\b(YOUR_API_KEY_HERE|CHANGE_ME)\b"), "Unreplaced Placeholder"),
]
RAW_DDL_PATTERN = re.compile(r"\b(CREATE|ALTER|DROP)\s+TABLE\b", re.IGNORECASE)
ABSOLUTE_PATH_PATTERN = re.compile(r"\[.*?\]\((file:///|/Users/|/home/|[A-Za-z]:\\).*?\)")
MOCK_CALL_PATTERN = re.compile(r"\b(mockUsers|dummyData|MOCK_[A-Z0-9_]+)\b")
SILENT_MOCK_FALLBACK = re.compile(r"catch\s*(\(.*?\))?\s*\{\s*return\s+.*?(mock|dummy)", re.IGNORECASE | re.DOTALL)
DAYLIGHT_DARK_CLASSES = re.compile(r"\b(?<!dark:)(text-(slate|zinc|gray|neutral)-(200|300)|bg-(slate|zinc|gray|neutral)-(900|950)|bg-blue-950)\b")

def get_git_staged_files() -> list[str]:
    try:
        out = subprocess.check_output(["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"], text=True)
        return [f.strip() for f in out.splitlines() if f.strip()]
    except Exception:
        return []

def collect_all_files(root: Path) -> list[str]:
    result = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in IGNORE_DIRS]
        for f in filenames:
            rel = os.path.relpath(os.path.join(dirpath, f), root)
            result.append(rel)
    return result

class Violation:
    def __init__(self, rule_id: str, severity: str, file_path: str, message: str, line_no: int = 0, hint: str = ""):
        self.rule_id = rule_id
        self.severity = severity  # "BLOCK" or "WARN"
        self.file_path = file_path
        self.message = message
        self.line_no = line_no
        self.hint = hint

    def to_dict(self):
        return {
            "rule_id": self.rule_id, "severity": self.severity,
            "file": self.file_path, "line": self.line_no,
            "message": self.message, "hint": self.hint
        }

def check_file(rel_path: str, full_path: Path) -> list[Violation]:
    violations = []
    norm = rel_path.replace("\\", "/")
    if norm == "scripts/harness_guard.py" or not full_path.is_file() or full_path.stat().st_size > 2 * 1024 * 1024:
        return violations

    try:
        content = full_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return violations
    lines = content.splitlines()
    line_count = len(lines)

    # HG-001: Line limit
    is_test = any(k in norm for k in ["/tests/", "/__tests__/", ".test.", ".spec."])
    is_gen = norm.endswith(".generated.ts") or "migrations/" in norm or "alembic/" in norm
    if not is_test and not is_gen:
        if (norm.startswith("frontend/src/") or norm.startswith("src/")) and norm.endswith((".tsx", ".ts", ".jsx", ".js")):
            if line_count > FE_LINE_LIMIT:
                violations.append(Violation("HG-001", "BLOCK", norm, f"フロントエンド行数超過 ({line_count}行 > {FE_LINE_LIMIT}行)",
                                            hint="Hooksやサブコンポーネントへ物理分割してください。"))
        elif (norm.startswith("backend/") and norm.endswith(".py")) or (norm.startswith("src-tauri/") and norm.endswith(".rs")):
            if line_count > BE_LINE_LIMIT:
                violations.append(Violation("HG-001", "BLOCK", norm, f"バックエンド行数超過 ({line_count}行 > {BE_LINE_LIMIT}行)",
                                            hint="DTOやサービス層へモジュールを物理分割してください。"))

    # HG-002: Direct mock in production code
    if any(norm.startswith(p) for p in ["src/components/", "src/pages/", "src/hooks/", "frontend/src/components/", "frontend/src/pages/"]) and "src/mocks/" not in norm and not is_test:
        if MOCK_CALL_PATTERN.search(content):
            violations.append(Violation("HG-002", "BLOCK", norm, "直書きモック識別子 (mockUsers/dummyData/MOCK_*) を検出",
                                        hint="MSW (src/mocks/) ハンドラーへ移行し、コンポーネントからは直接参照しないでください。"))
        if SILENT_MOCK_FALLBACK.search(content):
            violations.append(Violation("HG-002", "BLOCK", norm, "サイレントモックフォールバック (catch return mock) を検出",
                                        hint="Fail-Fast原則に従い、本番通信エラー時は例外を即スローしてください。"))

    # HG-003: Absolute paths in Markdown
    if norm.endswith(".md"):
        for idx, line in enumerate(lines, 1):
            if ABSOLUTE_PATH_PATTERN.search(line):
                violations.append(Violation("HG-003", "BLOCK", norm, "Markdown内絶対パスリンクを検出", line_no=idx,
                                            hint="ファイル間の相対パス (例: ../設計書.md) に書き換えてください。"))

    # HG-004: Raw SQL DDL in BE
    if norm.startswith("backend/app/") and norm.endswith(".py") and "alembic/" not in norm:
        for idx, line in enumerate(lines, 1):
            if RAW_DDL_PATTERN.search(line) and not line.strip().startswith("#"):
                violations.append(Violation("HG-004", "BLOCK", norm, "生SQL DDL (CREATE/ALTER/DROP TABLE) を検出", line_no=idx,
                                            hint="SQLAlchemyモデル定義およびAlembicマイグレーションを使用してください。"))

    # HG-005: AST fitness for BE
    if norm.startswith("backend/app/") and norm.endswith(".py"):
        violations.extend(check_ast_fitness(norm, content))

    # HG-006: Daylight theme contrast static warning
    if norm.endswith((".tsx", ".jsx")) and not is_test:
        for idx, line in enumerate(lines, 1):
            if "className=" in line and DAYLIGHT_DARK_CLASSES.search(line):
                violations.append(Violation("HG-006", "WARN", norm, "Tailwind デイライト視認性違反の疑い (dark: なしの淡色/暗色単独指定)", line_no=idx,
                                            hint="セマンティックデザイントークンまたは明暗ペア指定 (例: bg-blue-50 text-blue-800 dark:...) を使用してください。"))

    # HG-007: Plaintext secrets & placeholders
    if not norm.endswith((".example", ".sample", ".schema.json", ".template", ".env")) and norm != ".env" and not norm.startswith(("docs/", "wiki/", "metrics/", "skeletons/", "templates/")):
        for pattern, label in SECRET_PATTERNS:
            for idx, line in enumerate(lines, 1):
                if pattern.search(line) and not line.strip().startswith("#"):
                    violations.append(Violation("HG-007", "BLOCK", norm, f"平文シークレット/未置換プレースホルダー検出 ({label})", line_no=idx,
                                                hint="環境変数 (.env) または Pydantic Settings へ外出ししてください。"))

    return violations

def check_ast_fitness(norm: str, content: str) -> list[Violation]:
    violations = []
    try:
        tree = ast.parse(content, filename=norm)
    except SyntaxError:
        return violations

    is_router = "/routers/" in norm or norm.startswith("backend/app/routers")
    dto_count = 0

    for node in ast.walk(tree):
        # レイヤーバイパス: routers から models 直接参照
        if is_router:
            if isinstance(node, ast.ImportFrom):
                if node.module and ("models" in node.module.split(".") or node.module.endswith("models")):
                    violations.append(Violation("HG-005", "BLOCK", norm, "レイヤーバイパス: router から models への直接import",
                                                line_no=node.lineno, hint="services 層経由でアクセスしてください。"))
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    if "models" in alias.name.split("."):
                        violations.append(Violation("HG-005", "BLOCK", norm, "レイヤーバイパス: router から models への直接import",
                                                    line_no=node.lineno, hint="services 層経由でアクセスしてください。"))
            if isinstance(node, ast.ClassDef):
                for base in node.bases:
                    if (isinstance(base, ast.Name) and "BaseModel" in base.id) or \
                       (isinstance(base, ast.Attribute) and "BaseModel" in base.attr):
                        dto_count += 1
        # 例外握りつぶし: except Exception: pass または except: ...
        if isinstance(node, ast.ExceptHandler):
            is_pass = len(node.body) == 1 and (
                isinstance(node.body[0], ast.Pass) or
                (isinstance(node.body[0], ast.Expr) and isinstance(getattr(node.body[0], "value", None), ast.Constant) and node.body[0].value.value is Ellipsis)
            )
            if is_pass:
                violations.append(Violation("HG-005", "BLOCK", norm, "例外握りつぶし (except: pass / ...) を検出",
                                            line_no=node.lineno, hint="例外型を限定し、ログ記録または適切な例外再送出を行ってください。"))

    if is_router and dto_count > 2:
        violations.append(Violation("HG-005", "BLOCK", norm, f"DTO過多 ({dto_count}個): router内にBaseModelが直書き定義されています",
                                    hint="schemas/ などの独立モジュールへDTOを物理分離してください。"))
    return violations

def main():
    parser = argparse.ArgumentParser(description="AI Harness Hard Gate Static Enforcement Engine")
    parser.add_argument("--all", action="store_true", help="Scan entire workspace")
    parser.add_argument("--staged", action="store_true", help="Scan git staged files only")
    parser.add_argument("--json-out", type=str, help="Output report to JSON file")
    args = parser.parse_args()

    root = Path.cwd()
    if args.staged:
        files = get_git_staged_files()
    else:
        files = collect_all_files(root)

    all_violations: list[Violation] = []
    for rel in files:
        full = root / rel
        if full.is_file():
            all_violations.extend(check_file(rel, full))

    block_violations = [v for v in all_violations if v.severity == "BLOCK"]
    warn_violations = [v for v in all_violations if v.severity == "WARN"]

    if args.json_out:
        out_p = Path(args.json_out)
        out_p.parent.mkdir(parents=True, exist_ok=True)
        report = {
            "summary": {"total": len(all_violations), "block": len(block_violations), "warn": len(warn_violations)},
            "violations": [v.to_dict() for v in all_violations]
        }
        out_p.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    if not all_violations:
        print("✅ [HARNESS GUARD] 規約違反は検出されませんでした (All Invariants Passed).")
        sys.exit(0)

    if warn_violations and not block_violations:
        print(f"⚠️ [HARNESS GUARD WARN] {len(warn_violations)} 件の警告があります (Phase 5で実測検証):")
        for w in warn_violations[:5]:
            print(f"  [{w.rule_id}] {w.file_path}:{w.line_no} - {w.message}")
        sys.exit(0)

    print(f"\n🚨 [HARNESS GUARD BLOCKED] {len(block_violations)} 件のアーキテクチャ規約違反を検出しました:", file=sys.stderr)
    print("-" * 80, file=sys.stderr)
    for v in block_violations:
        loc = f"{v.file_path}:{v.line_no}" if v.line_no else v.file_path
        print(f"[{v.rule_id}] {v.message}", file=sys.stderr)
        print(f"  - ファイル: {loc}", file=sys.stderr)
        if v.hint:
            print(f"  - 対処指示: {v.hint}", file=sys.stderr)
        print("-" * 80, file=sys.stderr)

    sys.exit(1)

if __name__ == "__main__":
    main()
