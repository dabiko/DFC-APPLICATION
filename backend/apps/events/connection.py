"""
RabbitMQ connection management for the event-driven architecture.

This module provides connection pooling and management for RabbitMQ,
including automatic reconnection and health checks.
"""

import logging
import os
import ssl
import threading
import time
from contextlib import contextmanager
from typing import Callable, Dict, List, Optional
from urllib.parse import urlparse

import pika
from pika.adapters.blocking_connection import BlockingConnection, BlockingChannel
from pika.exceptions import (
    AMQPConnectionError,
    AMQPChannelError,
    ConnectionClosedByBroker,
    StreamLostError,
)

from django.conf import settings

logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

class RabbitMQConfig:
    """RabbitMQ configuration from environment/settings."""

    def __init__(self):
        self.broker_url = getattr(
            settings, 'CELERY_BROKER_URL',
            os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672//')
        )
        parsed = urlparse(self.broker_url)

        self.host = parsed.hostname or 'localhost'
        self.port = parsed.port or 5672
        self.username = parsed.username or 'guest'
        self.password = parsed.password or 'guest'
        self.virtual_host = parsed.path.lstrip('/') or '/'

        # Connection settings
        self.heartbeat = int(os.getenv('RABBITMQ_HEARTBEAT', 60))
        self.connection_timeout = int(os.getenv('RABBITMQ_CONNECTION_TIMEOUT', 10))
        self.blocked_connection_timeout = int(os.getenv('RABBITMQ_BLOCKED_TIMEOUT', 300))

        # Pool settings
        self.pool_size = int(os.getenv('RABBITMQ_POOL_SIZE', 5))
        self.max_overflow = int(os.getenv('RABBITMQ_MAX_OVERFLOW', 10))

        # Retry settings
        self.max_retries = int(os.getenv('RABBITMQ_MAX_RETRIES', 5))
        self.retry_delay = float(os.getenv('RABBITMQ_RETRY_DELAY', 1.0))
        self.retry_backoff = float(os.getenv('RABBITMQ_RETRY_BACKOFF', 2.0))

        # SSL settings
        self.use_ssl = os.getenv('RABBITMQ_USE_SSL', 'false').lower() == 'true'
        self.ssl_cert = os.getenv('RABBITMQ_SSL_CERT')
        self.ssl_key = os.getenv('RABBITMQ_SSL_KEY')
        self.ssl_ca = os.getenv('RABBITMQ_SSL_CA')


# Global config instance
config = RabbitMQConfig()


# =============================================================================
# Connection Manager
# =============================================================================

class ConnectionManager:
    """
    Manages RabbitMQ connections with connection pooling and automatic reconnection.

    Thread-safe implementation supporting multiple concurrent connections.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        """Singleton pattern for connection manager."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize the connection manager."""
        if self._initialized:
            return

        self._pool: List[BlockingConnection] = []
        self._pool_lock = threading.Lock()
        self._channels: Dict[int, BlockingChannel] = {}
        self._healthy = False
        self._config = config
        self._initialized = True

        logger.info(
            f"Initializing RabbitMQ connection manager: "
            f"{self._config.host}:{self._config.port}"
        )

    def _get_connection_params(self) -> pika.ConnectionParameters:
        """Build connection parameters."""
        credentials = pika.PlainCredentials(
            self._config.username,
            self._config.password
        )

        ssl_options = None
        if self._config.use_ssl:
            context = ssl.create_default_context()
            if self._config.ssl_ca:
                context.load_verify_locations(self._config.ssl_ca)
            if self._config.ssl_cert and self._config.ssl_key:
                context.load_cert_chain(
                    self._config.ssl_cert,
                    self._config.ssl_key
                )
            ssl_options = pika.SSLOptions(context)

        return pika.ConnectionParameters(
            host=self._config.host,
            port=self._config.port,
            virtual_host=self._config.virtual_host,
            credentials=credentials,
            heartbeat=self._config.heartbeat,
            blocked_connection_timeout=self._config.blocked_connection_timeout,
            connection_attempts=self._config.max_retries,
            retry_delay=self._config.retry_delay,
            socket_timeout=self._config.connection_timeout,
            ssl_options=ssl_options,
        )

    def _create_connection(self) -> BlockingConnection:
        """Create a new RabbitMQ connection with retry logic."""
        params = self._get_connection_params()
        retries = 0
        delay = self._config.retry_delay

        while retries <= self._config.max_retries:
            try:
                connection = BlockingConnection(params)
                logger.debug("Created new RabbitMQ connection")
                return connection
            except AMQPConnectionError as e:
                retries += 1
                if retries > self._config.max_retries:
                    logger.error(f"Failed to connect to RabbitMQ after {retries} attempts: {e}")
                    raise
                logger.warning(
                    f"RabbitMQ connection attempt {retries} failed, "
                    f"retrying in {delay}s: {e}"
                )
                time.sleep(delay)
                delay *= self._config.retry_backoff

        raise AMQPConnectionError("Max retries exceeded")

    def get_connection(self) -> BlockingConnection:
        """Get a connection from the pool or create a new one."""
        with self._pool_lock:
            # Try to get an existing healthy connection
            while self._pool:
                connection = self._pool.pop()
                if connection.is_open:
                    return connection
                else:
                    try:
                        connection.close()
                    except Exception:
                        pass

            # Create a new connection
            return self._create_connection()

    def return_connection(self, connection: BlockingConnection):
        """Return a connection to the pool."""
        if connection is None:
            return

        with self._pool_lock:
            if connection.is_open and len(self._pool) < self._config.pool_size:
                self._pool.append(connection)
            else:
                try:
                    connection.close()
                except Exception:
                    pass

    @contextmanager
    def connection(self):
        """Context manager for getting and returning connections."""
        conn = None
        try:
            conn = self.get_connection()
            yield conn
        except (AMQPConnectionError, ConnectionClosedByBroker, StreamLostError) as e:
            logger.error(f"RabbitMQ connection error: {e}")
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass
                conn = None
            raise
        finally:
            if conn:
                self.return_connection(conn)

    @contextmanager
    def channel(self):
        """Context manager for getting a channel from a pooled connection."""
        with self.connection() as conn:
            channel = None
            try:
                channel = conn.channel()
                yield channel
            except AMQPChannelError as e:
                logger.error(f"RabbitMQ channel error: {e}")
                raise
            finally:
                if channel and channel.is_open:
                    try:
                        channel.close()
                    except Exception:
                        pass

    def health_check(self) -> bool:
        """Check if RabbitMQ connection is healthy."""
        try:
            with self.connection() as conn:
                self._healthy = conn.is_open
                return self._healthy
        except Exception as e:
            logger.warning(f"RabbitMQ health check failed: {e}")
            self._healthy = False
            return False

    def is_healthy(self) -> bool:
        """Return cached health status."""
        return self._healthy

    def close_all(self):
        """Close all connections in the pool."""
        with self._pool_lock:
            for connection in self._pool:
                try:
                    if connection.is_open:
                        connection.close()
                except Exception as e:
                    logger.warning(f"Error closing connection: {e}")
            self._pool.clear()
            self._healthy = False
            logger.info("All RabbitMQ connections closed")


# =============================================================================
# Global Connection Manager Instance
# =============================================================================

def get_connection_manager() -> ConnectionManager:
    """Get the global connection manager instance."""
    return ConnectionManager()


@contextmanager
def get_channel():
    """Convenience function to get a channel."""
    manager = get_connection_manager()
    with manager.channel() as channel:
        yield channel


def check_rabbitmq_health() -> bool:
    """Check RabbitMQ health status."""
    return get_connection_manager().health_check()


# =============================================================================
# Queue/Exchange Declarations
# =============================================================================

class QueueConfig:
    """Configuration for queues and exchanges."""

    # Exchange names
    EVENTS_EXCHANGE = 'dfc.events'
    DLX_EXCHANGE = 'dfc.dlx'

    # Queue names by category
    DOCUMENT_QUEUE = 'dfc.events.document'
    WORKFLOW_QUEUE = 'dfc.events.workflow'
    RETENTION_QUEUE = 'dfc.events.retention'
    CLASSIFICATION_QUEUE = 'dfc.events.classification'
    INTELLIGENCE_QUEUE = 'dfc.events.intelligence'
    NOTIFICATION_QUEUE = 'dfc.events.notification'
    AUDIT_QUEUE = 'dfc.events.audit'

    # Dead letter queues
    DLQ_DOCUMENT = 'dfc.dlq.document'
    DLQ_WORKFLOW = 'dfc.dlq.workflow'
    DLQ_RETENTION = 'dfc.dlq.retention'
    DLQ_CLASSIFICATION = 'dfc.dlq.classification'
    DLQ_INTELLIGENCE = 'dfc.dlq.intelligence'
    DLQ_NOTIFICATION = 'dfc.dlq.notification'
    DLQ_AUDIT = 'dfc.dlq.audit'

    # Routing keys
    ROUTING_KEYS = {
        'document': 'event.document.#',
        'workflow': 'event.workflow.#',
        'retention': 'event.retention.#',
        'classification': 'event.classification.#',
        'intelligence': 'event.intelligence.#',
        'notification': 'event.notification.#',
        'audit': 'event.audit.#',
    }


def declare_infrastructure(channel: BlockingChannel):
    """Declare all exchanges, queues, and bindings."""
    logger.info("Declaring RabbitMQ infrastructure...")

    # Declare main events exchange (topic exchange for routing)
    channel.exchange_declare(
        exchange=QueueConfig.EVENTS_EXCHANGE,
        exchange_type='topic',
        durable=True,
        auto_delete=False,
    )

    # Declare dead letter exchange
    channel.exchange_declare(
        exchange=QueueConfig.DLX_EXCHANGE,
        exchange_type='topic',
        durable=True,
        auto_delete=False,
    )

    # Queue configurations with their dead letter queues
    queue_configs = [
        (QueueConfig.DOCUMENT_QUEUE, QueueConfig.DLQ_DOCUMENT, 'document'),
        (QueueConfig.WORKFLOW_QUEUE, QueueConfig.DLQ_WORKFLOW, 'workflow'),
        (QueueConfig.RETENTION_QUEUE, QueueConfig.DLQ_RETENTION, 'retention'),
        (QueueConfig.CLASSIFICATION_QUEUE, QueueConfig.DLQ_CLASSIFICATION, 'classification'),
        (QueueConfig.INTELLIGENCE_QUEUE, QueueConfig.DLQ_INTELLIGENCE, 'intelligence'),
        (QueueConfig.NOTIFICATION_QUEUE, QueueConfig.DLQ_NOTIFICATION, 'notification'),
        (QueueConfig.AUDIT_QUEUE, QueueConfig.DLQ_AUDIT, 'audit'),
    ]

    for main_queue, dlq, category in queue_configs:
        # Declare dead letter queue first
        channel.queue_declare(
            queue=dlq,
            durable=True,
            arguments={
                'x-message-ttl': 604800000,  # 7 days in milliseconds
            }
        )
        channel.queue_bind(
            queue=dlq,
            exchange=QueueConfig.DLX_EXCHANGE,
            routing_key=f'dlq.{category}.#'
        )

        # Declare main queue with DLX
        channel.queue_declare(
            queue=main_queue,
            durable=True,
            arguments={
                'x-dead-letter-exchange': QueueConfig.DLX_EXCHANGE,
                'x-dead-letter-routing-key': f'dlq.{category}',
                'x-max-priority': 10,
            }
        )

        # Bind main queue to events exchange
        channel.queue_bind(
            queue=main_queue,
            exchange=QueueConfig.EVENTS_EXCHANGE,
            routing_key=QueueConfig.ROUTING_KEYS[category]
        )

    logger.info("RabbitMQ infrastructure declared successfully")


def setup_rabbitmq():
    """Setup RabbitMQ infrastructure on startup."""
    try:
        with get_channel() as channel:
            declare_infrastructure(channel)
        return True
    except Exception as e:
        logger.error(f"Failed to setup RabbitMQ infrastructure: {e}")
        return False
