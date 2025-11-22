# Local Development Setup Guide

This guide explains how to run the DFC application with infrastructure services in Docker and backend/frontend running locally.

## Architecture Overview

- **Docker Containers**: PostgreSQL, Redis, MinIO, Elasticsearch, RabbitMQ, pgAdmin
- **Local Services**: Django Backend, Celery Worker, Celery Beat, React Frontend

## Prerequisites

1. **Docker Desktop** - Installed and running
2. **Python 3.13+** - For Django backend
3. **Node.js 18+** - For React frontend
4. **Git** - Version control

## Step 1: Start Infrastructure Services

Start all infrastructure services using Docker Compose:

```bash
# From project root directory
docker-compose up -d
```

This will start:
- **PostgreSQL** - Database (port 5432)
- **pgAdmin** - Database UI (port 5050)
- **Redis** - Cache & Celery backend (port 6379)
- **MinIO** - Object storage (ports 9000, 9001)
- **Elasticsearch** - Search engine (ports 9200, 9300)
- **RabbitMQ** - Message broker (ports 5672, 15672)

### Verify Services are Running

```bash
# Check all containers are healthy
docker-compose ps

# View logs
docker-compose logs -f
```

### Access Web Interfaces

- **pgAdmin**: http://localhost:5050
  - Email: `admin@dfc.com`
  - Password: `admin_password_2025`

- **MinIO Console**: http://localhost:9001
  - Username: `dfc_minio_admin`
  - Password: `dfc_minio_password_2025`

- **RabbitMQ Management**: http://localhost:15672
  - Username: `dfc_rabbit`
  - Password: `dfc_rabbit_password_2025`

- **Elasticsearch**: http://localhost:9200

## Step 2: Setup Backend (Django)

### Install Python Dependencies

```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Configure Environment Variables

The `backend/config/settings/base.py` is already configured to connect to Docker services on localhost. No additional configuration needed for development.

Key connection settings:
- **Database**: localhost:5432
- **Redis**: localhost:6379
- **MinIO**: localhost:9000
- **Elasticsearch**: localhost:9200
- **RabbitMQ**: localhost:5672

### Run Database Migrations

```bash
# Still in backend directory
python manage.py migrate
```

### Create Superuser (Admin Account)

```bash
python manage.py createsuperuser
```

### Seed Test Data (Optional)

```bash
python manage.py seed_data
```

### Start Django Development Server

```bash
python manage.py runserver
```

Backend will be available at: http://localhost:8000

## Step 3: Start Celery Workers (Optional)

Celery is needed for background tasks like OCR, document indexing, and retention policies.

### Terminal 1: Celery Worker

```bash
cd backend
celery -A config worker --loglevel=info
```

### Terminal 2: Celery Beat (for scheduled tasks)

```bash
cd backend
celery -A config beat --loglevel=info
```

## Step 4: Setup Frontend (React)

### Install Node Dependencies

```bash
cd frontend
npm install
```

### Start Development Server

```bash
npm run dev
```

Frontend will be available at: http://localhost:5173 (or http://localhost:3000)

## Development Workflow

### Starting Development Session

1. **Start Docker services**:
   ```bash
   docker-compose up -d
   ```

2. **Start Backend** (Terminal 1):
   ```bash
   cd backend
   python manage.py runserver
   ```

3. **Start Celery Worker** (Terminal 2 - optional):
   ```bash
   cd backend
   celery -A config worker --loglevel=info
   ```

4. **Start Frontend** (Terminal 3):
   ```bash
   cd frontend
   npm run dev
   ```

### Stopping Services

```bash
# Stop Django (Ctrl+C in terminal)
# Stop Celery (Ctrl+C in terminal)
# Stop Frontend (Ctrl+C in terminal)

# Stop Docker services
docker-compose down

# Stop Docker services and remove volumes (deletes all data!)
docker-compose down -v
```

## Troubleshooting

### Docker Services Won't Start

```bash
# Check Docker is running
docker ps

# View service logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs minio
docker-compose logs elasticsearch
docker-compose logs rabbitmq

# Restart specific service
docker-compose restart postgres
```

### Backend Can't Connect to Database

1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check database credentials match in `docker-compose.yml` and `backend/config/settings/base.py`

3. Test connection manually:
   ```bash
   docker exec -it dfc_postgres psql -U progress -d dfc_database
   ```

### MinIO Connection Issues

1. Verify MinIO is running:
   ```bash
   docker-compose ps minio
   ```

2. Access MinIO console at http://localhost:9001

3. Create bucket if it doesn't exist:
   - Login to MinIO Console
   - Click "Create Bucket"
   - Name: `dfc-documents`

### Elasticsearch Not Responding

```bash
# Check if Elasticsearch is healthy
curl http://localhost:9200/_cluster/health

# If not responding, increase memory in docker-compose.yml:
# ES_JAVA_OPTS=-Xms1g -Xmx1g
```

### Port Already in Use

If you get "port already in use" errors:

```bash
# Find what's using the port (Windows)
netstat -ano | findstr :5432
netstat -ano | findstr :6379
netstat -ano | findstr :9000

# Kill the process or change port in docker-compose.yml
```

## Database Management

### Using pgAdmin

1. Access pgAdmin at http://localhost:5050
2. Add server connection:
   - Host: `postgres` (or `localhost` from outside Docker)
   - Port: `5432`
   - Database: `dfc_database`
   - Username: `progress`
   - Password: `dabiko`

### Using psql CLI

```bash
# Connect to database
docker exec -it dfc_postgres psql -U progress -d dfc_database

# Common commands
\dt          # List tables
\d tablename # Describe table
\q           # Quit
```

## Running Tests

```bash
# Backend tests
cd backend
python manage.py test

# Frontend tests
cd frontend
npm test
```

## API Documentation

Once the backend is running, access API documentation at:
- **Swagger UI**: http://localhost:8000/api/schema/swagger-ui/
- **ReDoc**: http://localhost:8000/api/schema/redoc/

## Useful Commands

```bash
# Check all running services
docker-compose ps

# View logs from all services
docker-compose logs -f

# View logs from specific service
docker-compose logs -f postgres

# Restart all services
docker-compose restart

# Stop all services
docker-compose stop

# Remove all containers and volumes
docker-compose down -v

# Rebuild containers (if Dockerfile changed)
docker-compose up -d --build
```

## Next Steps

1. **Configure Environment Variables**: Create `.env` file for sensitive settings
2. **Setup IDE**: Configure your IDE (VS Code, PyCharm) for Django and React
3. **Install Browser Extensions**: React DevTools, Redux DevTools
4. **Review CLAUDE.md**: Understand project architecture and conventions
5. **Start Coding**: Begin implementing features according to the roadmap

## Support

For issues or questions:
- Check the main `CLAUDE.md` for project documentation
- Review Django logs in terminal
- Check Docker service logs: `docker-compose logs <service-name>`
- Verify all services are healthy: `docker-compose ps`
