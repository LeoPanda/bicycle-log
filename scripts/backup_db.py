import os
import sqlite3
import sys
from datetime import datetime, timezone, timedelta

def backup_database():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    db_path = os.path.join(base_dir, "data", "app.db")
    backup_dir = os.path.join(base_dir, "backup")

    if not os.path.exists(db_path):
        print(f"Error: Source database file not found at {db_path}")
        sys.exit(1)

    os.makedirs(backup_dir, exist_ok=True)

    jst = timezone(timedelta(hours=9))
    timestamp = datetime.now(jst).strftime("%Y%m%d_%H%M%S")
    
    timestamped_backup_filename = f"app_backup_{timestamp}.db"
    timestamped_backup_path = os.path.join(backup_dir, timestamped_backup_filename)
    latest_backup_path = os.path.join(backup_dir, "app_backup.db")

    print(f"Starting database backup...")
    print(f"Source: {db_path}")
    print(f"Target: {timestamped_backup_path}")

    # sqlite3.connect と backup API を使ってオンライン整合性バックアップ
    try:
        src_conn = sqlite3.connect(db_path)
        dest_conn = sqlite3.connect(timestamped_backup_path)

        with dest_conn:
            src_conn.backup(dest_conn)

        dest_conn.close()
        src_conn.close()
        print(f"Successfully created timestamped backup: {timestamped_backup_path}")
    except Exception as e:
        print(f"Backup failed: {e}")
        sys.exit(1)

    # app_backup.db (最新バックアップ) も同期・複製
    try:
        latest_conn = sqlite3.connect(latest_backup_path)
        src_conn = sqlite3.connect(timestamped_backup_path)
        with latest_conn:
            src_conn.backup(latest_conn)
        latest_conn.close()
        src_conn.close()
        print(f"Successfully updated latest backup: {latest_backup_path}")
    except Exception as e:
        print(f"Failed to update latest backup file: {e}")

    # バックアップファイルの整合性チェック (PRAGMA integrity_check)
    try:
        check_conn = sqlite3.connect(timestamped_backup_path)
        cursor = check_conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        result = cursor.fetchone()
        check_conn.close()

        if result and result[0] == "ok":
            print(f"Integrity check passed: {result[0]}")
        else:
            print(f"Integrity check WARNING: {result}")
    except Exception as e:
        print(f"Integrity check failed with error: {e}")

    # ファイルサイズの確認
    size_mb = os.path.getsize(timestamped_backup_path) / (1024 * 1024)
    print(f"Backup file size: {size_mb:.2f} MB ({os.path.getsize(timestamped_backup_path)} bytes)")
    print("Database backup completed successfully!")

if __name__ == "__main__":
    backup_database()
