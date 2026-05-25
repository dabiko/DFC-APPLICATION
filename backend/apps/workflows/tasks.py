"""
Celery tasks for background processing.

Tasks include:
- Thumbnail generation for images and PDFs
- PDF conversion for Office documents
- OCR processing
- Search indexing
- Lossless document compression
"""
from celery import shared_task
from django.core.files.base import ContentFile
from django.conf import settings
from django.utils import timezone
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


# ========================================
# Text Extraction Tasks
# ========================================

@shared_task(bind=True, max_retries=3)
def extract_document_text(self, document_id):
    """
    Extract text from document asynchronously.

    Supported formats:
    - PDF (PyPDF2)
    - Word (.docx)
    - Excel (.xlsx)
    - Plain text (.txt)

    After extraction, text is:
    1. Saved to document.extracted_text field
    2. Indexed in Elasticsearch for searchability

    Args:
        document_id: UUID of document to extract text from

    Returns:
        dict: Result summary with success status and extracted text length
    """
    from apps.documents.models import Document
    from apps.workflows.extractors import TextExtractor, OCRDetector
    import tempfile

    try:
        # Get document
        document = Document.objects.get(id=document_id)
        logger.info(f"Starting text extraction for document {document_id} ({document.file_name})")

        # Create temporary file for extraction
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(document.file_name).suffix) as temp_file:
            temp_path = temp_file.name

            # Download file from MinIO to temp location
            document.file.open('rb')
            temp_file.write(document.file.read())
            document.file.close()

        try:
            # Extract text based on file type
            extracted_text = TextExtractor.extract_text(temp_path, document.file_type)

            # Check if extraction yielded any text
            if extracted_text and len(extracted_text.strip()) > 0:
                # Save extracted text to document
                document.extracted_text = extracted_text
                document.is_indexed = False  # Mark for re-indexing
                document.save(update_fields=['extracted_text', 'is_indexed'])

                logger.info(
                    f"Extracted {len(extracted_text)} characters from document {document_id}"
                )

                # Update Elasticsearch index (signal will handle this automatically)
                # But we can also force update here
                try:
                    from apps.search.documents import DocumentDocument
                    doc_index = DocumentDocument()
                    doc_index.update(document)
                    logger.info(f"Updated Elasticsearch index for document {document_id}")
                except Exception as e:
                    logger.warning(f"Failed to update Elasticsearch index: {e}")

                # Trigger automatic classification after text extraction
                try:
                    classify_document_after_extraction.delay(str(document_id))
                    logger.info(f"Classification triggered for document {document_id}")
                except Exception as e:
                    logger.warning(f"Failed to trigger classification: {e}")

                return {
                    'success': True,
                    'document_id': str(document_id),
                    'extracted_length': len(extracted_text),
                    'message': 'Text extraction successful'
                }

            else:
                # No text extracted - might be scanned document
                logger.warning(f"No text extracted from document {document_id}")

                # Check if it's a scanned PDF that needs OCR
                if document.file_type == 'application/pdf':
                    is_scanned = OCRDetector.is_scanned_document(temp_path, document.file_type)

                    if is_scanned:
                        logger.info(f"Document {document_id} appears to be scanned, scheduling OCR")
                        # Schedule OCR task
                        ocr_document.delay(str(document_id))

                        return {
                            'success': True,
                            'document_id': str(document_id),
                            'message': 'Scanned document detected, OCR scheduled'
                        }

                return {
                    'success': False,
                    'document_id': str(document_id),
                    'message': 'No text extracted from document'
                }

        finally:
            # Clean up temporary file
            try:
                os.unlink(temp_path)
            except Exception:
                pass

    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return {
            'success': False,
            'message': 'Document not found'
        }

    except Exception as e:
        logger.error(f"Text extraction failed for {document_id}: {e}", exc_info=True)

        # Retry with exponential backoff
        try:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        except self.MaxRetriesExceededError:
            return {
                'success': False,
                'message': f'Text extraction failed after {self.max_retries} retries: {str(e)}'
            }


@shared_task(bind=True, max_retries=2)
def ocr_document(self, document_id):
    """
    Perform OCR on scanned document.

    Uses Tesseract OCR to extract text from image-based PDFs.
    Includes image preprocessing for better accuracy.

    Process:
    1. Convert PDF pages to images (300 DPI)
    2. Preprocess images (grayscale, contrast, denoise)
    3. Perform OCR with confidence scoring
    4. Save extracted text and confidence score

    Args:
        document_id: UUID of document to OCR

    Returns:
        dict: Result with OCR text length and average confidence
    """
    from apps.documents.models import Document
    from apps.workflows.extractors import ImagePreprocessor
    from pdf2image import convert_from_bytes
    from pdf2image.exceptions import PDFPageCountError
    import pytesseract
    import tempfile

    try:
        # Get document
        document = Document.objects.get(id=document_id)
        logger.info(f"Starting OCR for document {document_id} ({document.file_name})")

        # Only process PDFs
        if document.file_type != 'application/pdf':
            logger.warning(f"OCR only supported for PDFs, skipping {document_id}")
            return {
                'success': False,
                'message': 'OCR only supported for PDF documents'
            }

        # Read PDF file
        document.file.open('rb')
        pdf_bytes = document.file.read()
        document.file.close()

        try:
            # Convert PDF to images (300 DPI for good quality)
            logger.info(f"Converting PDF to images for OCR")
            images = convert_from_bytes(
                pdf_bytes,
                dpi=300,
                fmt='jpeg',
                thread_count=2
            )

            logger.info(f"Converted PDF to {len(images)} images")

            # Perform OCR on each page
            ocr_text = ""
            confidences = []

            for i, image in enumerate(images):
                logger.debug(f"Processing page {i+1}/{len(images)} for OCR")

                # Preprocess image for better OCR
                processed_image = ImagePreprocessor.preprocess_for_ocr(image)

                # Get OCR data with confidence scores
                try:
                    page_data = pytesseract.image_to_data(
                        processed_image,
                        output_type=pytesseract.Output.DICT,
                        lang='eng'
                    )

                    # Extract text
                    page_text = pytesseract.image_to_string(processed_image, lang='eng')

                    if page_text.strip():
                        ocr_text += f"\n--- Page {i+1} ---\n{page_text}"

                    # Collect confidence scores (filter out -1 which means no text)
                    page_confidences = [
                        int(conf) for conf in page_data['conf']
                        if conf != '-1' and isinstance(conf, (int, str)) and str(conf).isdigit()
                    ]

                    if page_confidences:
                        confidences.extend(page_confidences)
                        avg_page_conf = sum(page_confidences) / len(page_confidences)
                        logger.debug(
                            f"Page {i+1} OCR confidence: {avg_page_conf:.1f}% "
                            f"({len(page_text)} characters extracted)"
                        )

                except Exception as e:
                    logger.warning(f"OCR failed for page {i+1}: {e}")
                    continue

            # Calculate overall confidence
            if confidences:
                avg_confidence = sum(confidences) / len(confidences) / 100.0  # Convert to 0-1 scale
            else:
                avg_confidence = 0.0

            # Save OCR results
            if ocr_text.strip():
                document.extracted_text = ocr_text.strip()
                document.ocr_confidence = avg_confidence
                document.is_indexed = False
                document.save(update_fields=['extracted_text', 'ocr_confidence', 'is_indexed'])

                logger.info(
                    f"OCR completed for document {document_id}: "
                    f"{len(ocr_text)} characters, {avg_confidence*100:.1f}% confidence"
                )

                # Update Elasticsearch index
                try:
                    from apps.search.documents import DocumentDocument
                    doc_index = DocumentDocument()
                    doc_index.update(document)
                    logger.info(f"Updated Elasticsearch index after OCR for document {document_id}")
                except Exception as e:
                    logger.warning(f"Failed to update Elasticsearch index: {e}")

                # Trigger automatic classification after OCR
                try:
                    classify_document_after_extraction.delay(str(document_id))
                    logger.info(f"Classification triggered for document {document_id} after OCR")
                except Exception as e:
                    logger.warning(f"Failed to trigger classification: {e}")

                return {
                    'success': True,
                    'document_id': str(document_id),
                    'extracted_length': len(ocr_text),
                    'confidence': round(avg_confidence * 100, 1),
                    'pages_processed': len(images),
                    'message': 'OCR completed successfully'
                }
            else:
                logger.warning(f"No text extracted via OCR from document {document_id}")
                return {
                    'success': False,
                    'document_id': str(document_id),
                    'message': 'No text extracted via OCR'
                }

        except PDFPageCountError:
            logger.warning(f"PDF {document_id} has no pages")
            return {
                'success': False,
                'message': 'PDF has no pages'
            }

    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return {
            'success': False,
            'message': 'Document not found'
        }

    except Exception as e:
        logger.error(f"OCR failed for {document_id}: {e}", exc_info=True)

        # Retry with exponential backoff (longer countdown for OCR)
        try:
            raise self.retry(exc=e, countdown=120 * (2 ** self.request.retries))
        except self.MaxRetriesExceededError:
            return {
                'success': False,
                'message': f'OCR failed after {self.max_retries} retries: {str(e)}'
            }


@shared_task
def extract_text_and_index(document_id):
    """
    Combined task: extract text (or perform OCR), then index.

    This is the main entry point for text extraction after document upload.
    It intelligently decides whether to use standard extraction or OCR.

    Process:
    1. Try standard text extraction first
    2. If no text found and document is PDF, check if scanned
    3. If scanned, perform OCR
    4. Index extracted text in Elasticsearch

    Args:
        document_id: UUID of document

    Returns:
        dict: Summary of extraction and indexing results
    """
    logger.info(f"Starting combined extraction and indexing for document {document_id}")

    # Start text extraction task
    result = extract_document_text.delay(str(document_id))

    return {
        'task_id': result.id,
        'document_id': str(document_id),
        'message': 'Text extraction task started'
    }


@shared_task
def batch_extract_text(document_ids):
    """
    Extract text from multiple documents in batch.

    Args:
        document_ids: List of document UUIDs

    Returns:
        dict: Summary of batch extraction results
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
            # Check if document exists and needs extraction
            document = Document.objects.get(id=doc_id, is_deleted=False)

            # Skip if already has extracted text
            if document.extracted_text:
                results['skipped'] += 1
                logger.info(f"Skipping document {doc_id} (already has extracted text)")
                continue

            # Start extraction
            result = extract_document_text.delay(str(doc_id))

            if result:
                results['success'] += 1
            else:
                results['failed'] += 1

        except Document.DoesNotExist:
            results['failed'] += 1
            logger.warning(f"Document {doc_id} not found")
        except Exception as e:
            results['failed'] += 1
            logger.error(f"Error in batch extraction for {doc_id}: {e}")

    logger.info(f"Batch text extraction completed: {results}")
    return results


# ========================================
# Classification Tasks
# ========================================

@shared_task(bind=True, max_retries=2)
def apply_classification_rules(self, document_id, triggered_by='auto'):
    """
    Apply classification rules to a document.

    Automatically categorizes, tags, and organizes documents based on
    predefined rules that match content, filename, and metadata.

    Process:
    1. Get all active classification rules (ordered by priority)
    2. Check each rule's conditions against document
    3. Apply actions for matching rules
    4. Log all classification actions for audit trail

    Args:
        document_id: UUID of document to classify
        triggered_by: How classification was triggered (auto, manual, bulk)

    Returns:
        dict: Summary of classification results

    Example Actions:
        - Move to specific folder based on content
        - Set document type (INVOICE, CONTRACT, etc.)
        - Add tags based on keywords
        - Set confidentiality level
        - Assign to department
    """
    from apps.documents.models import Document
    from apps.classification.engine import ClassificationEngine

    try:
        # Get document
        document = Document.objects.get(id=document_id)
        logger.info(
            f"Starting classification for document {document_id} "
            f"({document.file_name}, triggered_by={triggered_by})"
        )

        # Apply classification rules
        result = ClassificationEngine.classify_document(document, triggered_by=triggered_by)

        if result['success']:
            logger.info(
                f"Classification complete for document {document_id}: "
                f"{result['rules_applied']} rules applied, "
                f"{result['total_actions']} total actions"
            )

            return {
                'success': True,
                'document_id': str(document_id),
                'rules_applied': result['rules_applied'],
                'total_actions': result['total_actions'],
                'message': 'Classification completed successfully'
            }
        else:
            logger.warning(f"No classification rules matched document {document_id}")
            return {
                'success': True,
                'document_id': str(document_id),
                'rules_applied': 0,
                'total_actions': 0,
                'message': 'No matching rules found'
            }

    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return {
            'success': False,
            'message': 'Document not found'
        }

    except Exception as e:
        logger.error(f"Classification failed for {document_id}: {e}", exc_info=True)

        # Retry with exponential backoff
        try:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        except self.MaxRetriesExceededError:
            return {
                'success': False,
                'message': f'Classification failed after {self.max_retries} retries: {str(e)}'
            }


@shared_task
def classify_document_after_extraction(document_id):
    """
    Classify document after text extraction completes.

    This is the main entry point for automatic classification.
    Called after text extraction so content-based rules can match.

    Args:
        document_id: UUID of document

    Returns:
        dict: Task execution result
    """
    logger.info(f"Scheduling classification for document {document_id} after extraction")

    # Start classification task
    result = apply_classification_rules.delay(str(document_id), triggered_by='auto')

    return {
        'task_id': result.id,
        'document_id': str(document_id),
        'message': 'Classification task scheduled'
    }


@shared_task
def batch_classify_documents(document_ids, triggered_by='bulk'):
    """
    Apply classification rules to multiple documents in batch.

    Useful for:
    - Classifying existing documents after creating new rules
    - Re-classifying documents after rule changes
    - Bulk organization operations

    Args:
        document_ids: List of document UUIDs
        triggered_by: How classification was triggered

    Returns:
        dict: Summary of batch classification results
    """
    from apps.documents.models import Document

    results = {
        'total': len(document_ids),
        'success': 0,
        'failed': 0,
        'rules_applied': 0,
        'total_actions': 0
    }

    logger.info(f"Starting batch classification for {len(document_ids)} documents")

    for doc_id in document_ids:
        try:
            # Get document
            document = Document.objects.get(id=doc_id, is_deleted=False)

            # Apply classification
            result = apply_classification_rules.delay(str(doc_id), triggered_by=triggered_by)

            results['success'] += 1

        except Document.DoesNotExist:
            results['failed'] += 1
            logger.warning(f"Document {doc_id} not found")
        except Exception as e:
            results['failed'] += 1
            logger.error(f"Error in batch classification for {doc_id}: {e}")

    logger.info(f"Batch classification completed: {results}")
    return results


@shared_task
def reclassify_documents_for_rule(rule_id):
    """
    Reclassify all matching documents when a rule is updated.

    Useful for testing new rules or updating classifications
    after rule modifications.

    Args:
        rule_id: ID of ClassificationRule to apply

    Returns:
        dict: Summary of reclassification results
    """
    from apps.classification.models import ClassificationRule
    from apps.classification.engine import ClassificationEngine
    from apps.documents.models import Document

    try:
        rule = ClassificationRule.objects.get(id=rule_id)
        logger.info(f"Reclassifying documents for rule '{rule.name}' (ID: {rule_id})")

        # Get all non-deleted documents
        documents = Document.objects.filter(is_deleted=False)

        matched_count = 0
        classified_count = 0

        for document in documents:
            try:
                # Check if rule matches
                if ClassificationEngine.matches_conditions(document, rule.conditions):
                    matched_count += 1

                    # Apply rule actions
                    result = ClassificationEngine.apply_actions(document, rule.actions, rule)

                    if result['success']:
                        classified_count += 1

                        # Create classification log
                        from apps.classification.models import ClassificationLog
                        ClassificationLog.objects.create(
                            rule=rule,
                            document=document,
                            applied_at=timezone.now(),
                            conditions_matched=rule.conditions,
                            actions_applied=result['actions_applied'],
                            success=True,
                            triggered_by='rule_update'
                        )

                        # Update rule statistics
                        rule.increment_applied_count()

            except Exception as e:
                logger.error(
                    f"Error reclassifying document {document.id} with rule {rule_id}: {e}"
                )

        logger.info(
            f"Reclassification complete for rule {rule_id}: "
            f"{matched_count} documents matched, {classified_count} classified"
        )

        return {
            'success': True,
            'rule_id': rule_id,
            'rule_name': rule.name,
            'documents_matched': matched_count,
            'documents_classified': classified_count
        }

    except ClassificationRule.DoesNotExist:
        logger.error(f"Classification rule {rule_id} not found")
        return {
            'success': False,
            'message': 'Classification rule not found'
        }
    except Exception as e:
        logger.error(f"Reclassification failed for rule {rule_id}: {e}", exc_info=True)
        return {
            'success': False,
            'message': str(e)
        }


# ========================================
# Workflow SLA Monitoring Tasks
# ========================================

@shared_task
def run_sla_monitoring():
    """
    Run SLA monitoring cycle for all active workflow tasks.

    This task should be scheduled to run periodically (e.g., every 15-30 minutes)
    via Celery beat.

    Actions performed:
    - Send reminder notifications for tasks approaching deadline
    - Send SLA warning notifications
    - Mark overdue tasks and send notifications
    - Trigger automatic escalation for breached SLAs

    Returns:
        dict: Summary of monitoring actions taken
    """
    from apps.workflows.sla import SLAMonitoringService

    logger.info("Starting SLA monitoring cycle")

    try:
        results = SLAMonitoringService.run_monitoring_cycle()

        logger.info(
            f"SLA monitoring completed: "
            f"{results['reminders_sent']} reminders, "
            f"{results['warnings_sent']} warnings, "
            f"{results['overdue_notifications']} overdue notifications, "
            f"{results['escalations']} escalations"
        )

        return {
            'success': True,
            **results
        }

    except Exception as e:
        logger.error(f"SLA monitoring failed: {e}", exc_info=True)
        return {
            'success': False,
            'message': str(e)
        }


@shared_task
def send_task_reminders():
    """
    Send reminder notifications for tasks with approaching deadlines.

    Specifically checks for tasks at configured reminder intervals
    (default: 24h, 8h, 2h before due).

    Returns:
        dict: Summary of reminders sent
    """
    from apps.workflows.sla import SLAService, SLAConfig
    from apps.workflows.notifications import WorkflowNotificationService
    from apps.workflows.models import WorkflowAuditLog
    from datetime import timedelta

    logger.info("Checking for tasks needing reminders")

    results = {'sent': 0, 'failed': 0, 'skipped': 0}

    try:
        tasks_needing_reminder = SLAService.get_tasks_needing_reminder()

        for task, hours_remaining in tasks_needing_reminder:
            try:
                # Check if reminder already sent for this time window
                recent_reminder = WorkflowAuditLog.objects.filter(
                    task=task,
                    action='notification_task_reminder',
                    timestamp__gte=timezone.now() - timedelta(hours=1)
                ).exists()

                if recent_reminder:
                    results['skipped'] += 1
                    continue

                WorkflowNotificationService.notify_task_reminder(task, hours_remaining)
                results['sent'] += 1

                logger.debug(
                    f"Reminder sent for task {task.id} ({hours_remaining}h remaining)"
                )

            except Exception as e:
                logger.error(f"Failed to send reminder for task {task.id}: {e}")
                results['failed'] += 1

        logger.info(f"Task reminders completed: {results}")
        return {
            'success': True,
            **results
        }

    except Exception as e:
        logger.error(f"Task reminder check failed: {e}", exc_info=True)
        return {
            'success': False,
            'message': str(e)
        }


@shared_task
def process_overdue_tasks():
    """
    Process all overdue tasks - send notifications and escalate.

    Called periodically to:
    - Notify assignees about overdue tasks
    - Trigger automatic escalation after delay period

    Returns:
        dict: Summary of overdue processing
    """
    from apps.workflows.sla import SLAService, EscalationService
    from apps.workflows.notifications import WorkflowNotificationService
    from apps.workflows.models import WorkflowAuditLog
    from datetime import timedelta

    logger.info("Processing overdue tasks")

    results = {
        'overdue_count': 0,
        'notifications_sent': 0,
        'escalations': 0,
        'failed': 0
    }

    try:
        overdue_tasks = SLAService.get_overdue_tasks()
        results['overdue_count'] = len(overdue_tasks)

        for task in overdue_tasks:
            try:
                # Check if we've notified about this in the last 12 hours
                already_notified = WorkflowAuditLog.objects.filter(
                    task=task,
                    action='notification_task_overdue',
                    timestamp__gte=timezone.now() - timedelta(hours=12)
                ).exists()

                if not already_notified:
                    WorkflowNotificationService.notify_task_overdue(task)
                    results['notifications_sent'] += 1

                # Check if should escalate
                if EscalationService.should_escalate(task):
                    new_task = EscalationService.escalate_task(task, reason='SLA breach')
                    if new_task:
                        results['escalations'] += 1
                        logger.info(f"Task {task.id} escalated to {new_task.assigned_to_id}")

            except Exception as e:
                logger.error(f"Failed to process overdue task {task.id}: {e}")
                results['failed'] += 1

        logger.info(f"Overdue task processing completed: {results}")
        return {
            'success': True,
            **results
        }

    except Exception as e:
        logger.error(f"Overdue task processing failed: {e}", exc_info=True)
        return {
            'success': False,
            'message': str(e)
        }


@shared_task
def escalate_task(task_id, reason='Manual escalation'):
    """
    Escalate a specific task to the next level.

    Can be called manually or triggered by SLA monitoring.

    Args:
        task_id: UUID of task to escalate
        reason: Reason for escalation

    Returns:
        dict: Escalation result
    """
    from apps.workflows.models import WorkflowTask
    from apps.workflows.sla import EscalationService

    logger.info(f"Escalating task {task_id}: {reason}")

    try:
        task = WorkflowTask.objects.get(id=task_id)

        new_task = EscalationService.escalate_task(task, reason=reason)

        if new_task:
            return {
                'success': True,
                'original_task_id': str(task_id),
                'new_task_id': str(new_task.id),
                'escalated_to': new_task.assigned_to_id,
                'message': f'Task escalated to {new_task.assigned_to.get_full_name()}'
            }
        else:
            return {
                'success': False,
                'task_id': str(task_id),
                'message': 'No escalation target available'
            }

    except WorkflowTask.DoesNotExist:
        logger.error(f"Task {task_id} not found for escalation")
        return {
            'success': False,
            'message': 'Task not found'
        }
    except Exception as e:
        logger.error(f"Task escalation failed: {e}", exc_info=True)
        return {
            'success': False,
            'message': str(e)
        }


@shared_task
def send_workflow_daily_digest():
    """
    Send daily digest emails to users with pending tasks.

    Includes:
    - Summary of pending tasks
    - Overdue tasks count
    - Tasks approaching deadline

    Should be scheduled to run once daily (e.g., 8:00 AM).

    Returns:
        dict: Summary of digests sent
    """
    from django.contrib.auth import get_user_model
    from apps.workflows.models import WorkflowTask, WorkflowTaskStatus
    from django.core.mail import send_mail
    from django.conf import settings
    from datetime import timedelta

    User = get_user_model()
    logger.info("Generating workflow daily digests")

    results = {'sent': 0, 'skipped': 0, 'failed': 0}

    try:
        now = timezone.now()
        tomorrow = now + timedelta(hours=24)

        # Get all users with active tasks
        users_with_tasks = User.objects.filter(
            assigned_tasks__status__in=[
                WorkflowTaskStatus.PENDING,
                WorkflowTaskStatus.IN_PROGRESS
            ]
        ).distinct()

        for user in users_with_tasks:
            try:
                # Get user's tasks
                pending_tasks = WorkflowTask.objects.filter(
                    assigned_to=user,
                    status__in=[WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS]
                )

                total_pending = pending_tasks.count()
                if total_pending == 0:
                    results['skipped'] += 1
                    continue

                overdue_count = pending_tasks.filter(
                    due_date__lt=now,
                    due_date__isnull=False
                ).count()

                due_soon_count = pending_tasks.filter(
                    due_date__gte=now,
                    due_date__lte=tomorrow,
                    due_date__isnull=False
                ).count()

                # Build email content
                subject = f"Workflow Daily Digest: {total_pending} pending task(s)"

                message_lines = [
                    f"Hello {user.get_full_name() or user.username},",
                    "",
                    "Here's your workflow task summary for today:",
                    "",
                    f"  - Total pending tasks: {total_pending}",
                ]

                if overdue_count > 0:
                    message_lines.append(f"  - OVERDUE tasks: {overdue_count}")

                if due_soon_count > 0:
                    message_lines.append(f"  - Tasks due within 24h: {due_soon_count}")

                message_lines.extend([
                    "",
                    f"View your tasks: {getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}/workflows",
                    "",
                    "Best regards,",
                    "The DFC Team"
                ])

                message = "\n".join(message_lines)

                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False
                )

                results['sent'] += 1
                logger.debug(f"Daily digest sent to {user.email}")

            except Exception as e:
                logger.error(f"Failed to send digest to {user.id}: {e}")
                results['failed'] += 1

        logger.info(f"Daily digest generation completed: {results}")
        return {
            'success': True,
            **results
        }

    except Exception as e:
        logger.error(f"Daily digest generation failed: {e}", exc_info=True)
        return {
            'success': False,
            'message': str(e)
        }


@shared_task
def generate_sla_compliance_report(organization_id=None, period_days=30):
    """
    Generate SLA compliance report for the specified period.

    Args:
        organization_id: Optional organization to filter by
        period_days: Number of days to include in report

    Returns:
        dict: SLA compliance statistics
    """
    from apps.workflows.sla import SLAStatistics
    from datetime import timedelta

    logger.info(f"Generating SLA compliance report for last {period_days} days")

    try:
        end_date = timezone.now()
        start_date = end_date - timedelta(days=period_days)

        # Get organization if specified
        organization = None
        if organization_id:
            from apps.organizations.models import Organization
            organization = Organization.objects.get(id=organization_id)

        # Get compliance statistics
        compliance_stats = SLAStatistics.get_sla_compliance_rate(
            organization=organization,
            start_date=start_date,
            end_date=end_date
        )

        # Get current status
        current_status = SLAStatistics.get_current_sla_status(
            organization=organization
        )

        report = {
            'success': True,
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days': period_days
            },
            'compliance': compliance_stats,
            'current_status': current_status,
            'generated_at': timezone.now().isoformat()
        }

        logger.info(
            f"SLA report generated: {compliance_stats['compliance_rate']}% compliance, "
            f"{current_status['overdue']} currently overdue"
        )

        return report

    except Exception as e:
        logger.error(f"SLA report generation failed: {e}", exc_info=True)
        return {
            'success': False,
            'message': str(e)
        }


# ============================================================
# Lossless compression task
# ============================================================

@shared_task(bind=True, max_retries=2, default_retry_delay=60)
def compress_document_async(self, document_id: str):
    """
    Compress a document losslessly in the background and replace the stored object.

    Flow:
      1. Download from MinIO
      2. Run format-aware lossless compression (pikepdf / Pillow / zip-repack)
      3. If savings >= 5%: overwrite the object in MinIO and update the Document record
      4. Otherwise: mark as SKIPPED and leave the original unchanged

    The task is idempotent: it checks compression_status before doing any work,
    so re-queuing a finished document is safe.
    """
    import hashlib
    from apps.documents.models import Document
    from apps.storage.services import StorageService
    from apps.workflows.compressor import DocumentCompressor, CompressionSkipped
    from django.utils import timezone

    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.warning("compress_document_async: document %s not found", document_id)
        return {'success': False, 'message': 'Document not found'}

    # Idempotency guard — only run when in PENDING state
    if document.compression_status != Document.CompressionStatus.PENDING:
        logger.debug(
            "compress_document_async: skipping document %s — status is %s",
            document_id, document.compression_status,
        )
        return {'success': True, 'message': f'Already processed ({document.compression_status})'}

    if not document.minio_object_key:
        logger.warning("compress_document_async: document %s has no MinIO key", document_id)
        return {'success': False, 'message': 'No MinIO object key'}

    # Mark as in-progress (prevents duplicate runs if task is re-queued)
    Document.objects.filter(pk=document.pk, compression_status=Document.CompressionStatus.PENDING).update(
        compression_status=Document.CompressionStatus.COMPRESSING
    )

    storage = StorageService()
    bucket = document.minio_bucket or storage.default_bucket

    try:
        # 1. Download original content
        original_data = storage.download_file(bucket, document.minio_object_key)
        if original_data is None:
            raise RuntimeError(f"Failed to download {bucket}/{document.minio_object_key}")

        original_size = len(original_data)

        # 2. Compress
        compressed_data, algorithm = DocumentCompressor.compress(original_data, document.file_type or '')

        # 3. Upload compressed bytes back to the same key (overwrites the original)
        compressed_size = len(compressed_data)
        new_checksum = hashlib.sha256(compressed_data).hexdigest()
        new_etag = storage.replace_object(
            bucket=bucket,
            object_key=document.minio_object_key,
            data=compressed_data,
            mime_type=document.file_type or 'application/octet-stream',
            metadata={
                'original-size': str(original_size),
                'compression-algorithm': algorithm,
                'compressed-at': timezone.now().isoformat(),
            },
        )

        if not new_etag.get('success'):
            raise RuntimeError(f"MinIO replace failed: {new_etag.get('error')}")

        # 4. Persist compression metadata (use update() to avoid triggering signals again)
        Document.objects.filter(pk=document.pk).update(
            compression_status=Document.CompressionStatus.COMPRESSED,
            original_size=original_size,
            file_size=compressed_size,
            compression_algorithm=algorithm,
            compression_ratio=round(compressed_size / original_size, 4),
            compressed_at=timezone.now(),
            checksum=new_checksum,
            minio_etag=new_etag.get('etag', ''),
        )

        savings_pct = (1 - compressed_size / original_size) * 100
        logger.info(
            "Document %s compressed: %d → %d bytes (%.1f%% saved) via %s",
            document_id, original_size, compressed_size, savings_pct, algorithm,
        )
        return {
            'success': True,
            'algorithm': algorithm,
            'original_size': original_size,
            'compressed_size': compressed_size,
            'savings_pct': round(savings_pct, 1),
        }

    except CompressionSkipped as e:
        logger.info("Document %s compression skipped: %s", document_id, e)
        Document.objects.filter(pk=document.pk).update(
            compression_status=Document.CompressionStatus.SKIPPED,
            original_size=document.file_size,
        )
        return {'success': True, 'message': str(e), 'skipped': True}

    except Exception as exc:
        logger.error("Document %s compression failed: %s", document_id, exc, exc_info=True)
        if self.request.retries < self.max_retries:
            # Reset to PENDING so the idempotency guard lets the retry through
            Document.objects.filter(pk=document.pk).update(
                compression_status=Document.CompressionStatus.PENDING,
            )
        else:
            Document.objects.filter(pk=document.pk).update(
                compression_status=Document.CompressionStatus.FAILED,
            )
        raise self.retry(exc=exc)
