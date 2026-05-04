"""
Management command to rebuild Elasticsearch indices.

This command performs a full re-indexing of all documents in the system,
useful for:
- Initial setup
- After Elasticsearch schema changes
- Recovery from index corruption
- Performance optimization (index defragmentation)

Usage:
    python manage.py rebuild_index               # Rebuild all indices
    python manage.py rebuild_index --delete      # Delete indices before rebuilding
    python manage.py rebuild_index --populate    # Only populate, don't recreate
    python manage.py rebuild_index --parallel 4  # Use 4 parallel workers
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django_elasticsearch_dsl.registries import registry
from elasticsearch.exceptions import ConnectionError as ESConnectionError
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Rebuild Elasticsearch indices for all registered documents'

    def add_arguments(self, parser):
        """
        Add command-line arguments.
        """
        parser.add_argument(
            '--delete',
            action='store_true',
            dest='delete',
            default=False,
            help='Delete existing indices before rebuilding'
        )

        parser.add_argument(
            '--create',
            action='store_true',
            dest='create',
            default=False,
            help='Only create indices, do not populate'
        )

        parser.add_argument(
            '--populate',
            action='store_true',
            dest='populate',
            default=False,
            help='Only populate indices, do not recreate'
        )

        parser.add_argument(
            '--models',
            metavar='app[.model]',
            type=str,
            nargs='*',
            dest='models',
            help='Specify which models to index (e.g., documents.Document)'
        )

        parser.add_argument(
            '--parallel',
            type=int,
            dest='parallel',
            default=0,
            help='Number of parallel indexing workers (0 = sequential)'
        )

        parser.add_argument(
            '--batch-size',
            type=int,
            dest='batch_size',
            default=500,
            help='Number of documents to index per batch (default: 500)'
        )

        parser.add_argument(
            '--force',
            action='store_true',
            dest='force',
            default=False,
            help='Force rebuild without confirmation'
        )

    def handle(self, *args, **options):
        """
        Execute the command.
        """
        # Validate Elasticsearch connection
        if not self._check_elasticsearch_connection():
            raise CommandError(
                'Cannot connect to Elasticsearch. '
                f'Check ELASTICSEARCH_DSL settings: {settings.ELASTICSEARCH_DSL}'
            )

        # Get options
        delete = options['delete']
        create = options['create']
        populate = options['populate']
        force = options['force']
        parallel = options['parallel']
        batch_size = options['batch_size']
        models = options.get('models', [])

        # Determine operation mode
        if create and populate:
            raise CommandError('Cannot use both --create and --populate options')

        if not (create or populate):
            # Default: full rebuild (delete + create + populate)
            delete = True
            create = True
            populate = True
        elif create:
            delete = True
            populate = False
        elif populate:
            delete = False
            create = False

        # Confirmation prompt (unless --force)
        if delete and not force:
            self.stdout.write(
                self.style.WARNING(
                    '\nWARNING: This will delete and rebuild Elasticsearch indices.'
                )
            )
            response = input('Are you sure you want to continue? [y/N] ')
            if response.lower() != 'y':
                self.stdout.write(self.style.NOTICE('Operation cancelled.'))
                return

        # Get indices to rebuild
        indices = registry.get_indices(models)

        self.stdout.write(
            self.style.SUCCESS(f'\n{"=" * 70}')
        )
        self.stdout.write(
            self.style.SUCCESS('Elasticsearch Index Rebuild')
        )
        self.stdout.write(
            self.style.SUCCESS(f'{"=" * 70}\n')
        )

        # Step 1: Delete indices
        if delete:
            self.stdout.write('Step 1: Deleting existing indices...')
            try:
                deleted_count = 0
                for index in indices:
                    if index.exists():
                        index.delete()
                        deleted_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'  ✓ Deleted index: {index._name}')
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'  - Index does not exist: {index._name}')
                        )

                self.stdout.write(
                    self.style.SUCCESS(f'\nDeleted {deleted_count} indices.\n')
                )
            except Exception as e:
                raise CommandError(f'Failed to delete indices: {e}')

        # Step 2: Create indices
        if create or delete:
            self.stdout.write('Step 2: Creating indices...')
            try:
                created_count = 0
                for index in indices:
                    index.create()
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Created index: {index._name}')
                    )

                self.stdout.write(
                    self.style.SUCCESS(f'\nCreated {created_count} indices.\n')
                )
            except Exception as e:
                raise CommandError(f'Failed to create indices: {e}')

        # Step 3: Populate indices
        if populate:
            self.stdout.write('Step 3: Populating indices with documents...')

            # Get models to index
            index_models = registry.get_models(models)

            if not index_models:
                self.stdout.write(
                    self.style.WARNING('No models found to index.')
                )
                return

            total_indexed = 0

            for model in index_models:
                model_name = f'{model._meta.app_label}.{model._meta.model_name}'
                self.stdout.write(f'\nIndexing {model_name}...')

                try:
                    # Get document count
                    queryset = model.objects.all()
                    if hasattr(model, 'objects'):
                        # Check if model has custom queryset (e.g., exclude deleted)
                        doc_class = registry.get_document(model)
                        if hasattr(doc_class, 'get_queryset'):
                            queryset = doc_class().get_queryset()

                    total = queryset.count()
                    self.stdout.write(f'  Total documents to index: {total}')

                    if total == 0:
                        self.stdout.write(
                            self.style.WARNING('  No documents to index.')
                        )
                        continue

                    # Index documents
                    if parallel > 0:
                        # Parallel indexing
                        self.stdout.write(
                            f'  Using {parallel} parallel workers...'
                        )
                        indexed = registry.update(
                            model,
                            parallel=parallel,
                            queryset_pagination=batch_size
                        )
                    else:
                        # Sequential indexing with progress
                        indexed = 0
                        batch_count = 0
                        for i in range(0, total, batch_size):
                            batch = queryset[i:i + batch_size]
                            registry.update(model, queryset=batch)
                            indexed += len(batch)
                            batch_count += 1

                            # Progress indicator
                            progress = (indexed / total) * 100
                            self.stdout.write(
                                f'  Progress: {indexed}/{total} ({progress:.1f}%)',
                                ending='\r'
                            )

                        self.stdout.write('')  # New line after progress

                    total_indexed += indexed if isinstance(indexed, int) else total

                    self.stdout.write(
                        self.style.SUCCESS(f'  ✓ Indexed {total} documents')
                    )

                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Failed to index {model_name}: {e}')
                    )
                    logger.error(f'Failed to index {model_name}', exc_info=True)

            # Summary
            self.stdout.write(
                self.style.SUCCESS(f'\n{"=" * 70}')
            )
            self.stdout.write(
                self.style.SUCCESS(f'Successfully indexed {total_indexed} total documents')
            )
            self.stdout.write(
                self.style.SUCCESS(f'{"=" * 70}\n')
            )

        # Index health check
        self._display_index_health()

    def _check_elasticsearch_connection(self):
        """
        Check if Elasticsearch is reachable.

        Returns:
            bool: True if connection successful, False otherwise
        """
        try:
            from elasticsearch import Elasticsearch

            es_config = settings.ELASTICSEARCH_DSL['default']
            http_auth = es_config.get('http_auth')
            es = Elasticsearch(
                hosts=es_config['hosts'],
                basic_auth=http_auth if http_auth and http_auth[0] else None,
                request_timeout=5
            )

            # Ping Elasticsearch
            if es.ping():
                return True
            else:
                self.stdout.write(
                    self.style.ERROR('Elasticsearch ping failed')
                )
                return False

        except ESConnectionError as e:
            self.stdout.write(
                self.style.ERROR(f'Cannot connect to Elasticsearch: {e}')
            )
            return False
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Elasticsearch connection error: {e}')
            )
            return False

    def _display_index_health(self):
        """
        Display health information for all indices.
        """
        try:
            from apps.search.utils import get_index_health, get_index_stats

            self.stdout.write('\nIndex Health:')
            self.stdout.write('-' * 70)

            # Cluster health
            health = get_index_health()
            status = health.get('status', 'unknown')

            status_style = {
                'green': self.style.SUCCESS,
                'yellow': self.style.WARNING,
                'red': self.style.ERROR,
            }.get(status, self.style.NOTICE)

            self.stdout.write(
                f'  Cluster Status: {status_style(status.upper())}'
            )
            self.stdout.write(
                f'  Active Shards: {health.get("active_shards", 0)}'
            )
            self.stdout.write(
                f'  Number of Nodes: {health.get("number_of_nodes", 0)}'
            )

            # Index stats
            try:
                stats = get_index_stats()
                if stats and '_all' in stats:
                    indices = stats['_all'].get('primaries', {}).get('docs', {})
                    self.stdout.write(
                        f'  Total Documents: {indices.get("count", 0)}'
                    )
                    deleted = indices.get('deleted', 0)
                    if deleted > 0:
                        self.stdout.write(
                            self.style.WARNING(f'  Deleted Documents: {deleted}')
                        )
            except Exception as e:
                logger.debug(f'Could not get index stats: {e}')

            self.stdout.write('-' * 70)

        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'Could not retrieve index health: {e}')
            )
