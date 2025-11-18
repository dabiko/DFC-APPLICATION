# Digital Filing Cabinet (DFC) - Backend

Django-based REST API backend for the Digital Filing Cabinet document management system.

## Technology Stack

- **Framework**: Django 5.2.8+ with Django REST Framework
- **Database**: PostgreSQL 18+
- **Object Storage**: MinIO (S3-compatible)
- **Search Engine**: Elasticsearch 8.x
- **Cache**: Redis 8.x
- **Task Queue**: Celery with RabbitMQ
- **Python**: 3.11+

## Project Structure

```
backend/
├── config/                  # Django project configuration
│   ├── settings/           # Split settings (base, development, production)
│   ├── urls.py             # Root URL configuration
│   ├── wsgi.py             # WSGI application
│   └── celery.py           # Celery configuration
├── apps/                    # Django applications
│   ├── users/              # User management & authentication
│   ├── documents/          # Document management
│   ├── folders/            # Folder hierarchy
│   ├── search/             # Elasticsearch integration
│   ├── audit/              # Audit trail
│   ├── permissions/        # RBAC & permissions
│   └── workflows/          # Background tasks
├── requirements/            # Python dependencies
│   ├── base.txt            # Base requirements
│   ├── development.txt     # Development requirements
│   ├── production.txt      # Production requirements
│   └── testing.txt         # Testing requirements
├── docker/                  # Docker configuration
│   └── docker-compose.yml  # Development environment
└── manage.py                # Django management script
```

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Docker and Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "DFC APPLICATION"/backend
```

### 2. Set Up Python Virtual Environment

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 3. Install Dependencies

```bash
# Install development dependencies
pip install -r requirements/development.txt
```

### 4. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
# Default values are set for development
```

### 5. Start Infrastructure Services

```bash
# Start all services (PostgreSQL, MinIO, Elasticsearch, Redis, RabbitMQ)
cd docker
docker-compose up -d

# Verify all services are running
docker-compose ps

# View logs
docker-compose logs -f
```

### 6. Initialize Django Project

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files (if needed)
python manage.py collectstatic --noinput
```

### 7. Run Development Server

```bash
# Start Django development server
python manage.py runserver

# Server will be available at http://localhost:8000
```

### 8. Start Celery Worker (Optional)

In a separate terminal:

```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Start Celery worker
celery -A config worker --loglevel=info

# Start Celery beat (for scheduled tasks)
celery -A config beat --loglevel=info
```

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=apps --cov-report=html

# Run specific test file
pytest apps/users/tests/test_models.py
```

### Code Quality

```bash
# Format code with Black
black .

# Sort imports with isort
isort .

# Lint with Flake8
flake8

# Type checking with mypy
mypy apps/
```

### Database Management

```bash
# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Rollback migration
python manage.py migrate <app_name> <migration_name>

# Show migrations
python manage.py showmigrations
```

### MinIO Setup

Access MinIO Console at http://localhost:9001

- **Username**: minioadmin
- **Password**: minioadmin123

Create a bucket named `dfc-documents` for document storage.

### Elasticsearch

Access Elasticsearch at http://localhost:9200

```bash
# Rebuild search indices
python manage.py search_index --rebuild

# Populate search index
python manage.py search_index --populate
```

### RabbitMQ Management

Access RabbitMQ Management UI at http://localhost:15672

- **Username**: dfc_user
- **Password**: dev_password

## API Documentation

API documentation is available at:
- Swagger UI: http://localhost:8000/api/schema/swagger-ui/
- ReDoc: http://localhost:8000/api/schema/redoc/
- OpenAPI Schema: http://localhost:8000/api/schema/

## Environment Variables

Key environment variables (see `.env.example` for full list):

| Variable | Description | Default |
|----------|-------------|---------|
| `DEBUG` | Debug mode | `True` |
| `SECRET_KEY` | Django secret key | (required) |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://dfc_user:dev_password@localhost:5432/dfc_dev` |
| `MINIO_ENDPOINT` | MinIO server endpoint | `localhost:9000` |
| `ELASTICSEARCH_HOST` | Elasticsearch host | `localhost` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `CELERY_BROKER_URL` | Celery broker URL | `amqp://dfc_user:dev_password@localhost:5672//` |

## Docker Services

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| PostgreSQL | 5432 | Database |
| MinIO API | 9000 | Object storage API |
| MinIO Console | 9001 | MinIO web console |
| Elasticsearch | 9200 | Search engine |
| Redis | 6379 | Cache |
| RabbitMQ | 5672 | Message broker |
| RabbitMQ Management | 15672 | RabbitMQ web UI |

### Managing Services

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Restart a specific service
docker-compose restart <service_name>

# View logs
docker-compose logs -f <service_name>
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
netstat -ano | findstr :<port>

# Kill process (Windows)
taskkill /PID <process_id> /F
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps db

# View PostgreSQL logs
docker-compose logs db

# Connect to PostgreSQL directly
docker-compose exec db psql -U dfc_user -d dfc_dev
```

### MinIO Connection Issues

```bash
# Check MinIO logs
docker-compose logs minio

# Verify MinIO health
curl http://localhost:9000/minio/health/live
```

### Elasticsearch Issues

```bash
# Check Elasticsearch status
curl http://localhost:9200/_cluster/health

# View Elasticsearch logs
docker-compose logs elasticsearch
```

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Proprietary - CCC PLC

## Support

For support, contact the development team.
