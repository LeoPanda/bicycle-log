#!/usr/bin/env python3
"""
SQLite Debug & Inspection Script for bicycle-log
Usage:
    python scripts/debug_sqlite.py [--db PATH] [--query "SELECT ..."]
"""

import sys
import os
import sqlite3
import argparse

def inspect_db(db_path: str, custom_query: str = None):
    if not os.path.exists(db_path):
        print(f"❌ DB file not found: {db_path}")
        return

    print(f"==================================================")
    print(f"📊 SQLite Database Inspection: {db_path}")
    print(f"==================================================")
    size_mb = os.path.getsize(db_path) / (1024 * 1024)
    print(f"File Size: {size_mb:.3f} MB")

    wal_path = f"{db_path}-wal"
    if os.path.exists(wal_path):
        wal_size_mb = os.path.getsize(wal_path) / (1024 * 1024)
        print(f"WAL File Size: {wal_size_mb:.3f} MB")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # PRAGMAs
    print("\n--- PRAGMA Settings ---")
    pragmas = ["foreign_keys", "journal_mode", "synchronous", "user_version", "page_size"]
    for p in pragmas:
        cursor.execute(f"PRAGMA {p};")
        val = cursor.fetchone()
        print(f"  PRAGMA {p:15s}: {val[0] if val else 'N/A'}")

    # Tables & Record counts
    print("\n--- Tables & Views ---")
    cursor.execute("SELECT type, name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name;")
    items = cursor.fetchall()
    
    for item_type, name in items:
        if item_type == 'table':
            cursor.execute(f"SELECT COUNT(*) FROM \"{name}\";")
            count = cursor.fetchone()[0]
            print(f"  [Table] {name:30s} Count: {count}")
        else:
            print(f"  [View]  {name:30s}")

    # Indexes
    print("\n--- Custom Indexes ---")
    cursor.execute("SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name;")
    indexes = cursor.fetchall()
    for idx_name, tbl_name in indexes:
        print(f"  Index: {idx_name:35s} (Table: {tbl_name})")

    # Custom Query or Explain
    if custom_query:
        print(f"\n--- EXPLAIN QUERY PLAN ---")
        print(f"Query: {custom_query}")
        try:
            cursor.execute(f"EXPLAIN QUERY PLAN {custom_query}")
            plan = cursor.fetchall()
            for row in plan:
                print(f"  {row}")
        except Exception as e:
            print(f"  ❌ Query Explain Error: {e}")

    conn.close()
    print("==================================================\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspect SQLite DB for bicycle-log")
    parser.add_argument("--db", default="./data/app.db", help="Path to SQLite database file")
    parser.add_argument("--query", default=None, help="SQL query to test with EXPLAIN QUERY PLAN")
    args = parser.parse_args()

    inspect_db(args.db, args.query)
