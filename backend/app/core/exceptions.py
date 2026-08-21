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
