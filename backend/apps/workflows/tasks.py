"""
Celery tasks for background processing.

Tasks include:
- Thumbnail generation for images and PDFs
- PDF conversion for Office documents
- OCR processing
- Search indexing
"""
from celery import shared_task
from django.core.files.base import ContentFile
from django.conf import settings
import logging
import os
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def generate_thumbnail(self, document_id):
    """
    Generate thumbnail for image or PDF document.

    Creates a 200x200 thumbnail and stores it in MinIO.

    Supported formats:
    - Images: JPEG, PNG, GIF, BMP, TIFF
    - PDFs: First page thumbnail

    Args:
        document_id: UUID of the document

    Returns:
        dict: {'success': bool, 'thumbnail_path': str, 'message': str}
    """
    from apps.documents.models import Document
    from PIL import Image
    import io

    try:
        # Get document
        document = Document.objects.get(id=document_id)
        logger.info(f"Generating thumbnail for document {document_id} ({document.file_name})")

        # Check if file type is supported
        if not document.file_type:
            return {
                'success': False,
                'message': 'File type not detected'
            }

        thumbnail_buffer = None

        # Handle image files
        if document.file_type.startswith('image/'):
            try:
                # Open image from file
                document.file.open('rb')
                image = Image.open(document.file)
                document.file.close()

                # Convert RGBA to RGB if necessary (for PNG with transparency)
                if image.mode in ('RGBA', 'LA', 'P'):
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    if image.mode == 'P':
                        image = image.convert('RGBA')
                    background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                    image = background
                elif image.mode != 'RGB':
                    image = image.convert('RGB')

                # Create thumbnail (200x200 maintaining aspect ratio)
                image.thumbnail((200, 200), Image.Resampling.LANCZOS)

                # Save to buffer
                thumbnail_buffer = io.BytesIO()
                image.save(thumbnail_buffer, format='JPEG', quality=85, optimize=True)
                thumbnail_buffer.seek(0)

                logger.info(f"Image thumbnail generated for {document_id}")

            except Exception as e:
                logger.error(f"Error processing image thumbnail: {e}", exc_info=True)
                raise

        # Handle PDF files
        elif document.file_type == 'application/pdf':
            try:
                from pdf2image import convert_from_bytes
                from pdf2image.exceptions import PDFPageCountError

                # Read PDF file
                document.file.open('rb')
                pdf_bytes = document.file.read()
                document.file.close()

                # Convert first page to image
                images = convert_from_bytes(
                    pdf_bytes,
                    first_page=1,
                    last_page=1,
                    dpi=150,
                    size=(600, None),  # Limit width to 600px
                    fmt='jpeg'
                )

                if images:
                    # Create thumbnail from first page
                    image = images[0]
                    image.thumbnail((200, 200), Image.Resampling.LANCZOS)

                    # Save to buffer
                    thumbnail_buffer = io.BytesIO()
                    image.save(thumbnail_buffer, format='JPEG', quality=85, optimize=True)
                    thumbnail_buffer.seek(0)

                    logger.info(f"PDF thumbnail generated for {document_id}")
                else:
                    return {
                        'success': False,
                        'message': 'PDF has no pages'
                    }

            except PDFPageCountError:
                logger.warning(f"PDF {document_id} has no pages")
                return {
                    'success': False,
                    'message': 'PDF has no pages'
                }
            except Exception as e:
                logger.error(f"Error processing PDF thumbnail: {e}", exc_info=True)
                raise

        else:
            # Unsupported file type
            return {
                'success': False,
                'message': f'Thumbnail generation not supported for {document.file_type}'
            }

        # Save thumbnail to MinIO
        if thumbnail_buffer:
            thumbnail_filename = f"{document.id}_thumbnail.jpg"
            thumbnail_path = f"thumbnails/{thumbnail_filename}"

            # Save using Document's file field (will go to MinIO)
            # We'll store the thumbnail path in a new field
            from django.core.files.storage import default_storage

            saved_path = default_storage.save(thumbnail_path, ContentFile(thumbnail_buffer.read()))

            # Update document with thumbnail path
            document.thumbnail_path = saved_path
            document.save(update_fields=['thumbnail_path'])

            logger.info(f"Thumbnail saved to {saved_path} for document {document_id}")

            return {
                'success': True,
                'thumbnail_path': saved_path,
                'message': 'Thumbnail generated successfully'
            }

        return {
            'success': False,
            'message': 'Failed to generate thumbnail'
        }

    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return {
            'success': False,
            'message': 'Document not found'
        }

    except Exception as e:
        logger.error(f"Thumbnail generation failed for {document_id}: {e}", exc_info=True)

        # Retry with exponential backoff
        try:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        except self.MaxRetriesExceededError:
            return {
                'success': False,
                'message': f'Thumbnail generation failed after {self.max_retries} retries: {str(e)}'
            }


@shared_task(bind=True, max_retries=3)
def convert_to_pdf(self, document_id):
    """
    Convert Office documents to PDF format.

    Supported formats:
    - Microsoft Word (.doc, .docx)
    - Microsoft Excel (.xls, .xlsx)
    - Microsoft PowerPoint (.ppt, .pptx)
    - LibreOffice formats (.odt, .ods, .odp)

    Uses LibreOffice headless mode for conversion.

    Args:
        document_id: UUID of the document

    Returns:
        dict: {'success': bool, 'pdf_path': str, 'message': str}
    """
    from apps.documents.models import Document
    import subprocess

    try:
        # Get document
        document = Document.objects.get(id=document_id)
        logger.info(f"Converting document {document_id} ({document.file_name}) to PDF")

        # Check if file type is convertible
        convertible_types = {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  # .docx
            'application/msword',  # .doc
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',  # .xlsx
            'application/vnd.ms-excel',  # .xls
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',  # .pptx
            'application/vnd.ms-powerpoint',  # .ppt
            'application/vnd.oasis.opendocument.text',  # .odt
            'application/vnd.oasis.opendocument.spreadsheet',  # .ods
            'application/vnd.oasis.opendocument.presentation',  # .odp
        }

        if document.file_type not in convertible_types:
            return {
                'success': False,
                'message': f'PDF conversion not supported for {document.file_type}'
            }

        # Create temporary directory for conversion
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_input_path = os.path.join(temp_dir, document.file_name)
            output_dir = temp_dir

            # Download file from MinIO to temp location
            document.file.open('rb')
            with open(temp_input_path, 'wb') as temp_file:
                temp_file.write(document.file.read())
            document.file.close()

            logger.info(f"File downloaded to {temp_input_path}")

            # Check if LibreOffice is available
            libreoffice_commands = [
                'libreoffice',  # Linux
                'soffice',  # Alternative Linux
                r'C:\Program Files\LibreOffice\program\soffice.exe',  # Windows default
                r'C:\Program Files (x86)\LibreOffice\program\soffice.exe',  # Windows x86
            ]

            libreoffice_path = None
            for cmd in libreoffice_commands:
                try:
                    result = subprocess.run(
                        [cmd, '--version'],
                        capture_output=True,
                        timeout=5
                    )
                    if result.returncode == 0:
                        libreoffice_path = cmd
                        logger.info(f"Found LibreOffice at: {cmd}")
                        break
                except (FileNotFoundError, subprocess.TimeoutExpired):
                    continue

            if not libreoffice_path:
                logger.error("LibreOffice not found on system")
                return {
                    'success': False,
                    'message': 'LibreOffice is not installed or not in PATH. Required for PDF conversion.'
                }

            # Convert to PDF using LibreOffice headless
            try:
                conversion_command = [
                    libreoffice_path,
                    '--headless',
                    '--convert-to', 'pdf',
                    '--outdir', output_dir,
                    temp_input_path
                ]

                logger.info(f"Running conversion command: {' '.join(conversion_command)}")

                result = subprocess.run(
                    conversion_command,
                    capture_output=True,
                    text=True,
                    timeout=120  # 2 minute timeout
                )

                if result.returncode != 0:
                    logger.error(f"LibreOffice conversion failed: {result.stderr}")
                    return {
                        'success': False,
                        'message': f'Conversion failed: {result.stderr}'
                    }

                # Find the converted PDF
                pdf_filename = Path(document.file_name).stem + '.pdf'
                pdf_path = os.path.join(output_dir, pdf_filename)

                if not os.path.exists(pdf_path):
                    logger.error(f"PDF file not found at {pdf_path}")
                    return {
                        'success': False,
                        'message': 'PDF file was not created'
                    }

                logger.info(f"PDF created at {pdf_path}")

                # Upload PDF to MinIO
                pdf_storage_path = f"converted_pdfs/{document.id}_{pdf_filename}"

                from django.core.files.storage import default_storage
                with open(pdf_path, 'rb') as pdf_file:
                    saved_path = default_storage.save(pdf_storage_path, ContentFile(pdf_file.read()))

                # Update document with PDF path
                document.pdf_version_path = saved_path
                document.save(update_fields=['pdf_version_path'])

                logger.info(f"PDF saved to {saved_path} for document {document_id}")

                return {
                    'success': True,
                    'pdf_path': saved_path,
                    'message': 'Document converted to PDF successfully'
                }

            except subprocess.TimeoutExpired:
                logger.error(f"PDF conversion timed out for {document_id}")
                return {
                    'success': False,
                    'message': 'Conversion timed out (exceeded 2 minutes)'
                }
            except Exception as e:
                logger.error(f"Conversion subprocess error: {e}", exc_info=True)
                raise

    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return {
            'success': False,
            'message': 'Document not found'
        }

    except Exception as e:
        logger.error(f"PDF conversion failed for {document_id}: {e}", exc_info=True)

        # Retry with exponential backoff
        try:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        except self.MaxRetriesExceededError:
            return {
                'success': False,
                'message': f'PDF conversion failed after {self.max_retries} retries: {str(e)}'
            }


@shared_task
def batch_generate_thumbnails(document_ids):
    """
    Generate thumbnails for multiple documents in batch.

    Args:
        document_ids: List of document UUIDs

    Returns:
        dict: Summary of results
    """
    from apps.documents.models import Document

    results = {
        'total': len(document_ids),
        'success': 0,
        'failed': 0,
        'skipped': 0
    }

    for doc_id in document_ids:
        try:
            result = generate_thumbnail(str(doc_id))
            if result.get('success'):
                results['success'] += 1
            else:
                results['failed'] += 1
                logger.warning(f"Thumbnail generation failed for {doc_id}: {result.get('message')}")
        except Exception as e:
            results['failed'] += 1
            logger.error(f"Error in batch thumbnail generation for {doc_id}: {e}")

    logger.info(f"Batch thumbnail generation completed: {results}")
    return results
