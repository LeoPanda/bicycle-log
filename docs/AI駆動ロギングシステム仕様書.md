# **AI駆動開発向け自律ロギングシステム仕様書**

本ドキュメントは、「bicycle-log」におけるデバッグ効率化、およびAI開発エージェント（Antigravity 2.0）による自律的な不具合監視・デバッグループを極大化するためのロギングシステム仕様を定義する。

## **1\. システム概要と3つの開発要件の実現**

Twelve-Factor Appの原則（XI. Logs: ログをイベントストリームとして扱う）に準拠し、すべてのログをファイルではなく標準出力（sys.stdout / sys.stderr）に流し、実行環境（Docker / クラウド基盤）に回収を委ねる構成をとる。

### **要件の実現マッピング**

| 開発要件                       | 実現アプローチ              | 技術的な詳細・理由                                                                                                                                                                       |
| :----------------------------- | :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1\) 開発と本番でコード共通** | **標準出力の完全集約**      | アプリケーション内部は常に stdout へ出力。ローカル（Docker logs）も本番（Cloud Logging / GCP）も、基盤側がこれらを自動フックして回収するため、インフラ依存のコード分岐を完全に排除する。 |
| **2\) モードの容易な切り替え** | **環境変数 LOG_LEVEL 制御** | コンテナ起動時またはローカル実行時の .env にて設定された環境変数 LOG_LEVEL（DEBUG / INFO / WARNING / ERROR）をロギングモジュールのロード時にダイレクトに読み込み初期化する。             |
| **3\) ログアクセスの容易性**   | **コンソール集約 & 構造化** | ・ローカル：docker compose logs \-f およびエディタのログストリームによる確認。 ・本番：Cloud Logging (Logs Explorer) からの高度な一元クエリ検索。                                        |

---

## **2\. AIファースト・アーキテクチャ（自律デバッグのための拡張仕様）**

AI（Antigravity 2.0）が能動的にログから不具合を検出し、自律的に修復プロセスを走らせるための3つの「AIファースト」な設計を定義する。

### **2.1. 構造化JSONフォーマットの強制**

人間にとっての読みやすさよりも、「AIによるパース（解析）の確実性」を最優先し、ログ出力を1行完結のJSONオブジェクトに統一する。これにより、AIがログメッセージをパースする際のエラーをゼロにする。
また、タイムスタンプは日本標準時（JST, UTC+9）でフォーマットし、時系列の整合性を直感的に追えるようにする。

#### **JSON構造スキーマ**

```json
{
  "timestamp": "2026-08-02T19:00:00.123456+09:00",
  "level": "ERROR",
  "log_id": "b3d5b0a7-bc32-4752-9b2e-06788db12345",
  "module": "app.routers.items",
  "message": "データベース書き込み中に予期せぬ制約エラーが発生しました。",
  "exception_details": {
    "error_type": "IntegrityError",
    "traceback": "Traceback (most recent call last):\n  File \"app/routers/items.py\", line 45...\nsqlite3.IntegrityError: FOREIGN KEY constraint failed"
  },
  "context": {
    "item_id": 12,
    "category_id": 3,
    "code": "A-1"
  }
}
```

### **2.2. 例外ハンドラにおける「ログID（log_id）」のバインド**

システムエラー（HTTP 500等）発生時のコンテキスト情報の断絶（スタック）を防ぐため、エラー検出プロセスにおいて一意の log_id（UUIDv4）を発行する。

```
[フロントエンド (React)]                           [バックエンド (FastAPI)]
        |                                                 |
        | 1. リクエスト (API呼び出し)                      |
        |-----------------------------------------------> |
        |                                                 | [システムエラー発生]
        |                                                 | 2. UUIDから log_id 生成
        |                                                 | 3. log_id を付与したJSONを stdout に出力
        | 4. レスポンス返却 (log_id 包含)                  |
        |<------------------------------------------------|
        v                                                 v
 [エラーダイアログにID表示]                           [コンテナログに同一ID記録]
        |                                                 |
        +-----------------------+-------------------------+
                                |
                                v
              [AI開発エージェント (Antigravity 2.0)]
                  IDをキーにしてログを直接照会。
                  文脈汚染なくスタックトレースを即座に特定！
```

#### **APIエラーレスポンス構造（HTTP 500時）**

既存のフロントエンド・エラー表示ロジックとの互換性（`data.error?.message` などの読み込み）を維持するため、トップレベルおよび `error` オブジェクトの双方に `log_id` を配置する。

```json
{
  "detail": "Internal Server Error",
  "log_id": "b3d5b0a7-bc32-4752-9b2e-06788db12345",
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred on the server.",
    "log_id": "b3d5b0a7-bc32-4752-9b2e-06788db12345"
  }
}
```

### **2.3. AI専用 動的ログレベル変更API**

環境変数での切り替えにはコンテナの再起動が伴い、AIの自律デバッグの文脈（State）をリセットしてしまう。そのため、メモリ上で動的にログレベルをトグルできるAPIエンドポイントを設置する。

- **エンドポイント：** POST /api/internal/logger/level
- **認証・認可：** 環境変数 `INTERNAL_AI_TOKEN` に設定されたトークンをリクエストヘッダー `x-ai-token` に付与して認証。
- **リクエストボディ：**

  ```json
  {
    "level": "DEBUG"
  }
  ```

- **AIのデバッグ自律シナリオ：**
  1. 通常運用中の LOG_LEVEL は INFO に設定されている。
  2. AIがテストケースの実行中または実機動作中に特定のAPIでエラー（例：HTTP 500）を検知。
  3. AIは自律的に POST /api/internal/logger/level（レベル: DEBUG）をコール。
  4. メモリ上でバックエンド全体のロガーが DEBUG に書き換わる（再起動なし）。
  5. AIは再現リクエストを送信し、詳細なSQLクエリや処理実行ログを stdout から取得し不具合原因を特定。
  6. デバッグ完了後、AIは再度レベルを INFO に戻すAPIをコールする。

---

## **3\. 具体的なソースコード改訂仕様**

### **3.1. バックエンド（FastAPI）**

#### **① 開発環境および本番環境の環境変数設定 (.env)**

```env
# Dockerコンテナおよびローカル開発用 .env ファイル
LOG_LEVEL=DEBUG  # 開発時はDEBUG、本番環境はINFOにコントロール
INTERNAL_AI_TOKEN=ai_agent_secret_secure_token_2026
```

#### **② ロギング定義の実装 (backend/app/core/logger.py)**

```python
import os
import sys
import logging
import json
from datetime import datetime, timezone, timedelta

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        jst = timezone(timedelta(hours=9))
        log_data = {
            "timestamp": datetime.fromtimestamp(record.created, tz=jst).isoformat(),
            "level": record.levelname,
            "module": record.name,
            "message": record.getMessage(),
            "log_id": getattr(record, "log_id", None)
        }

        # Extract exception information
        if record.exc_info:
            log_data["exception_details"] = {
                "error_type": record.exc_info[0].__name__,
                "traceback": self.formatException(record.exc_info)
            }

        # Extract context data
        if hasattr(record, "context"):
            log_data["context"] = record.context

        return json.dumps(log_data, ensure_ascii=False)

def setup_logging():
    root_logger = logging.getLogger()

    # Clear existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    root_logger.addHandler(handler)

    # Directly extract from env to prevent circular dependency
    log_level_str = os.environ.get("LOG_LEVEL", "INFO").upper()
    numeric_level = getattr(logging, log_level_str, logging.INFO)

    root_logger.setLevel(numeric_level)
```

#### **③ 共通エラーハンドラでのバインド (backend/app/core/exceptions.py)**

```python
import uuid
import logging
from fastapi import Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger("app")

async def generic_exception_handler(request: Request, exc: Exception):
    # 1. 共通のログIDを生成
    log_id = str(uuid.uuid4())

    # 2. コンテキスト情報を保持してJSON形式でエラーログを出力
    extra_data = {
        "log_id": log_id,
        "context": {
            "url": str(request.url),
            "method": request.method,
            "client": request.client.host if request.client else "unknown"
        }
    }

    # 例外情報をログに渡して構造化出力 (stdout へ JSON 出力される)
    logger.error(
        f"予期せぬシステム不具合が発生しました: {str(exc)}",
        exc_info=exc,
        extra=extra_data
    )

    # 3. フロントエンドにログIDを返却
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal Server Error",
            "log_id": log_id,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred on the server.",
                "log_id": log_id
            }
        }
    )
```

#### **④ 動的変更エンドポイントの実装 (backend/app/routers/internal.py)**

ルーターの集約ルールに則り、`app/routers/` 以下に配置する。

```python
import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel

router = APIRouter(prefix="/api")

class LogLevelRequest(BaseModel):
    level: str  # DEBUG, INFO, WARNING, ERROR, CRITICAL

def verify_ai_token(x_ai_token: str = Header(None)):
    env_token = os.environ.get("INTERNAL_AI_TOKEN", "fallback_secure_token")
    if not x_ai_token or x_ai_token != env_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized AI Agent Access"
        )
    return True

@router.post("/internal/logger/level", dependencies=[Depends(verify_ai_token)])
def set_dynamic_log_level(payload: LogLevelRequest):
    target_level = payload.level.upper()
    numeric_level = getattr(logging, target_level, None)

    if numeric_level is None:
        raise HTTPException(status_code=400, detail=f"Invalid log level: {payload.level}")

    # オンメモリでルートロガーのレベルを動的に書き換え
    logging.getLogger().setLevel(numeric_level)

    # 設定が変更されたことを明示するためにINFOログを出力
    logging.getLogger("app.core.logger").info(
        f"ログレベルが動的に変更されました: {target_level}",
        extra={"log_id": "system-dynamic-level-change"}
    )

    return {"status": "success", "current_level": target_level}
```

---

## **4\. テストおよびインフラ稼働におけるガバナンス**

### **4.1. テスト（Pytest等）時のバッファ詰まり防止**

自律単体テスト等の実行時、膨大なログデータによってコンテナ内およびIDEのストリーミングバッファが肥大化し、コンテキスト詰まり（スタック）を起こすのを防止する。

- **ルール：** テスト用のコンフィグ、または pytest.ini において LOG_LEVEL を WARNING または CRITICAL に固定する。例外的に、特定のデバッグテストを行う場合のみ LOG_LEVEL=DEBUG をインジェクションする。

### **4.2. AIへのデバッグ指示プロトコル**

システムテスト中にバグを検出した際、AIエージェントに自律修正を依頼するためのプロンプト指示テンプレート。

```markdown
# 指示プロンプトテンプレート

[ERROR] テストケース test_logic_error で不具合が発生しました。  
フロントエンド受信ログID: "b3d5b0a7-bc32-4752-9b2e-06788db12345"

1. 上記のログID（log_id）をキーとして、コンテナ内の標準出力ログから、同一IDを持つ構造化JSONのエラー項目およびスタックトレースを検索・特定してください。
2. 内部API /api/internal/logger/level を使用して、必要に応じて DEBUG ログを取得して挙動を再現してください。
3. スタックトレースでエラーとなっているビジネスロジックを特定し、自律的にコードを修復した上で、単体テストを再実行してください。
```

---

## **5. 改定履歴**

| バージョン | 改定日 | 改訂依頼番号 | 改定内容 |
| :--- | :--- | :--- | :--- |
| 1.0.0 | 2026-08-20 | - | 初版作成：構造化JSONロギング、log_idバインド、動的ログレベル変更APIの仕様策定 |
| 1.2 | 2026-09-30 | 1.2.001 | ドキュメント相互整合性チェックに基づく改定履歴の追記・整備 |
