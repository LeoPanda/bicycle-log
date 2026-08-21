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
                "error_type": record.exc_info[0].__name__ if record.exc_info[0] else "UnknownError",
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

    log_level_str = os.environ.get("LOG_LEVEL", "INFO").upper()
    numeric_level = getattr(logging, log_level_str, logging.INFO)

    root_logger.setLevel(numeric_level)
