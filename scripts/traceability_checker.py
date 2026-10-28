#!/usr/bin/env python3
"""
traceability_checker.py - Requirements Traceability Matrix (RTM) Verifier (Profile E)
Enforces 100% requirements coverage from docs to design and tests, and checks negative test ratio.
"""
import argparse
import os
import re
import sys
from pathlib import Path

REQ_PATTERN = re.compile(r"\[(REQ-(?:F|NF)\d+)\]")
NEGATIVE_TEST_PATTERN = re.compile(r"(@test_type:\s*negative|abnormal|error|invalid|exception|fail|reject|boundary)", re.IGNORECASE)
IGNORE_TEST_DIRS = {".git", "node_modules", "venv", ".venv", "__pycache__", "dist", "build", "coverage", ".agents"}

def is_test_file(path: Path) -> bool:
    parts = set(path.parts)
    if parts & IGNORE_TEST_DIRS:
        return False
    norm = str(path).replace("\\", "/").lower()
    return any(k in norm for k in ["/tests/", "/__tests__/", "/e2e/", ".test.", ".spec."]) or \
           path.name.startswith("test_") or path.name.endswith(("_test.py", "_test.rs"))

class Requirement:
    def __init__(self, req_id: str, title: str, category: str):
        self.req_id = req_id
        self.title = title
        self.category = category  # Functional or Non-Functional
        self.design_refs: list[str] = []
        self.test_refs: list[str] = []

def find_requirements_file(root: Path) -> Path | None:
    candidates = [
        root / "docs" / "設計書" / "Current" / "要件定義書.md",
        root / "docs" / "要件定義書.md",
        root / "docs" / "要件定義書_ProfileA.md",
    ]
    for c in candidates:
        if c.is_file():
            return c
    return None

def extract_requirements(req_file: Path) -> dict[str, Requirement]:
    reqs: dict[str, Requirement] = {}
    content = req_file.read_text(encoding="utf-8")
    for line in content.splitlines():
        match = REQ_PATTERN.search(line)
        if match:
            req_id = match.group(1)
            # 抽出タイトル
            title = line.replace(f"[{req_id}]", "").strip(" -*#:")
            category = "Non-Functional" if "NF" in req_id else "Functional"
            if req_id not in reqs:
                reqs[req_id] = Requirement(req_id, title, category)
    return reqs

def scan_design_docs(root: Path, reqs: dict[str, Requirement], req_file: Path | None = None):
    search_dirs = [root / "docs" / "設計書" / "Current", root / "docs"]
    doc_files = []
    req_path_resolved = req_file.resolve() if req_file and req_file.exists() else None
    for d in search_dirs:
        if d.is_dir():
            for p in d.glob("*.md"):
                if req_path_resolved and p.resolve() == req_path_resolved:
                    continue
                if p.name == "要件定義書.md":
                    continue
                doc_files.append(p)

    for doc in doc_files:
        try:
            text = doc.read_text(encoding="utf-8")
            for req_id, obj in reqs.items():
                if req_id in text:
                    obj.design_refs.append(doc.name)
        except Exception:
            pass

def scan_test_artifacts(root: Path, reqs: dict[str, Requirement]) -> tuple[int, int]:
    test_files = []
    for ext in ["*.py", "*.ts", "*.tsx", "*.js", "*.rs"]:
        for p in root.rglob(ext):
            if is_test_file(p):
                test_files.append(p)
    plan_file = root / "docs" / "plans" / "シナリオテスト計画書.md"
    if plan_file.is_file():
        test_files.append(plan_file)

    total_tests = 0
    negative_tests = 0

    for tf in test_files:
        try:
            content = tf.read_text(encoding="utf-8")
            for req_id, obj in reqs.items():
                if req_id in content:
                    obj.test_refs.append(tf.name)

            # Count test cases & negative tests in test code
            if tf != plan_file:
                for line in content.splitlines():
                    if re.search(r"^\s*(def test_|it\(|test\()", line):
                        total_tests += 1
                        if NEGATIVE_TEST_PATTERN.search(line):
                            negative_tests += 1
                    elif "@test_type: negative" in line:
                        negative_tests += 1
        except Exception:
            pass

    return total_tests, negative_tests

def generate_rtm_markdown(reqs: dict[str, Requirement], total_tests: int, neg_tests: int, neg_ratio: float) -> str:
    lines = [
        "# 要件トレーサビリティマトリクス (RTM: Requirements Traceability Matrix)",
        "",
        "- **生成ツール**: `scripts/traceability_checker.py` (Profile E)",
        f"- **要件総数**: {len(reqs)} 件",
        f"- **総テストケース数**: {total_tests} 件 (うち異常系・境界値: {neg_tests} 件, 異常系比率: {neg_ratio:.1f}%)",
        "",
        "| 要件ID | 分類 | 要件概要 | 基本設計反映 | テスト反映 | 充足ステータス |",
        "| :--- | :---: | :--- | :--- | :--- | :---: |"
    ]
    for r in sorted(reqs.values(), key=lambda x: x.req_id):
        d_str = ", ".join(set(r.design_refs)) if r.design_refs else "❌ 未反映"
        t_str = ", ".join(set(r.test_refs)) if r.test_refs else "❌ 未検証"
        status = "✅ PASS" if (r.design_refs and r.test_refs) else "🚨 BLOCKED"
        lines.append(f"| {r.req_id} | {r.category} | {r.title} | {d_str} | {t_str} | {status} |")
    lines.append("")
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description="Requirements Traceability Matrix Verifier")
    parser.add_argument("--mode", choices=["design", "full"], default="full",
                        help="Verification mode: 'design' for Phase 3, 'full' for Phase 6/7")
    parser.add_argument("--min-negative-ratio", type=float, default=20.0,
                        help="Minimum negative test ratio percentage (default: 20.0%%)")
    args = parser.parse_args()

    root = Path.cwd()
    req_file = find_requirements_file(root)
    if not req_file:
        print("⚠️ 要件定義書が見つかりません。docs/設計書/Current/要件定義書.md を確認してください。", file=sys.stderr)
        sys.exit(0)

    reqs = extract_requirements(req_file)
    if not reqs:
        print("⚠️ 要件定義書から [REQ-*] ID が抽出されませんでした。", file=sys.stderr)
        sys.exit(0)

    scan_design_docs(root, reqs, req_file)
    design_uncovered = [r for r in reqs.values() if not r.design_refs]

    if args.mode == "design":
        print(f"🔍 [RTM DESIGN CHECK] 要件数: {len(reqs)} 件, 設計未反映: {len(design_uncovered)} 件")
        if design_uncovered:
            print("🚨 [BLOCKED] 基本設計書に反映されていない要件が存在します:", file=sys.stderr)
            for u in design_uncovered:
                print(f"  - [{u.req_id}] {u.title}", file=sys.stderr)
            sys.exit(1)
        print("✅ [PASS] 全要件が基本設計書群に 100% 反映されています。")
        sys.exit(0)

    # mode == full
    total_tests, neg_tests = scan_test_artifacts(root, reqs)
    neg_ratio = (neg_tests / total_tests * 100) if total_tests > 0 else 0.0
    test_uncovered = [r for r in reqs.values() if not r.test_refs]

    rtm_md = generate_rtm_markdown(reqs, total_tests, neg_tests, neg_ratio)
    rtm_path = root / "docs" / "plans" / "要件トレーサビリティマトリクス(RTM).md"
    rtm_path.parent.mkdir(parents=True, exist_ok=True)
    rtm_path.write_text(rtm_md, encoding="utf-8")
    print(f"📋 RTMマトリクスを出力しました: {rtm_path}")

    has_error = False
    if design_uncovered or test_uncovered:
        has_error = True
        print(f"🚨 [RTM BLOCKED] 設計未反映: {len(design_uncovered)} 件, テスト未検証: {len(test_uncovered)} 件", file=sys.stderr)
        for u in test_uncovered:
            print(f"  - 未検証要件: [{u.req_id}] {u.title}", file=sys.stderr)

    if total_tests > 0 and neg_ratio < args.min_negative_ratio:
        has_error = True
        print(f"🚨 [RTM BLOCKED] 異常系テスト比率が基準未満です ({neg_ratio:.1f}% < 基準 {args.min_negative_ratio:.1f}%)", file=sys.stderr)

    if has_error:
        sys.exit(1)

    print("✅ [RTM FULL PASS] 全要件の設計・テスト 100% カバレッジおよび異常系比率基準を達成しました。")
    sys.exit(0)

if __name__ == "__main__":
    main()
