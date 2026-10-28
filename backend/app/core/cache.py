import time
import json
import logging
from typing import Any, Callable, Optional, Dict, Tuple
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field, Session, select

logger = logging.getLogger("app.core.cache")

class ApiCache(SQLModel, table=True):
    __tablename__ = "api_cache"

    cache_key: str = Field(primary_key=True, index=True)
    response_data: str = Field(nullable=False)
    expires_at: datetime = Field(nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), nullable=False)

# L1: In-memory TTL cache (key -> (expire_timestamp, data))
_memory_cache: Dict[str, Tuple[float, Any]] = {}

def get_cached_response(
    cache_key: str,
    session: Session,
    fetch_func: Callable[[], Any],
    memory_ttl_seconds: int = 60,
    db_ttl_seconds: int = 300,
) -> Any:
    """
    Two-layer caching mechanism:
    L1: In-memory TTL cache (fastest)
    L2: SQLite DB cache table (persistent across worker restarts)
    Fallback: Graceful degradation returning stale DB cache on external failure.
    """
    now = time.time()
    now_utc = datetime.now(timezone.utc)

    # 1. L1 Memory Cache Check
    if cache_key in _memory_cache:
        expire_time, data = _memory_cache[cache_key]
        if now < expire_time:
            return data

    # 2. L2 DB Cache Check
    cached_record = None
    try:
        cached_record = session.get(ApiCache, cache_key)
        if cached_record:
            exp_at = cached_record.expires_at
            if exp_at.tzinfo is None:
                exp_at = exp_at.replace(tzinfo=timezone.utc)
            if exp_at > now_utc:
                data = json.loads(cached_record.response_data)
                _memory_cache[cache_key] = (now + memory_ttl_seconds, data)
                return data
    except Exception as e:
        logger.warning(f"Error querying ApiCache from DB: {e}")

    # 3. Call External API
    try:
        fresh_data = fetch_func()
        _memory_cache[cache_key] = (now + memory_ttl_seconds, fresh_data)

        try:
            serialized = json.dumps(fresh_data)
            expires_at = datetime.fromtimestamp(now + db_ttl_seconds, tz=timezone.utc)
            if cached_record:
                cached_record.response_data = serialized
                cached_record.expires_at = expires_at
                session.add(cached_record)
            else:
                new_record = ApiCache(
                    cache_key=cache_key,
                    response_data=serialized,
                    expires_at=expires_at
                )
                session.add(new_record)
            session.commit()
        except Exception as db_err:
            logger.warning(f"Failed to persist ApiCache to DB: {db_err}")

        return fresh_data
    except Exception as e:
        logger.error(f"External API call failed for key {cache_key}: {e}")
        # Graceful degradation: return stale cached record if available
        if cached_record:
            logger.info(f"Returning stale DB cache for {cache_key}")
            return json.loads(cached_record.response_data)
        raise
