"""
Celery tasks for document intelligence processing.
"""
from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_document_intelligence(self, job_id: str):
    """
    Process a document for intelligence extraction.

    This task:
    1. Loads the document and its extracted text
    2. Runs entity extraction
    3. Runs table extraction (if PDF)
    4. Runs key-value extraction
    5. Generates summary
    6. Saves all results to database
    """
    from .models import (
        IntelligenceJob,
        ExtractedEntity,
        ExtractedTable,
        DocumentSummary,
        ExtractedKeyValue,
    )
    from .nlp_engine import DocumentIntelligenceProcessor

    try:
        job = IntelligenceJob.objects.get(id=job_id)
    except IntelligenceJob.DoesNotExist:
        logger.error(f"Job not found: {job_id}")
        return

    # Mark job as started
    job.start()

    try:
        document = job.document
        text = document.extracted_text or ''

        if not text:
            job.fail("No extracted text available for processing")
            return

        # Initialize processor
        processor = DocumentIntelligenceProcessor()

        # Determine what to process based on job type
        process_entities = job.job_type in [
            IntelligenceJob.JobType.FULL,
            IntelligenceJob.JobType.ENTITIES
        ]
        process_tables = job.job_type in [
            IntelligenceJob.JobType.FULL,
            IntelligenceJob.JobType.TABLES
        ]
        process_key_values = job.job_type in [
            IntelligenceJob.JobType.FULL,
            IntelligenceJob.JobType.KEY_VALUES
        ]
        process_summary = job.job_type in [
            IntelligenceJob.JobType.FULL,
            IntelligenceJob.JobType.SUMMARY
        ]

        # Get configuration
        config = job.config or {}

        # Process entities
        if process_entities:
            job.update_progress(10, 'Extracting entities...')

            results = processor.nlp_engine.extract_entities(
                text,
                entity_types=config.get('entity_types'),
                min_confidence=config.get('entity_confidence', 0.6)
            )

            # Clear existing entities for this document
            ExtractedEntity.objects.filter(document=document).delete()

            # Save new entities
            entities_to_create = []
            for entity in results:
                entities_to_create.append(ExtractedEntity(
                    document=document,
                    entity_type=entity.entity_type,
                    value=entity.value,
                    normalized_value=entity.normalized_value,
                    start_position=entity.start_position,
                    end_position=entity.end_position,
                    page_number=entity.page_number,
                    context=entity.context,
                    confidence_score=entity.confidence_score,
                    extraction_method=entity.extraction_method,
                ))

            ExtractedEntity.objects.bulk_create(entities_to_create)
            job.entities_found = len(entities_to_create)

        # Process tables
        if process_tables:
            job.update_progress(30, 'Extracting tables...')

            # Try text-based extraction first
            table_results = processor.table_extractor.extract_tables_from_text(text)

            # Clear existing tables
            ExtractedTable.objects.filter(document=document).delete()

            # Save new tables
            for table in table_results:
                ExtractedTable.objects.create(
                    document=document,
                    table_number=table.table_number,
                    title=table.title,
                    headers=table.headers,
                    rows=table.rows,
                    row_count=len(table.rows),
                    column_count=len(table.headers),
                    page_number=table.page_number,
                    confidence_score=table.confidence_score,
                    table_type=table.table_type,
                    raw_markdown=table.raw_markdown,
                    has_merged_cells=table.has_merged_cells,
                )

            job.tables_found = len(table_results)

        # Process key-values
        if process_key_values:
            job.update_progress(50, 'Extracting key-value pairs...')

            kv_results = processor.nlp_engine.extract_key_values(
                text,
                document_type=document.document_type,
                min_confidence=config.get('kv_confidence', 0.6)
            )

            # Clear existing key-values
            ExtractedKeyValue.objects.filter(document=document).delete()

            # Save new key-values
            kvs_to_create = []
            for kv in kv_results:
                kvs_to_create.append(ExtractedKeyValue(
                    document=document,
                    key=kv.key,
                    value=kv.value,
                    normalized_key=kv.normalized_key,
                    normalized_value=kv.normalized_value,
                    value_type=kv.value_type,
                    page_number=kv.page_number,
                    confidence_score=kv.confidence_score,
                    group_name=kv.group_name,
                    group_order=kv.group_order,
                ))

            ExtractedKeyValue.objects.bulk_create(kvs_to_create)
            job.key_values_found = len(kvs_to_create)

        # Generate summary
        if process_summary:
            job.update_progress(70, 'Generating summary...')

            summary_type = config.get('summary_type', 'STANDARD')
            max_length = config.get('max_summary_length', 500)

            summary_result = processor.nlp_engine.summarize(
                text,
                summary_type=summary_type,
                max_length=max_length
            )

            # Get or create summary
            summary, created = DocumentSummary.objects.update_or_create(
                document=document,
                summary_type=summary_type,
                defaults={
                    'summary_text': summary_result.summary_text,
                    'key_points': summary_result.key_points,
                    'topics': summary_result.topics,
                    'sentiment': summary_result.sentiment,
                    'sentiment_score': summary_result.sentiment_score,
                    'word_count': summary_result.word_count,
                    'compression_ratio': summary_result.compression_ratio,
                    'model_used': 'extractive',
                }
            )

            job.summaries_generated = 1

        # Complete job
        job.complete()
        logger.info(
            f"Completed intelligence job {job_id}: "
            f"{job.entities_found} entities, {job.tables_found} tables, "
            f"{job.key_values_found} key-values, {job.summaries_generated} summaries"
        )

    except Exception as e:
        logger.exception(f"Intelligence job failed: {job_id}")
        job.fail(str(e), {'exception': type(e).__name__})

        # Retry for transient errors
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))


@shared_task
def batch_process_documents(document_ids: list, job_type: str = 'FULL', config: dict = None):
    """
    Process multiple documents in batch.

    Args:
        document_ids: List of document UUIDs to process
        job_type: Type of processing (FULL, ENTITIES, etc.)
        config: Processing configuration
    """
    from .models import IntelligenceJob
    from apps.documents.models import Document

    config = config or {}
    jobs_created = 0

    for doc_id in document_ids:
        try:
            document = Document.objects.get(id=doc_id)

            # Create job
            job = IntelligenceJob.objects.create(
                document=document,
                job_type=job_type,
                config=config,
            )

            # Queue processing
            process_document_intelligence.delay(str(job.id))
            jobs_created += 1

        except Document.DoesNotExist:
            logger.warning(f"Document not found: {doc_id}")
        except Exception as e:
            logger.error(f"Failed to queue document {doc_id}: {e}")

    logger.info(f"Batch processing queued: {jobs_created}/{len(document_ids)} jobs created")
    return jobs_created


@shared_task
def cleanup_old_jobs(days: int = 30):
    """
    Clean up old completed intelligence jobs.

    Args:
        days: Number of days to retain jobs
    """
    from .models import IntelligenceJob
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=days)

    deleted, _ = IntelligenceJob.objects.filter(
        status__in=[
            IntelligenceJob.JobStatus.COMPLETED,
            IntelligenceJob.JobStatus.FAILED,
            IntelligenceJob.JobStatus.CANCELLED,
        ],
        created_at__lt=cutoff
    ).delete()

    logger.info(f"Cleaned up {deleted} old intelligence jobs")
    return deleted


@shared_task
def auto_process_new_documents():
    """
    Automatically process documents that haven't been analyzed.

    Runs periodically to catch documents that need processing.
    """
    from .models import IntelligenceJob, IntelligenceSettings
    from apps.documents.models import Document

    settings = IntelligenceSettings.get_settings()

    if not settings.auto_process_on_upload:
        return 0

    # Find documents with extracted text but no intelligence jobs
    processed_doc_ids = IntelligenceJob.objects.values_list('document_id', flat=True)

    documents = Document.objects.filter(
        extracted_text__isnull=False,
    ).exclude(
        extracted_text=''
    ).exclude(
        id__in=processed_doc_ids
    )

    # Filter by document types if configured
    if settings.process_document_types:
        documents = documents.filter(document_type__in=settings.process_document_types)

    # Limit batch size
    documents = documents[:settings.batch_size]

    jobs_created = 0
    for document in documents:
        try:
            job = IntelligenceJob.objects.create(
                document=document,
                job_type=IntelligenceJob.JobType.FULL,
            )
            process_document_intelligence.delay(str(job.id))
            jobs_created += 1
        except Exception as e:
            logger.error(f"Failed to auto-process document {document.id}: {e}")

    logger.info(f"Auto-processed {jobs_created} documents")
    return jobs_created
