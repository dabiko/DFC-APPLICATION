"""
Elasticsearch document definitions for full-text search.

This module defines the Elasticsearch index structure and mappings
for the Document model, enabling fast full-text search across
document content, metadata, and related fields.
"""

from django_elasticsearch_dsl import Document, Index, fields
from django_elasticsearch_dsl.registries import registry
from apps.documents.models import Document as DocModel
from apps.users.models import CustomUser, Department
from apps.folders.models import Folder


# Define the documents index
documents_index = Index('documents')

# Configure index settings for optimal performance
documents_index.settings(
    # Shard configuration for scalability
    # 3 shards allows horizontal scaling and parallel query execution
    number_of_shards=3,
    # 1 replica for high availability and load distribution
    number_of_replicas=1,

    # Refresh interval - how often index is refreshed
    # Higher value = better indexing performance, slight search delay
    refresh_interval='5s',

    # Maximum result window for pagination
    max_result_window=50000,

    # Additional performance settings as a settings dict
    settings={
        'index.number_of_routing_shards': 6,  # For future split operations
        'index.codec': 'best_compression',  # Compress stored fields
        'index.translog.durability': 'async',  # Better performance
        'index.translog.sync_interval': '5s',
    },

    analysis={
        'analyzer': {
            # Custom analyzer for full-text search with stemming
            'custom_text_analyzer': {
                'type': 'custom',
                'tokenizer': 'standard',
                'filter': [
                    'lowercase',
                    'asciifolding',  # Convert accented characters
                    'stop',  # Remove common words
                    'snowball'  # Stemming for better matching
                ]
            },
            # Edge n-gram analyzer for autocomplete
            'edge_ngram_analyzer': {
                'type': 'custom',
                'tokenizer': 'edge_ngram_tokenizer',
                'filter': ['lowercase', 'asciifolding']
            },
            # Keyword analyzer for exact matches
            'keyword_lowercase': {
                'type': 'custom',
                'tokenizer': 'keyword',
                'filter': ['lowercase']
            }
        },
        'tokenizer': {
            'edge_ngram_tokenizer': {
                'type': 'edge_ngram',
                'min_gram': 2,
                'max_gram': 10,
                'token_chars': ['letter', 'digit']
            }
        },
        'normalizer': {
            # Normalizer for keyword fields (lowercase without tokenization)
            'lowercase': {
                'type': 'custom',
                'filter': ['lowercase', 'asciifolding']
            }
        }
    }
)


@registry.register_document
@documents_index.doc_type
class DocumentDocument(Document):
    """
    Elasticsearch document for Document model.

    Provides full-text search capabilities across:
    - Document title and filename
    - Extracted text content (from PDFs, Word docs, etc.)
    - Metadata fields (type, identifier, creator)
    - Related entities (owner, department, folder)
    - Tags

    Features:
    - Multi-field analysis for different search types
    - Nested object support for related models
    - Efficient filtering on keyword fields
    - Full-text search with stemming and stop words
    """

    # ========================================
    # Primary searchable fields
    # ========================================

    id = fields.KeywordField()

    # Title with multiple analyzers for different search types
    title = fields.TextField(
        analyzer='custom_text_analyzer',
        fields={
            'raw': fields.KeywordField(),  # For exact matching and sorting
            'suggest': fields.TextField(analyzer='edge_ngram_analyzer'),  # For autocomplete
        }
    )

    # File name with similar multi-field setup
    file_name = fields.TextField(
        analyzer='custom_text_analyzer',
        fields={
            'raw': fields.KeywordField(),
            'suggest': fields.TextField(analyzer='edge_ngram_analyzer'),
        }
    )

    # Full-text content extracted from document
    extracted_text = fields.TextField(
        analyzer='custom_text_analyzer',
        term_vector='with_positions_offsets',  # Enable highlighting
    )

    # ========================================
    # Metadata fields (for filtering and aggregations)
    # ========================================

    # Keyword fields are optimized for filtering and aggregations
    document_type = fields.KeywordField(normalizer='lowercase')
    identifier = fields.KeywordField(normalizer='lowercase')
    confidentiality_level = fields.KeywordField(normalizer='lowercase')
    document_date = fields.DateField(format='yyyy-MM-dd||yyyy/MM/dd||epoch_millis')

    file_type = fields.KeywordField(normalizer='lowercase')
    file_size = fields.LongField(index=True)  # Enable range queries

    creator_source = fields.TextField(
        analyzer='custom_text_analyzer',
        fields={'raw': fields.KeywordField()}
    )

    # ========================================
    # Related object fields (nested)
    # ========================================

    owner = fields.ObjectField(properties={
        'id': fields.KeywordField(),
        'username': fields.KeywordField(),
        'email': fields.TextField(
            fields={'raw': fields.KeywordField()}
        ),
        'first_name': fields.TextField(analyzer='custom_text_analyzer'),
        'last_name': fields.TextField(analyzer='custom_text_analyzer'),
    })

    department = fields.ObjectField(properties={
        'id': fields.IntegerField(),
        'name': fields.TextField(
            analyzer='custom_text_analyzer',
            fields={'raw': fields.KeywordField()}
        ),
        'code': fields.KeywordField(),
    })

    folder = fields.ObjectField(properties={
        'id': fields.KeywordField(),
        'name': fields.TextField(
            analyzer='custom_text_analyzer',
            fields={'raw': fields.KeywordField()}
        ),
        'path': fields.TextField(
            analyzer='keyword_lowercase',
            fields={'raw': fields.KeywordField()}
        ),
    })

    # ========================================
    # Tags (multi-value keyword field)
    # ========================================

    tags = fields.KeywordField(multi=True)

    # ========================================
    # Additional metadata
    # ========================================

    version_number = fields.IntegerField()
    retention_period_years = fields.IntegerField()

    # Timestamps
    created_at = fields.DateField()
    updated_at = fields.DateField()

    # Boolean flags
    is_deleted = fields.BooleanField()
    is_indexed = fields.BooleanField()

    # OCR metadata
    ocr_confidence = fields.FloatField()

    # Thumbnail/PDF paths
    thumbnail_path = fields.KeywordField()
    pdf_version_path = fields.KeywordField()

    class Django:
        """
        Django model configuration.
        """
        model = DocModel  # The Django model to index

        # Fields to index automatically from model
        fields = []  # We've defined all fields explicitly above

        # Related models that trigger re-indexing
        related_models = [CustomUser, Department, Folder]

        # Query to filter which documents to index (exclude soft-deleted)
        queryset_pagination = 100  # Batch size for bulk indexing

    def get_queryset(self):
        """
        Get queryset for indexing.
        Only index non-deleted documents.
        """
        return super().get_queryset().filter(is_deleted=False)

    def get_instances_from_related(self, related_instance):
        """
        Update document index when related models change.

        When a User, Department, or Folder is updated, re-index
        all documents that reference them.

        Args:
            related_instance: The related model instance that changed

        Returns:
            QuerySet of Document instances to re-index
        """
        if isinstance(related_instance, CustomUser):
            # Re-index documents owned by this user
            return related_instance.owned_documents.filter(is_deleted=False)

        elif isinstance(related_instance, Department):
            # Re-index documents in this department
            return related_instance.documents.filter(is_deleted=False)

        elif isinstance(related_instance, Folder):
            # Re-index documents in this folder
            return related_instance.documents.filter(is_deleted=False)

        return None

    def prepare_owner(self, instance):
        """
        Prepare owner data for indexing.

        Extracts relevant user information for search and filtering.
        """
        if instance.owner:
            return {
                'id': str(instance.owner.id),
                'username': instance.owner.username,
                'email': instance.owner.email,
                'first_name': instance.owner.first_name or '',
                'last_name': instance.owner.last_name or '',
            }
        return None

    def prepare_department(self, instance):
        """
        Prepare department data for indexing.
        """
        if instance.department:
            return {
                'id': instance.department.id,
                'name': instance.department.name,
                'code': instance.department.code,
            }
        return None

    def prepare_folder(self, instance):
        """
        Prepare folder data for indexing.
        """
        if instance.folder:
            return {
                'id': str(instance.folder.id),
                'name': instance.folder.name,
                'path': instance.folder.path or '',
            }
        return None

    def prepare_tags(self, instance):
        """
        Prepare tags for indexing.

        Extract tag names from the many-to-many relationship.
        """
        # Get all tag names associated with this document
        return [
            doc_tag.tag.name
            for doc_tag in instance.document_tags.all()
        ]
