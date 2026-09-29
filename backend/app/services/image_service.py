import os
import uuid
import io
import logging
from PIL import Image
from typing import BinaryIO, Union
from app.core.config import settings

logger = logging.getLogger("app.services.image")

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except ImportError:
    pass

UPLOAD_DIR = os.path.join(os.path.dirname(settings.DATABASE_URL.replace("sqlite:///", "")), "uploads")

def optimize_and_save_image(file_obj_or_bytes: Union[BinaryIO, bytes], filename: str) -> str:
    """
    Center crop to 700x700 square, compress to WebP format (quality 80%),
    and save file to storage (local fallback or GCS).
    Returns image URL.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    if isinstance(file_obj_or_bytes, bytes):
        if not file_obj_or_bytes:
            raise ValueError("アップロードされたファイルが空です。")
        file_stream = io.BytesIO(file_obj_or_bytes)
    else:
        file_stream = file_obj_or_bytes
        if hasattr(file_stream, "seek"):
            try:
                file_stream.seek(0)
            except Exception:
                pass

    # Open image with Pillow
    try:
        img = Image.open(file_stream)
    except Exception as e:
        logger.warning(f"Failed to identify image file '{filename}': {e}")
        raise ValueError("有効な画像ファイル（JPEG, PNG, WebP, HEIC等）を指定してください。")
    
    # Auto-orient if EXIF orientation exists
    try:
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    # 1. Center crop to square
    width, height = img.size
    min_dim = min(width, height)
    left = (width - min_dim) / 2
    top = (height - min_dim) / 2
    right = (width + min_dim) / 2
    bottom = (height + min_dim) / 2
    img_cropped = img.crop((left, top, right, bottom))

    # 2. Resize to 700x700
    img_resized = img_cropped.resize((700, 700), Image.Resampling.LANCZOS)

    # 3. Convert & Compress to WebP (Quality: 80%)
    buffer = io.BytesIO()
    if img_resized.mode != "RGB":
        img_resized = img_resized.convert("RGB")
    img_resized.save(buffer, format="WEBP", quality=80)
    buffer.seek(0)

    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}_{os.path.splitext(filename)[0]}.webp"

    # GCS Upload check
    gcs_url = None
    if os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") and settings.GCS_BUCKET_NAME_IMAGES:
        try:
            from google.cloud import storage
            client = storage.Client()
            bucket = client.bucket(settings.GCS_BUCKET_NAME_IMAGES)
            blob = bucket.blob(f"stay_images/{unique_filename}")
            blob.upload_from_file(buffer, content_type="image/webp")
            gcs_url = blob.public_url
            logger.info(f"Uploaded optimized image to GCS: {gcs_url}")
            return gcs_url
        except Exception as e:
            logger.warning(f"GCS upload failed, falling back to local storage: {e}")

    # Fallback to local storage
    local_path = os.path.join(UPLOAD_DIR, unique_filename)
    with open(local_path, "wb") as f:
        f.write(buffer.getvalue())

    local_url = f"/static/uploads/{unique_filename}"
    logger.info(f"Saved optimized image locally: {local_url}")
    return local_url
