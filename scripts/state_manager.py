#!/usr/bin/env python3
"""
state_manager.py - Deterministic State Ledger Manager (Profile E)
Manages project_state.json and renders PROJECT_STATE.md atomically.
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

STATE_JSON_PATH = Path("project_state.json")
STATE_MD_PATH = Path("PROJECT_STATE.md")
METRICS_JSON_PATH = Path("metrics/development-metrics-summary.json")

PHASE_ORDER = [
    "PHASE_1_SETUP", "PHASE_2_REQUIREMENTS", "PHASE_3_DESIGN",
    "PHASE_4_IMPLEMENTATION", "PHASE_5_WALKTHROUGH", "PHASE_5_5_CODE_REVIEW",
    "PHASE_6_TESTING", "PHASE_7_RELEASE", "PHASE_8_EVOLUTION", "PRODUCTION_ACTIVE"
]

def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).isoformat()

def compute_checksum(text: str) -> str:
    return f"sha256:{hashlib.sha256(text.encode('utf-8')).hexdigest()}"

def atomic_write(path: Path, content: str):
    tmp = path.with_name(f"{path.name}.tmp_{os.getpid()}")
    tmp.write_text(content, encoding="utf-8")
    os.replace(tmp, path)

def load_state() -> dict:
    if not STATE_JSON_PATH.exists():
        print(f"❌ {STATE_JSON_PATH} が存在しません。'init' または 'migrate' を実行してください。", file=sys.stderr)
        sys.exit(1)
    return json.loads(STATE_JSON_PATH.read_text(encoding="utf-8"))

def save_and_render(state: dict, author: str = "conductor"):
    state["project_metadata"]["updated_at"] = now_iso()
    state["project_metadata"]["updated_by"] = author
    rendered_md = render_markdown(state)
    state["project_metadata"]["md_checksum"] = compute_checksum(rendered_md)
    atomic_write(STATE_JSON_PATH, json.dumps(state, ensure_ascii=False, indent=2))
    atomic_write(STATE_MD_PATH, rendered_md)
    print(f"✅ 台帳を更新し {STATE_MD_PATH} を再生成しました (Checksum: {state['project_metadata']['md_checksum'][:16]}...)")

def render_markdown(s: dict) -> str:
    meta = s.get("project_metadata", {})
    rev = s.get("revisions", {})
    met = s.get("metrics_summary", {})
    scores = met.get("category_scores", {})
    lines = [
        "# プロジェクト進行状態管理票 (PROJECT_STATE)",
        "",
        f"- **プロジェクト名**: {meta.get('project_name', '')}",
        f"- **現在のステータス**: {s.get('current_status', 'PHASE_1_SETUP')}",
        "- **システム展開プロファイル**:",
        "  - 第1層 (定常コア): Universal Core Specifications (Anti-God Component 250行制限 / 型同期 / Pydantic Settings / Aware UTC / CI / 構造化ログ / モック制御 / グランドデザイン) 適用中",
        f"  - 第2層 (展開プロファイル): {meta.get('deployment_profile', 'Profile A')}",
        f"- **モック動作モード (MOCK_MODE)**: {meta.get('mock_mode', 'ENABLED')}",
        f"- **現行バージョン**: v{meta.get('app_version', '1.0.0')}",
        f"- **EXECUTION_MODE**: {meta.get('execution_mode', 'GLOBAL_PLUGIN')}",
        f"- **TEMPLATE_SOURCE**: {meta.get('template_source', '~/.gemini/config/plugins/system-dev-pipeline')}",
        f"- **Knowledge Hub 連携状態**: {meta.get('knowledge_hub_status', 'SYNCED')}",
        f"- **現在の作業ブランチ**: {meta.get('current_branch', 'main')}",
        f"- **最終更新日時**: {meta.get('updated_at', '')}",
        f"- **最終更新者**: 👑 プロジェクトコンダクター ({meta.get('updated_by', 'Single Writer')})",
        "",
        "---",
        "",
        "## 1. 開発フェーズ進捗一覧",
        ""
    ]
    for ph_key, ph_val in s.get("phases", {}).items():
        st = "x" if ph_val.get("status") == "COMPLETED" else " "
        appr = ph_val.get("approval_gate", {})
        appr_str = f" (承認日: {appr.get('approved_at', '')})" if appr.get("approved") else ""
        lines.append(f"- [{st}] **{ph_key}: {ph_val.get('title', ph_key)}**{appr_str}")
        for t in ph_val.get("tasks", []):
            mark = "x" if t.get("done") else " "
            lines.append(f"  - [{mark}] {t.get('title')}")

    lines.extend([
        "",
        "---",
        "",
        "## 2. プロジェクト定量メトリクスサマリ (最新集計)",
        f"- **総合健全性スコア**: {met.get('total_score', '未測定')} 点",
        f"- **総合品質グレード**: {met.get('grade', '-')}",
        "- **カテゴリ別スコア**:",
        f"  - リソース効率: {scores.get('resource', '-')} / 25.0 点",
        f"  - 品質・堅牢性: {scores.get('quality', '-')} / 35.0 点",
        f"  - ナレッジ進化: {scores.get('evolution', '-')} / 15.0 点",
        f"  - ガバナンス  : {scores.get('governance', '-')} / 25.0 点",
        f"- **通算トークン消費**: {met.get('total_tokens', '-')} tokens",
        f"- **通算ツール呼出数**: {met.get('total_tool_calls', '-')} 回",
        f"- **正味開発規模(LOC)**: {met.get('net_loc', '-')} 行",
        "- **成果物リンク**:",
        "  - [総合健全性診断レポート](./metrics/system_health_report.md)",
        "  - [開発フェーズ推移レポート](./metrics/development_phase_report.md)",
        "  - [定量メトリクス集計JSON](./metrics/development-metrics-summary.json)",
        "",
        "---",
        "",
        "## 3. システム改訂管理 (PHASE 8完了以降)",
        f"- **現在の改訂ステータス**: {rev.get('current_revision_status', 'IDLE')}",
        f"- **進行中の改訂依頼番号**: {rev.get('active_revision_id', 'なし')}",
        f"- **現行改訂ターン番号**: {rev.get('current_turn', '-')}",
        "",
        "### 改訂履歴テーブル",
        "| 改訂依頼番号 | 対象バージョン | ターン | ステータス | 主担当 | 概要 | 完了日 |",
        "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |"
    ])
    for h in rev.get("history", []):
        lines.append(f"| {h.get('id')} | {h.get('version', '-')} | {h.get('turn', '-')} | {h.get('status')} | {h.get('author', 'conductor')} | {h.get('title')} | {h.get('completed_at', '-')} |")

    lines.extend(["", "---", "", "## 4. 未決事項 (Open Questions) & 決定事項 (Decisions)"])
    for q in s.get("open_questions", []):
        lines.append(f"- ❓ {q}")
    for d in s.get("decisions", []):
        lines.append(f"- 💡 [{d.get('date', '')}] {d.get('summary', '')}")
    lines.append("")
    return "\n".join(lines)

def cmd_init(args):
    schema_path = Path(__file__).resolve().parent.parent / "templates" / "project_state.schema.json"
    state = {
        "schema_version": "2.6.0",
        "project_metadata": {
            "project_name": args.name or Path.cwd().name,
            "app_version": args.version or "1.0.0",
            "deployment_profile": args.profile or "Profile A",
            "mock_mode": "ENABLED",
            "execution_mode": "GLOBAL_PLUGIN",
            "template_source": "~/.gemini/config/plugins/system-dev-pipeline",
            "knowledge_hub_status": "SYNCED (Immutable Core v2.6.0 + Local Overlay)",
            "current_branch": "main",
            "updated_at": now_iso(),
            "updated_by": "conductor",
            "md_checksum": ""
        },
        "current_status": "PHASE_1_SETUP",
        "phases": {
            "PHASE_1": {"status": "IN_PROGRESS", "title": "プロジェクトの準備", "tasks": [
                {"id": "P1-T01", "title": "ディレクトリ・環境設定展開 (dev-phase1-setup)", "done": True},
                {"id": "P1-T02", "title": "Central Knowledge Hub 初期化 & 未処理原票確認", "done": True},
                {"id": "P1-T03", "title": "静的スケルトン基盤展開", "done": True},
                {"id": "P1-T04", "title": "環境変数初期化 (.env)", "done": True}
            ]},
            "PHASE_2": {"status": "PENDING", "title": "要件定義", "approval_gate": {"required": True, "approved": False}, "tasks": [
                {"id": "P2-T01", "title": "要件定義書作成・精査 (REQ-ID付与)", "done": False}
            ]},
            "PHASE_3": {"status": "PENDING", "title": "基本設計書の作成と整合性チェック", "approval_gate": {"required": True, "approved": False}, "tasks": [
                {"id": "P3-T01", "title": "4大基本設計書作成", "done": False},
                {"id": "P3-T02", "title": "基本設計レビュー (dev-review-arch) PASS", "done": False}
            ]},
            "PHASE_4": {"status": "PENDING", "title": "開発環境とシステム構築", "tasks": [
                {"id": "P4-T01", "title": "Docker/環境構築 & BE/FE実装", "done": False},
                {"id": "P4-T02", "title": "Git初期化 (dev-git-init)", "done": False},
                {"id": "P4-T03", "title": "Hard Gate (harness_guard.py) & CI検証 PASS", "done": False}
            ]},
            "PHASE_5": {"status": "PENDING", "title": "ウォークスルー動作確認とデバッグ", "approval_gate": {"required": True, "approved": False}, "tasks": [
                {"id": "P5-T01", "title": "ブラウザ感覚センサー検証 (Chrome DevTools MCP)", "done": False},
                {"id": "P5-T02", "title": "モック切替検証 & API仕様書同期", "done": False}
            ]},
            "PHASE_5_5": {"status": "PENDING", "title": "コード品質・整合性レビュー", "tasks": [
                {"id": "P55-T01", "title": "dev-review-code (CLEAN判定)", "done": False}
            ]},
            "PHASE_6": {"status": "PENDING", "title": "スルーテスト環境の構築と実施", "approval_gate": {"required": True, "approved": False}, "tasks": [
                {"id": "P6-T01", "title": "シナリオテスト & RTM検証 (traceability_checker.py)", "done": False}
            ]},
            "PHASE_7": {"status": "PENDING", "title": "本番リリース", "approval_gate": {"required": True, "approved": False}, "tasks": [
                {"id": "P7-T01", "title": "dev-review-system (RELEASE APPROVED)", "done": False},
                {"id": "P7-T02", "title": "本番デプロイ & セキュリティ検証", "done": False}
            ]},
            "PHASE_8": {"status": "PENDING", "title": "知見自己進化・メトリクス集計", "approval_gate": {"required": True, "approved": False}, "tasks": [
                {"id": "P8-T01", "title": "メトリクス集計 & 知見原票投函 (CLAIM-*)", "done": False},
                {"id": "P8-T02", "title": "本番リリース (dev-git-release)", "done": False}
            ]}
        },
        "review_gates": {
            "arch_review": {"verdict": "PENDING", "critical": 0, "high": 0, "medium": 0, "low": 0},
            "code_review": {"verdict": "PENDING", "critical": 0, "high": 0, "medium": 0, "low": 0},
            "system_review": {"verdict": "PENDING", "critical": 0, "high": 0, "medium": 0, "low": 0}
        },
        "metrics_summary": {"total_score": None, "grade": "-"},
        "revisions": {"current_revision_status": "IDLE", "active_revision_id": None, "current_turn": None, "history": []},
        "open_questions": [],
        "decisions": [],
        "infrastructure": {"git_commit": "-", "remote_url": "-", "container_status": "STOPPED", "production_url": "-"}
    }
    save_and_render(state)

def normalize_phase_key(phase: str) -> str:
    p = phase.upper()
    if "5_5" in p or "55" in p:
        return "PHASE_5_5"
    for i in (1, 2, 3, 4, 5, 6, 7, 8):
        if p == f"PHASE_{i}" or p.startswith(f"PHASE_{i}_"):
            return f"PHASE_{i}"
    return phase

def cmd_set_phase(args):
    state = load_state()
    target = args.phase
    norm_target = normalize_phase_key(target)

    # Gate Interlock
    if norm_target == "PHASE_4":
        arch_v = state.get("review_gates", {}).get("arch_review", {}).get("verdict")
        if arch_v not in ("PASS", "CONDITIONAL PASS"):
            print(f"🚨 [GATE BLOCKED] 基本設計レビュー未合格 (現状: {arch_v}) のため PHASE 4 へ遷移できません。", file=sys.stderr)
            sys.exit(1)
    elif norm_target == "PHASE_6":
        code_v = state.get("review_gates", {}).get("code_review", {}).get("verdict")
        if code_v != "CLEAN":
            print(f"🚨 [GATE BLOCKED] コード品質レビュー未合格 (現状: {code_v}) のため PHASE 6 へ遷移できません。", file=sys.stderr)
            sys.exit(1)
    elif norm_target == "PHASE_7":
        sys_v = state.get("review_gates", {}).get("system_review", {}).get("verdict")
        if sys_v != "RELEASE APPROVED":
            print(f"🚨 [GATE BLOCKED] システム総合レビュー未合格 (現状: {sys_v}) のため PHASE 7 へ遷移できません。", file=sys.stderr)
            sys.exit(1)

    state["current_status"] = target
    for k, v in state.get("phases", {}).items():
        if k == norm_target:
            v["status"] = "IN_PROGRESS"
    save_and_render(state)

def cmd_complete_task(args):
    state = load_state()
    tid = args.id
    found = False
    for ph_key, ph in state.get("phases", {}).items():
        for t in ph.get("tasks", []):
            if t.get("id") == tid or (args.keyword and args.keyword.lower() in t.get("title", "").lower()):
                t["done"] = True
                found = True
                print(f"✅ タスク完了マーク: [{t.get('id')}] {t.get('title')}")
    if not found:
        print(f"⚠️ タスク ID '{tid}' が見つかりませんでした。", file=sys.stderr)
    save_and_render(state)

def cmd_record_review(args):
    state = load_state()
    rg = state.setdefault("review_gates", {})
    r_key = f"{args.type}_review"
    rg[r_key] = {
        "verdict": args.verdict,
        "critical": args.critical or 0,
        "high": args.high or 0,
        "medium": args.medium or 0,
        "low": args.low or 0,
        "report_path": args.report or "",
        "updated_at": now_iso()
    }
    save_and_render(state)

def cmd_record_approval(args):
    state = load_state()
    ph = state.get("phases", {}).get(args.phase, {})
    gate = ph.setdefault("approval_gate", {})
    gate["approved"] = True
    gate["approved_at"] = now_iso()
    gate["approver"] = args.approver or "user"
    ph["status"] = "COMPLETED"
    save_and_render(state)

def cmd_sync_metrics(args):
    state = load_state()
    m_path = Path(args.path) if args.path else METRICS_JSON_PATH
    if not m_path.exists():
        print(f"⚠️ メトリクス集計ファイル {m_path} が存在しません。", file=sys.stderr)
        return
    m_data = json.loads(m_path.read_text(encoding="utf-8"))
    summary = m_data.get("summary", m_data)
    state["metrics_summary"] = {
        "total_score": summary.get("total_health_score", summary.get("total_score")),
        "grade": summary.get("overall_grade", summary.get("grade")),
        "category_scores": summary.get("category_scores", {}),
        "total_tokens": summary.get("total_tokens"),
        "total_tool_calls": summary.get("total_tool_calls"),
        "net_loc": summary.get("net_loc"),
        "last_collected_at": now_iso()
    }
    save_and_render(state)

def cmd_verify_integrity(args):
    state = load_state()
    if not STATE_MD_PATH.exists():
        print(f"❌ {STATE_MD_PATH} が存在しません。", file=sys.stderr)
        sys.exit(1)
    cur_text = STATE_MD_PATH.read_text(encoding="utf-8")
    actual_hash = compute_checksum(cur_text)
    expected_hash = state.get("project_metadata", {}).get("md_checksum", "")
    if actual_hash == expected_hash:
        print(f"✅ [INTEGRITY OK] {STATE_MD_PATH} と {STATE_JSON_PATH} の整合性は完全です ({actual_hash[:16]}...)")
        sys.exit(0)

    print(f"⚠️ [INTEGRITY MISMATCH] 手動直接編集を検知しました (Expected: {expected_hash[:12]}, Actual: {actual_hash[:12]})")
    if args.reconcile:
        # Reconcile open questions & decisions from text
        qs = re.findall(r"- ❓ (.*?)$", cur_text, re.MULTILINE)
        if qs:
            state["open_questions"] = list(dict.fromkeys(state.get("open_questions", []) + qs))
        save_and_render(state)
        print(f"🔄 手動追記分を {STATE_JSON_PATH} へマージ逆同期しました。")
        sys.exit(0)
    sys.exit(1)

def cmd_start_revision(args):
    state = load_state()
    rev = state.setdefault("revisions", {})
    rev["current_revision_status"] = "ACTIVE"
    rev["active_revision_id"] = args.id
    branch_name = f"revision/{args.id}"
    try:
        subprocess.run(["git", "checkout", "-b", branch_name], check=False)
        state["project_metadata"]["current_branch"] = branch_name
    except Exception:
        pass
    print(f"🚀 改訂起票: [{args.id}] {args.title} (Branch: {branch_name})")
    save_and_render(state)

def cmd_complete_revision(args):
    state = load_state()
    rev = state.setdefault("revisions", {})
    rid = args.id or rev.get("active_revision_id")
    history = rev.setdefault("history", [])
    history.append({
        "id": rid, "title": args.title or "機能改訂", "status": "COMPLETED",
        "started_at": state.get("project_metadata", {}).get("updated_at", ""),
        "completed_at": now_iso(), "branch": state.get("project_metadata", {}).get("current_branch", "main")
    })
    rev["current_revision_status"] = "IDLE"
    rev["active_revision_id"] = None
    save_and_render(state)

def main():
    p = argparse.ArgumentParser(description="AI Harness Deterministic State Ledger Manager")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_init = sub.add_parser("init")
    p_init.add_argument("--name", type=str)
    p_init.add_argument("--profile", type=str)
    p_init.add_argument("--version", type=str)

    p_phase = sub.add_parser("set-phase")
    p_phase.add_argument("phase", type=str)

    p_task = sub.add_parser("complete-task")
    p_task.add_argument("--id", type=str, required=True)
    p_task.add_argument("--keyword", type=str)

    p_rev = sub.add_parser("record-review")
    p_rev.add_argument("--type", choices=["arch", "code", "system"], required=True)
    p_rev.add_argument("--verdict", type=str, required=True)
    p_rev.add_argument("--critical", type=int)
    p_rev.add_argument("--high", type=int)
    p_rev.add_argument("--medium", type=int)
    p_rev.add_argument("--low", type=int)
    p_rev.add_argument("--report", type=str)

    p_app = sub.add_parser("record-approval")
    p_app.add_argument("--phase", type=str, required=True)
    p_app.add_argument("--approver", type=str)

    p_sync = sub.add_parser("sync-metrics")
    p_sync.add_argument("--path", type=str)

    p_int = sub.add_parser("verify-integrity")
    p_int.add_argument("--reconcile", action="store_true")

    p_srev = sub.add_parser("start-revision")
    p_srev.add_argument("--id", type=str, required=True)
    p_srev.add_argument("--title", type=str, default="機能改訂")

    p_crev = sub.add_parser("complete-revision")
    p_crev.add_argument("--id", type=str)
    p_crev.add_argument("--title", type=str)

    args = p.parse_args()
    cmds = {
        "init": cmd_init, "set-phase": cmd_set_phase, "complete-task": cmd_complete_task,
        "record-review": cmd_record_review, "record-approval": cmd_record_approval,
        "sync-metrics": cmd_sync_metrics, "verify-integrity": cmd_verify_integrity,
        "start-revision": cmd_start_revision, "complete-revision": cmd_complete_revision
    }
    cmds[args.cmd](args)

if __name__ == "__main__":
    main()
