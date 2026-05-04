"""
Elasticsearch utility functions for index management and monitoring.

Provides helper functions for:
- Checking cluster and index health
- Getting index statistics
- Performing administrative tasks
- Monitoring search performance
"""

from elasticsearch import Elasticsearch
from elasticsearch.exceptions import ConnectionError, NotFoundError
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def get_elasticsearch_client():
    """
    Get configured Elasticsearch client.

    Returns:
        Elasticsearch: Configured ES client instance

    Raises:
        ConnectionError: If cannot connect to Elasticsearch
    """
    try:
        es_config = settings.ELASTICSEARCH_DSL['default']

        # Extract connection parameters
        hosts = es_config['hosts']
        http_auth = es_config.get('http_auth')
        request_timeout = es_config.get('request_timeout', es_config.get('timeout', 30))

        # Create client
        es = Elasticsearch(
            hosts=hosts,
            basic_auth=http_auth if http_auth and http_auth[0] else None,
            request_timeout=request_timeout,
            max_retries=es_config.get('max_retries', 3),
            retry_on_timeout=es_config.get('retry_on_timeout', True),
        )

        # Verify connection
        if not es.ping():
            raise ConnectionError('Elasticsearch ping failed')

        return es

    except Exception as e:
        logger.error(f'Failed to create Elasticsearch client: {e}', exc_info=True)
        raise


def get_cluster_health():
    """
    Get Elasticsearch cluster health information.

    Returns:
        dict: Cluster health data including:
            - status: 'green', 'yellow', or 'red'
            - number_of_nodes: Number of nodes in cluster
            - active_shards: Number of active shards
            - relocating_shards: Number of shards being relocated
            - initializing_shards: Number of shards being initialized
            - unassigned_shards: Number of unassigned shards
            - active_primary_shards: Number of active primary shards

    Example:
        >>> health = get_cluster_health()
        >>> print(health['status'])
        'green'
    """
    try:
        es = get_elasticsearch_client()
        health = es.cluster.health()

        return {
            'status': health.get('status'),
            'cluster_name': health.get('cluster_name'),
            'number_of_nodes': health.get('number_of_nodes'),
            'number_of_data_nodes': health.get('number_of_data_nodes'),
            'active_primary_shards': health.get('active_primary_shards'),
            'active_shards': health.get('active_shards'),
            'relocating_shards': health.get('relocating_shards'),
            'initializing_shards': health.get('initializing_shards'),
            'unassigned_shards': health.get('unassigned_shards'),
            'delayed_unassigned_shards': health.get('delayed_unassigned_shards'),
            'number_of_pending_tasks': health.get('number_of_pending_tasks'),
            'number_of_in_flight_fetch': health.get('number_of_in_flight_fetch'),
            'task_max_waiting_in_queue_millis': health.get('task_max_waiting_in_queue_millis'),
            'active_shards_percent_as_number': health.get('active_shards_percent_as_number'),
        }

    except Exception as e:
        logger.error(f'Failed to get cluster health: {e}', exc_info=True)
        return {
            'status': 'unknown',
            'error': str(e)
        }


def get_index_health(index_name='documents'):
    """
    Get health information for a specific index.

    Args:
        index_name (str): Name of the index to check (default: 'documents')

    Returns:
        dict: Index health information

    Alias for get_cluster_health (cluster health encompasses all indices)
    """
    return get_cluster_health()


def get_index_stats(index_name='documents'):
    """
    Get detailed statistics for an index.

    Args:
        index_name (str): Name of the index (default: 'documents')

    Returns:
        dict: Index statistics including:
            - Document counts
            - Storage size
            - Indexing rates
            - Search rates
            - Query performance

    Example:
        >>> stats = get_index_stats('documents')
        >>> print(stats['_all']['primaries']['docs']['count'])
        1500
    """
    try:
        es = get_elasticsearch_client()

        # Get index statistics
        stats = es.indices.stats(index=index_name)

        return stats

    except NotFoundError:
        logger.warning(f'Index {index_name} not found')
        return {
            'error': 'Index not found',
            'index': index_name
        }
    except Exception as e:
        logger.error(f'Failed to get index stats: {e}', exc_info=True)
        return {
            'error': str(e)
        }


def get_index_document_count(index_name='documents'):
    """
    Get the total number of documents in an index.

    Args:
        index_name (str): Name of the index (default: 'documents')

    Returns:
        int: Number of documents, or 0 if index doesn't exist

    Example:
        >>> count = get_index_document_count()
        >>> print(f'Total documents: {count}')
        Total documents: 1500
    """
    try:
        es = get_elasticsearch_client()

        # Use count API for efficiency
        result = es.count(index=index_name)
        return result.get('count', 0)

    except NotFoundError:
        logger.warning(f'Index {index_name} not found')
        return 0
    except Exception as e:
        logger.error(f'Failed to count documents: {e}', exc_info=True)
        return 0


def index_exists(index_name='documents'):
    """
    Check if an index exists.

    Args:
        index_name (str): Name of the index to check

    Returns:
        bool: True if index exists, False otherwise

    Example:
        >>> if index_exists('documents'):
        ...     print('Index is ready')
    """
    try:
        es = get_elasticsearch_client()
        return es.indices.exists(index=index_name)

    except Exception as e:
        logger.error(f'Failed to check index existence: {e}', exc_info=True)
        return False


def get_index_mapping(index_name='documents'):
    """
    Get the mapping (schema) for an index.

    Args:
        index_name (str): Name of the index

    Returns:
        dict: Index mapping definition

    Example:
        >>> mapping = get_index_mapping()
        >>> print(mapping['documents']['mappings']['properties'].keys())
        dict_keys(['title', 'extracted_text', 'document_type', ...])
    """
    try:
        es = get_elasticsearch_client()
        mapping = es.indices.get_mapping(index=index_name)
        return mapping

    except NotFoundError:
        logger.warning(f'Index {index_name} not found')
        return {}
    except Exception as e:
        logger.error(f'Failed to get index mapping: {e}', exc_info=True)
        return {}


def get_index_settings(index_name='documents'):
    """
    Get the settings for an index.

    Args:
        index_name (str): Name of the index

    Returns:
        dict: Index settings including analyzers, shards, replicas

    Example:
        >>> settings = get_index_settings()
        >>> print(settings['documents']['settings']['index']['number_of_shards'])
        '1'
    """
    try:
        es = get_elasticsearch_client()
        settings_data = es.indices.get_settings(index=index_name)
        return settings_data

    except NotFoundError:
        logger.warning(f'Index {index_name} not found')
        return {}
    except Exception as e:
        logger.error(f'Failed to get index settings: {e}', exc_info=True)
        return {}


def refresh_index(index_name='documents'):
    """
    Force a refresh of the index to make recent changes searchable.

    Normally Elasticsearch refreshes indices automatically every 1 second.
    This forces an immediate refresh, useful for testing or real-time requirements.

    Args:
        index_name (str): Name of the index to refresh

    Returns:
        bool: True if successful, False otherwise

    Example:
        >>> refresh_index()  # Make recent indexed documents immediately searchable
        True
    """
    try:
        es = get_elasticsearch_client()
        es.indices.refresh(index=index_name)
        logger.info(f'Successfully refreshed index: {index_name}')
        return True

    except Exception as e:
        logger.error(f'Failed to refresh index: {e}', exc_info=True)
        return False


def clear_index_cache(index_name='documents'):
    """
    Clear the cache for an index.

    Args:
        index_name (str): Name of the index

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        es = get_elasticsearch_client()
        es.indices.clear_cache(index=index_name)
        logger.info(f'Successfully cleared cache for index: {index_name}')
        return True

    except Exception as e:
        logger.error(f'Failed to clear index cache: {e}', exc_info=True)
        return False


def get_search_performance_stats():
    """
    Get search performance statistics.

    Returns:
        dict: Performance metrics including:
            - Total queries
            - Query time
            - Average query latency
            - Fetch time

    Example:
        >>> stats = get_search_performance_stats()
        >>> print(f"Average query time: {stats['avg_query_time_ms']}ms")
    """
    try:
        stats = get_index_stats('documents')

        if 'error' in stats:
            return stats

        # Extract search statistics
        search_stats = stats['_all']['total']['search']

        total_queries = search_stats.get('query_total', 0)
        query_time_ms = search_stats.get('query_time_in_millis', 0)
        fetch_time_ms = search_stats.get('fetch_time_in_millis', 0)

        avg_query_time = query_time_ms / total_queries if total_queries > 0 else 0
        avg_fetch_time = fetch_time_ms / total_queries if total_queries > 0 else 0

        return {
            'total_queries': total_queries,
            'total_query_time_ms': query_time_ms,
            'total_fetch_time_ms': fetch_time_ms,
            'avg_query_time_ms': round(avg_query_time, 2),
            'avg_fetch_time_ms': round(avg_fetch_time, 2),
            'current_queries': search_stats.get('open_contexts', 0),
        }

    except Exception as e:
        logger.error(f'Failed to get search performance stats: {e}', exc_info=True)
        return {
            'error': str(e)
        }


def get_indexing_performance_stats():
    """
    Get indexing performance statistics.

    Returns:
        dict: Indexing metrics including:
            - Total documents indexed
            - Indexing time
            - Average indexing latency

    Example:
        >>> stats = get_indexing_performance_stats()
        >>> print(f"Documents indexed: {stats['total_indexed']}")
    """
    try:
        stats = get_index_stats('documents')

        if 'error' in stats:
            return stats

        # Extract indexing statistics
        indexing_stats = stats['_all']['total']['indexing']

        total_indexed = indexing_stats.get('index_total', 0)
        indexing_time_ms = indexing_stats.get('index_time_in_millis', 0)

        avg_indexing_time = indexing_time_ms / total_indexed if total_indexed > 0 else 0

        return {
            'total_indexed': total_indexed,
            'total_indexing_time_ms': indexing_time_ms,
            'avg_indexing_time_ms': round(avg_indexing_time, 2),
            'currently_indexing': indexing_stats.get('index_current', 0),
            'failed_indexing': indexing_stats.get('index_failed', 0),
        }

    except Exception as e:
        logger.error(f'Failed to get indexing performance stats: {e}', exc_info=True)
        return {
            'error': str(e)
        }


def get_comprehensive_index_report():
    """
    Get a comprehensive report of index health and performance.

    Returns:
        dict: Complete index status report

    Example:
        >>> report = get_comprehensive_index_report()
        >>> print(report['summary'])
    """
    try:
        return {
            'cluster_health': get_cluster_health(),
            'document_count': get_index_document_count(),
            'index_exists': index_exists(),
            'search_performance': get_search_performance_stats(),
            'indexing_performance': get_indexing_performance_stats(),
            'summary': {
                'status': 'healthy' if get_cluster_health()['status'] in ['green', 'yellow'] else 'unhealthy',
                'documents': get_index_document_count(),
                'searchable': index_exists(),
            }
        }

    except Exception as e:
        logger.error(f'Failed to generate comprehensive report: {e}', exc_info=True)
        return {
            'error': str(e),
            'summary': {
                'status': 'error',
                'message': 'Could not generate report'
            }
        }
