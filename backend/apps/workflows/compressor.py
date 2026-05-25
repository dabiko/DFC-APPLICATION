"""
Format-aware lossless document compression.

Supported formats and algorithms:
  PDF               → pikepdf (stream re-compression + object stream packing)
  PNG / TIFF / BMP / GIF → Pillow (max lossless re-encode)
  DOCX / XLSX / PPTX    → zipfile re-pack at compression level 9

Files that are already compressed (JPEG, ZIP, RAR, 7z, GZ) are skipped
immediately, as are any formats not in the above list.

The compressor only writes back a result if savings are >= SKIP_THRESHOLD
(default 5%). Below that the overhead isn't worth it.
"""

import io
import zipfile
import hashlib
import logging

logger = logging.getLogger(__name__)

SKIP_THRESHOLD = 0.05  # minimum fractional savings to accept a compressed result

# MIME → algorithm name; anything not listed is skipped
ALGORITHM_MAP = {
    'application/pdf': 'pikepdf',
    'image/png': 'pillow',
    'image/tiff': 'pillow',
    'image/bmp': 'pillow',
    'image/gif': 'pillow',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'zip-repack',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'zip-repack',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'zip-repack',
}


class CompressionSkipped(Exception):
    """Raised when compression would not yield meaningful space savings."""


class DocumentCompressor:

    @classmethod
    def compress(cls, data: bytes, mime_type: str) -> tuple[bytes, str]:
        """
        Compress document bytes losslessly.

        Returns:
            (compressed_bytes, algorithm_name)

        Raises:
            CompressionSkipped  – if the format is unsupported or savings < SKIP_THRESHOLD
            Exception           – propagated on hard failures (caller decides how to handle)
        """
        algorithm = ALGORITHM_MAP.get(mime_type)
        if not algorithm:
            raise CompressionSkipped(f"Unsupported MIME type for compression: {mime_type}")

        if algorithm == 'pikepdf':
            compressed = cls._compress_pdf(data)
        elif algorithm == 'pillow':
            compressed = cls._compress_image(data, mime_type)
        elif algorithm == 'zip-repack':
            compressed = cls._repack_zip(data)
        else:
            raise CompressionSkipped(f"No handler for algorithm: {algorithm}")

        original_len = len(data)
        compressed_len = len(compressed)
        savings = (original_len - compressed_len) / original_len if original_len else 0

        if savings < SKIP_THRESHOLD:
            raise CompressionSkipped(
                f"Savings {savings:.1%} below threshold {SKIP_THRESHOLD:.0%} "
                f"({original_len} → {compressed_len} bytes)"
            )

        logger.info(
            "Compressed %s bytes → %s bytes (%.1f%% saved) using %s",
            original_len, compressed_len, savings * 100, algorithm,
        )
        return compressed, algorithm

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @classmethod
    def _compress_pdf(cls, data: bytes) -> bytes:
        try:
            import pikepdf
        except ImportError:
            raise CompressionSkipped("pikepdf not installed")

        input_buf = io.BytesIO(data)
        output_buf = io.BytesIO()

        with pikepdf.open(input_buf) as pdf:
            pdf.save(
                output_buf,
                compress_streams=True,
                stream_decode_level=pikepdf.StreamDecodeLevel.generalized,
                object_stream_mode=pikepdf.ObjectStreamMode.generate,
                recompress_flate=True,
            )

        return output_buf.getvalue()

    @classmethod
    def _compress_image(cls, data: bytes, mime_type: str) -> bytes:
        from PIL import Image

        img = Image.open(io.BytesIO(data))
        out = io.BytesIO()

        if mime_type == 'image/png':
            img.save(out, format='PNG', optimize=True, compress_level=9)
        elif mime_type in ('image/tiff', 'image/bmp'):
            # Convert BMP to TIFF with deflate for much better compression
            if img.mode not in ('RGB', 'RGBA', 'L', 'LA'):
                img = img.convert('RGB')
            img.save(out, format='TIFF', compression='tiff_deflate')
        elif mime_type == 'image/gif':
            img.save(out, format='GIF', optimize=True)
        else:
            raise CompressionSkipped(f"No Pillow handler for {mime_type}")

        return out.getvalue()

    @classmethod
    def _repack_zip(cls, data: bytes) -> bytes:
        """Re-compress an Office Open XML (or any ZIP) archive at level 9."""
        in_buf = io.BytesIO(data)
        out_buf = io.BytesIO()

        with zipfile.ZipFile(in_buf, 'r') as src_zip:
            with zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as dst_zip:
                for item in src_zip.infolist():
                    dst_zip.writestr(item, src_zip.read(item.filename))

        return out_buf.getvalue()
