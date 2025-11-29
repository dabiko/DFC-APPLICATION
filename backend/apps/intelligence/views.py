"""
Views for Document Intelligence API.

Provides endpoints for:
- Processing documents for intelligence extraction
- Viewing extracted entities, tables, summaries
- Managing intelligence jobs
- Statistics and analytics
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.db.models import Count, Avg
from django.utils import timezone
from datetime import timedelta
import logging

from apps.documents.models import Document
from .models import (
    ExtractedEntity,
    ExtractedTable,
    DocumentSummary,
    ExtractedKeyValue,
    IntelligenceJob,
    IntelligenceSettings,
)
from .serializers import (
    ExtractedEntitySerializer,
    ExtractedEntityListSerializer,
    ExtractedTableSerializer,
    ExtractedTableListSerializer,
    DocumentSummarySerializer,
    ExtractedKeyValueSerializer,
    ExtractedKeyValueListSerializer,
    IntelligenceJobSerializer,
    IntelligenceSettingsSerializer,
    ProcessDocumentRequestSerializer,
    BatchProcessRequestSerializer,
    VerifyEntityRequestSerializer,
    RateSummaryRequestSerializer,
    DocumentIntelligenceResponseSerializer,
    IntelligenceStatsSerializer,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Entity ViewSet
# =============================================================================

class ExtractedEntityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing extracted entities.

    Endpoints:
    - GET /entities/ - List all entities
    - GET /entities/{id}/ - Get entity details
    - POST /entities/{id}/verify/ - Verify an entity
    - GET /entities/by_document/{doc_id}/ - Get entities for a document
    - GET /entities/by_type/{type}/ - Get entities by type
    """
    serializer_class = ExtractedEntitySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ExtractedEntity.objects.select_related('document', 'verified_by')

        # Filter by document
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        # Filter by entity type
        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)

        # Filter by verification status
        is_verified = self.request.query_params.get('is_verified')
        if is_verified is not None:
            queryset = queryset.filter(is_verified=is_verified.lower() == 'true')

        # Filter by minimum confidence
        min_confidence = self.request.query_params.get('min_confidence')
        if min_confidence:
            queryset = queryset.filter(confidence_score__gte=float(min_confidence))

        return queryset.order_by('-confidence_score')

    def get_serializer_class(self):
        if self.action == 'list':
            return ExtractedEntityListSerializer
        return ExtractedEntitySerializer

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify or correct an extracted entity."""
        entity = self.get_object()
        serializer = VerifyEntityRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        corrected_value = serializer.validated_data.get('corrected_value')

        entity.is_verified = True
        entity.verified_by = request.user
        entity.verified_at = timezone.now()

        if corrected_value:
            entity.value = corrected_value

        entity.save()

        return Response(ExtractedEntitySerializer(entity).data)

    @action(detail=False, methods=['get'], url_path='by_document/(?P<doc_id>[^/.]+)')
    def by_document(self, request, doc_id=None):
        """Get all entities for a specific document."""
        entities = self.get_queryset().filter(document_id=doc_id)
        serializer = ExtractedEntityListSerializer(entities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by_type/(?P<entity_type>[^/.]+)')
    def by_type(self, request, entity_type=None):
        """Get all entities of a specific type."""
        entities = self.get_queryset().filter(entity_type=entity_type.upper())
        serializer = ExtractedEntityListSerializer(entities, many=True)
        return Response(serializer.data)


# =============================================================================
# Table ViewSet
# =============================================================================

class ExtractedTableViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing extracted tables.

    Endpoints:
    - GET /tables/ - List all tables
    - GET /tables/{id}/ - Get table details
    - GET /tables/{id}/export/ - Export table as CSV/JSON
    """
    serializer_class = ExtractedTableSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ExtractedTable.objects.select_related('document', 'verified_by')

        # Filter by document
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        # Filter by table type
        table_type = self.request.query_params.get('table_type')
        if table_type:
            queryset = queryset.filter(table_type=table_type)

        return queryset.order_by('document', 'table_number')

    def get_serializer_class(self):
        if self.action == 'list':
            return ExtractedTableListSerializer
        return ExtractedTableSerializer

    @action(detail=True, methods=['get'])
    def export(self, request, pk=None):
        """Export table in various formats."""
        table = self.get_object()
        format_type = request.query_params.get('format', 'json')

        if format_type == 'csv':
            import csv
            from django.http import HttpResponse

            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="table_{table.table_number}.csv"'

            writer = csv.writer(response)
            writer.writerow(table.headers)
            for row in table.rows:
                writer.writerow(row)

            return response

        elif format_type == 'markdown':
            return Response({'markdown': table.raw_markdown})

        else:  # JSON
            return Response({
                'headers': table.headers,
                'rows': table.rows,
            })


# =============================================================================
# Summary ViewSet
# =============================================================================

class DocumentSummaryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing document summaries.

    Endpoints:
    - GET /summaries/ - List all summaries
    - GET /summaries/{id}/ - Get summary details
    - POST /summaries/{id}/rate/ - Rate a summary
    """
    serializer_class = DocumentSummarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = DocumentSummary.objects.select_related('document', 'rated_by')

        # Filter by document
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        # Filter by summary type
        summary_type = self.request.query_params.get('summary_type')
        if summary_type:
            queryset = queryset.filter(summary_type=summary_type.upper())

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        """Rate a summary."""
        summary = self.get_object()
        serializer = RateSummaryRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        summary.user_rating = serializer.validated_data['rating']
        summary.user_feedback = serializer.validated_data.get('feedback', '')
        summary.rated_by = request.user
        summary.save()

        return Response(DocumentSummarySerializer(summary).data)


# =============================================================================
# Key-Value ViewSet
# =============================================================================

class ExtractedKeyValueViewSet(viewsets.ModelViewSet):
    """ViewSet for managing extracted key-value pairs."""
    serializer_class = ExtractedKeyValueSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ExtractedKeyValue.objects.select_related('document', 'verified_by')

        # Filter by document
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        # Filter by group
        group_name = self.request.query_params.get('group_name')
        if group_name:
            queryset = queryset.filter(group_name=group_name)

        return queryset.order_by('document', 'group_name', 'group_order')

    def get_serializer_class(self):
        if self.action == 'list':
            return ExtractedKeyValueListSerializer
        return ExtractedKeyValueSerializer


# =============================================================================
# Intelligence Job ViewSet
# =============================================================================

class IntelligenceJobViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing intelligence processing jobs.

    Endpoints:
    - GET /jobs/ - List all jobs
    - POST /jobs/ - Create a new job
    - GET /jobs/{id}/ - Get job status
    - POST /jobs/{id}/cancel/ - Cancel a job
    """
    serializer_class = IntelligenceJobSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = IntelligenceJob.objects.select_related('document', 'created_by')

        # Filter by document
        document_id = self.request.query_params.get('document_id')
        if document_id:
            queryset = queryset.filter(document_id=document_id)

        # Filter by status
        job_status = self.request.query_params.get('status')
        if job_status:
            queryset = queryset.filter(status=job_status.upper())

        # Filter by job type
        job_type = self.request.query_params.get('job_type')
        if job_type:
            queryset = queryset.filter(job_type=job_type.upper())

        return queryset.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        """Create a new intelligence processing job."""
        serializer = ProcessDocumentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_id = serializer.validated_data['document_id']
        job_type = serializer.validated_data['job_type']
        config = serializer.validated_data.get('config', {})

        # Verify document exists
        try:
            document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create job
        job = IntelligenceJob.objects.create(
            document=document,
            job_type=job_type,
            config=config,
            created_by=request.user,
        )

        # Queue the job for processing (Celery task)
        try:
            from .tasks import process_document_intelligence
            process_document_intelligence.delay(str(job.id))
        except Exception as e:
            logger.warning(f"Could not queue job: {e}")

        return Response(
            IntelligenceJobSerializer(job).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending or processing job."""
        job = self.get_object()

        if job.status not in [IntelligenceJob.JobStatus.PENDING, IntelligenceJob.JobStatus.PROCESSING]:
            return Response(
                {'error': 'Can only cancel pending or processing jobs'},
                status=status.HTTP_400_BAD_REQUEST
            )

        job.status = IntelligenceJob.JobStatus.CANCELLED
        job.save()

        return Response(IntelligenceJobSerializer(job).data)


# =============================================================================
# Document Intelligence View
# =============================================================================

class DocumentIntelligenceView(APIView):
    """
    Get all intelligence data for a document.

    GET /intelligence/document/{doc_id}/
    POST /intelligence/document/{doc_id}/process/ - Trigger processing
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, doc_id):
        """Get all extracted intelligence for a document."""
        try:
            document = Document.objects.get(id=doc_id)
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all intelligence data
        entities = ExtractedEntity.objects.filter(document=document)
        tables = ExtractedTable.objects.filter(document=document)
        key_values = ExtractedKeyValue.objects.filter(document=document)
        summary = DocumentSummary.objects.filter(document=document).first()
        latest_job = IntelligenceJob.objects.filter(document=document).first()

        data = {
            'document_id': str(document.id),
            'entities': ExtractedEntityListSerializer(entities, many=True).data,
            'tables': ExtractedTableListSerializer(tables, many=True).data,
            'key_values': ExtractedKeyValueListSerializer(key_values, many=True).data,
            'summary': DocumentSummarySerializer(summary).data if summary else None,
            'processing_job': IntelligenceJobSerializer(latest_job).data if latest_job else None,
        }

        return Response(data)

    def post(self, request, doc_id):
        """Trigger intelligence processing for a document."""
        try:
            document = Document.objects.get(id=doc_id)
        except Document.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        job_type = request.data.get('job_type', IntelligenceJob.JobType.FULL)
        config = request.data.get('config', {})

        # Create job
        job = IntelligenceJob.objects.create(
            document=document,
            job_type=job_type,
            config=config,
            created_by=request.user,
        )

        # Queue the job
        try:
            from .tasks import process_document_intelligence
            process_document_intelligence.delay(str(job.id))
        except Exception as e:
            logger.warning(f"Could not queue job: {e}")

        return Response(
            IntelligenceJobSerializer(job).data,
            status=status.HTTP_201_CREATED
        )


# =============================================================================
# Batch Processing View
# =============================================================================

class BatchProcessView(APIView):
    """Batch process multiple documents."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Create batch processing jobs."""
        serializer = BatchProcessRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document_ids = serializer.validated_data['document_ids']
        job_type = serializer.validated_data['job_type']
        config = serializer.validated_data.get('config', {})

        jobs = []
        for doc_id in document_ids:
            try:
                document = Document.objects.get(id=doc_id)
                job = IntelligenceJob.objects.create(
                    document=document,
                    job_type=job_type,
                    config=config,
                    created_by=request.user,
                )
                jobs.append(job)

                # Queue the job
                try:
                    from .tasks import process_document_intelligence
                    process_document_intelligence.delay(str(job.id))
                except Exception as e:
                    logger.warning(f"Could not queue job: {e}")

            except Document.DoesNotExist:
                continue

        return Response({
            'jobs_created': len(jobs),
            'jobs': IntelligenceJobSerializer(jobs, many=True).data,
        }, status=status.HTTP_201_CREATED)


# =============================================================================
# Statistics View
# =============================================================================

class IntelligenceStatsView(APIView):
    """Get intelligence processing statistics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get overall intelligence statistics."""
        today = timezone.now().date()
        today_start = timezone.make_aware(
            timezone.datetime.combine(today, timezone.datetime.min.time())
        )

        # Get counts
        total_entities = ExtractedEntity.objects.count()
        total_tables = ExtractedTable.objects.count()
        total_summaries = DocumentSummary.objects.count()

        # Documents with any intelligence
        docs_with_entities = ExtractedEntity.objects.values('document').distinct().count()
        docs_with_tables = ExtractedTable.objects.values('document').distinct().count()
        docs_with_summaries = DocumentSummary.objects.values('document').distinct().count()

        total_docs_processed = max(docs_with_entities, docs_with_tables, docs_with_summaries)

        # Entities by type
        entities_by_type = dict(
            ExtractedEntity.objects.values('entity_type')
            .annotate(count=Count('id'))
            .values_list('entity_type', 'count')
        )

        # Average confidence
        avg_confidence = ExtractedEntity.objects.aggregate(
            avg=Avg('confidence_score')
        )['avg'] or 0

        # Job stats
        jobs_pending = IntelligenceJob.objects.filter(
            status=IntelligenceJob.JobStatus.PENDING
        ).count()

        jobs_processing = IntelligenceJob.objects.filter(
            status=IntelligenceJob.JobStatus.PROCESSING
        ).count()

        jobs_completed_today = IntelligenceJob.objects.filter(
            status=IntelligenceJob.JobStatus.COMPLETED,
            completed_at__gte=today_start
        ).count()

        jobs_failed_today = IntelligenceJob.objects.filter(
            status=IntelligenceJob.JobStatus.FAILED,
            completed_at__gte=today_start
        ).count()

        data = {
            'total_documents_processed': total_docs_processed,
            'total_entities_extracted': total_entities,
            'total_tables_extracted': total_tables,
            'total_summaries_generated': total_summaries,
            'entities_by_type': entities_by_type,
            'average_confidence': round(avg_confidence, 3),
            'jobs_pending': jobs_pending,
            'jobs_processing': jobs_processing,
            'jobs_completed_today': jobs_completed_today,
            'jobs_failed_today': jobs_failed_today,
        }

        return Response(data)


# =============================================================================
# Settings View
# =============================================================================

class IntelligenceSettingsView(APIView):
    """Manage intelligence settings."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current settings."""
        settings = IntelligenceSettings.get_settings()
        return Response(IntelligenceSettingsSerializer(settings).data)

    def patch(self, request):
        """Update settings."""
        settings = IntelligenceSettings.get_settings()
        serializer = IntelligenceSettingsSerializer(
            settings,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(serializer.data)
