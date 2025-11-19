# Docker Setup Guide for DFC Application

This guide explains how to run the entire DFC application stack using Docker.

---

## 📋 What's Included

The docker-compose setup includes:

1. **PostgreSQL** - Database (port 5432)
2. **pgAdmin** - Database management UI (port 5050)
3. **MinIO** - S3-compatible object storage (ports 9000, 9001)
4. **Redis** - Caching & Celery broker (port 6379)
5. **Elasticsearch** - Search engine (ports 9200, 9300)
6. **RabbitMQ** - Message broker (ports 5672, 15672)
7. **Django Backend** - Main application API (port 8000)
8. **Celery Worker** - Background task processor
9. **Celery Beat** - Scheduled task scheduler
10. **React Frontend** - Web application UI (port 3000)

---

## 🚀 Quick Start

### 1. Prerequisites

- Docker Desktop installed (Windows/Mac) or Docker Engine + Docker Compose (Linux)
- At least 8GB RAM available for Docker
- 20GB free disk space

### 2. Start All Services

```bash
cd "C:\Users\dabik\PycharmProjects\DFC APPLICATION"
docker-compose up -d
```

This will:
- Pull all required images
- Build the Django backend image
- Build the React frontend image
- Start all services
- Create necessary volumes and networks

### 3. Check Service Status

```bash
docker-compose ps
```

All services should show status as "Up" or "Up (healthy)".

### 4. View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f minio
```

---

## 🔧 Initial Setup

### 1. Run Database Migrations

```bash
docker-compose exec backend python manage.py migrate
```

### 2. Create Superuser

```bash
docker-compose exec backend python manage.py createsuperuser
```

Follow the prompts to create an admin user.

### 3. Collect Static Files (Optional)

```bash
docker-compose exec backend python manage.py collectstatic --noinput
```

### 4. Create MinIO Bucket

The backend will automatically create the `dfc-documents` bucket on startup.
You can verify in MinIO console at http://localhost:9001

---

## 🌐 Access URLs

### Main Application
- **Frontend Web App**: http://localhost:3000
- **Django API**: http://localhost:8000
- **Django Admin**: http://localhost:8000/admin
- **API Documentation**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/redoc/

### Management UIs
- **pgAdmin**: http://localhost:5050
  - Email: `admin@dfc.local`
  - Password: `admin_password_2025`

- **MinIO Console**: http://localhost:9001
  - Username: `dfc_minio_admin`
  - Password: `dfc_minio_password_2025`

- **RabbitMQ Management**: http://localhost:15672
  - Username: `dfc_rabbit`
  - Password: `dfc_rabbit_password_2025`

- **Elasticsearch**: http://localhost:9200

---

## 🗄️ Database Connection via pgAdmin

### Option 1: Using pgAdmin Web UI

1. Open http://localhost:5050
2. Login with credentials above
3. Click "Add New Server"
4. Configure:
   - **General Tab**:
     - Name: `DFC PostgreSQL`
   - **Connection Tab**:
     - Host: `postgres` (or `dfc_postgres`)
     - Port: `5432`
     - Maintenance database: `dfc_dev`
     - Username: `dfc_user`
     - Password: `dfc_password_2025`
5. Click "Save"

### Option 2: External PostgreSQL Client

If you have a local PostgreSQL client (DBeaver, TablePlus, etc.):

- **Host**: `localhost` (or `127.0.0.1`)
- **Port**: `5432`
- **Database**: `dfc_dev`
- **Username**: `dfc_user`
- **Password**: `dfc_password_2025`

---

## 🛠️ Common Commands

### Start Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuild Services
```bash
# Rebuild backend after code changes
docker-compose build backend

# Rebuild frontend after code changes
docker-compose build frontend

# Rebuild and start all services
docker-compose up -d --build
```

### Execute Commands
```bash
# Run Django management commands
docker-compose exec backend python manage.py <command>

# Examples:
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py shell

# Access backend container shell
docker-compose exec backend bash

# Access frontend container shell
docker-compose exec frontend sh

# Access PostgreSQL shell
docker-compose exec postgres psql -U dfc_user -d dfc_dev
```

### View Logs
```bash
# Follow all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# View last 100 lines
docker-compose logs --tail=100 backend
docker-compose logs --tail=100 frontend
```

---

## 📁 Volumes & Data Persistence

Data is persisted in Docker volumes:

- `postgres_data` - Database data
- `pgadmin_data` - pgAdmin settings
- `minio_data` - Uploaded files
- `redis_data` - Cache data
- `elasticsearch_data` - Search indices
- `rabbitmq_data` - Message queue data
- `backend_media` - Django media files
- `backend_static` - Django static files

### List Volumes
```bash
docker volume ls | grep dfc
```

### Inspect Volume
```bash
docker volume inspect dfc_application_postgres_data
```

### Backup Volume
```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U dfc_user dfc_dev > backup.sql

# Backup MinIO (all files)
docker run --rm -v dfc_application_minio_data:/data -v $(pwd):/backup alpine tar czf /backup/minio_backup.tar.gz /data
```

### Restore from Backup
```bash
# Restore PostgreSQL
docker-compose exec -T postgres psql -U dfc_user dfc_dev < backup.sql
```

---

## 🔍 Troubleshooting

### Services Won't Start

```bash
# Check logs for errors
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# Check if ports are already in use
netstat -ano | findstr :3000  # Frontend
netstat -ano | findstr :8000  # Backend
netstat -ano | findstr :5432  # PostgreSQL

# Remove containers and try again
docker-compose down
docker-compose up -d
```

### Database Connection Errors

```bash
# Verify PostgreSQL is healthy
docker-compose ps postgres

# Test connection
docker-compose exec postgres pg_isready -U dfc_user -d dfc_dev

# Check logs
docker-compose logs postgres
```

### Backend Won't Start

```bash
# Check if migrations are needed
docker-compose exec backend python manage.py showmigrations

# Run migrations
docker-compose exec backend python manage.py migrate

# Check environment variables
docker-compose exec backend env | grep DB
```

### Frontend Won't Start or Shows Blank Page

```bash
# Check frontend logs
docker-compose logs frontend

# Verify frontend build completed successfully
docker-compose build frontend --no-cache

# Check nginx configuration
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Test frontend health endpoint
curl http://localhost:3000/health

# Verify API proxy is working
docker-compose exec frontend wget -O- http://backend:8000/api/
```

### Out of Memory

```bash
# Check Docker resources
docker stats

# Increase Docker Desktop memory allocation:
# Docker Desktop → Settings → Resources → Memory (increase to 8GB+)
```

### Permission Issues (Linux/Mac)

```bash
# Fix volume permissions
sudo chown -R $USER:$USER ./backend/media
sudo chown -R $USER:$USER ./backend/staticfiles
```

---

## 🔐 Security Notes

### For Development

The current setup is configured for **development only** with:
- Default passwords (change in production)
- Debug mode enabled
- No SSL/TLS
- Trust authentication for PostgreSQL

### For Production

**DO NOT use this setup as-is in production!**

Required changes:
1. Change all passwords to strong, unique values
2. Use environment files (.env) instead of hardcoded values
3. Enable SSL/TLS for all services
4. Use proper authentication (not trust)
5. Set DEBUG=False
6. Configure ALLOWED_HOSTS properly
7. Use production WSGI server (Gunicorn/uWSGI)
8. Set up proper logging
9. Configure backups
10. Use secrets management (Docker Secrets, Vault)

---

## 🔄 Development Workflow

### Backend Code Changes

The backend code is mounted as a volume (`./backend:/app`), so:
- Code changes are reflected immediately
- No need to rebuild for Python code changes
- Django auto-reloads on file changes

### Frontend Code Changes

The frontend uses a multi-stage build, so:
- Code changes require rebuilding the frontend image
- Run `docker-compose build frontend` after changes
- Restart with `docker-compose up -d frontend`

**Alternative for frontend development**:
Run frontend locally (outside Docker) for faster development:
```bash
cd frontend
npm install
npm run dev
```
This enables hot module reloading. The frontend will connect to the backend at http://localhost:8000

### Dependency Changes

**Backend** - If you modify `requirements.txt`:
```bash
# Rebuild backend image
docker-compose build backend

# Restart backend
docker-compose up -d backend
```

**Frontend** - If you modify `package.json`:
```bash
# Rebuild frontend image
docker-compose build frontend

# Restart frontend
docker-compose up -d frontend
```

### Database Schema Changes

```bash
# Create migrations
docker-compose exec backend python manage.py makemigrations

# Apply migrations
docker-compose exec backend python manage.py migrate
```

---

## 📊 Monitoring

### Check Resource Usage

```bash
# View real-time stats
docker stats

# Check disk usage
docker system df
```

### Check Service Health

```bash
# View health status
docker-compose ps

# Detailed inspect
docker inspect dfc_backend --format='{{json .State.Health}}'
```

---

## 🧹 Cleanup

### Remove Stopped Containers

```bash
docker container prune
```

### Remove Unused Images

```bash
docker image prune -a
```

### Remove Unused Volumes

```bash
# WARNING: This deletes data!
docker volume prune
```

### Complete Cleanup

```bash
# Stop and remove everything
docker-compose down -v --rmi all

# Clean Docker system
docker system prune -a --volumes
```

---

## 🏗️ Architecture Overview

### Frontend Architecture

The React frontend is containerized using a **multi-stage Docker build**:

**Stage 1 - Build** (Node.js 20):
- Installs npm dependencies
- Builds production-optimized React app with Vite
- Generates static files in `/app/dist`

**Stage 2 - Serve** (Nginx Alpine):
- Copies built static files from Stage 1
- Serves React app on port 80 (mapped to host port 3000)
- Proxies API requests to Django backend
- Implements caching strategies for assets
- Provides health check endpoint at `/health`

**Key Features**:
- **SPA Routing**: All routes fallback to `index.html` for React Router
- **API Proxy**: Requests to `/api/*` forwarded to `backend:8000`
- **Caching**: Static assets cached for 1 year, index.html never cached
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection
- **Compression**: Gzip enabled for text-based assets

### Backend Architecture

The Django backend runs in development mode with:
- Python 3.11-slim base image
- Hot-reload enabled (code changes reflected immediately)
- Volume mounting for real-time code updates
- Connected to all supporting services via Docker network

### Service Communication

```
Frontend (port 3000)
    ↓ (HTTP requests to /api/*)
Backend (port 8000)
    ↓
├─→ PostgreSQL (port 5432) - Database
├─→ MinIO (port 9000) - Object storage
├─→ Redis (port 6379) - Cache & Celery broker
├─→ Elasticsearch (port 9200) - Search
└─→ RabbitMQ (port 5672) - Message queue
    ↓
Celery Worker + Beat - Background tasks
```

---

## 🚢 Production Deployment

For production deployment, consider:

1. **Container Orchestration**: Use Kubernetes or Docker Swarm
2. **Load Balancing**: Nginx/HAProxy in front of Django
3. **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL)
4. **Object Storage**: AWS S3, Google Cloud Storage (instead of MinIO)
5. **Monitoring**: Prometheus + Grafana
6. **Logging**: ELK Stack or Datadog
7. **CI/CD**: GitHub Actions, GitLab CI, Jenkins
8. **SSL Certificates**: Let's Encrypt, AWS Certificate Manager

---

## 📝 Environment Variables

Create a `.env` file for environment-specific configuration:

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=dfc_dev
DB_USER=dfc_user
DB_PASSWORD=your_secure_password

# MinIO
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key

# Django
SECRET_KEY=your_secret_key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

Update `docker-compose.yml` to use `.env` file:

```yaml
env_file:
  - .env
```

---

## 🆘 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify services are healthy: `docker-compose ps`
3. Check Docker resources: `docker stats`
4. Restart services: `docker-compose restart`
5. Clean and restart: `docker-compose down && docker-compose up -d`

---

**Document Version**: 2.0
**Last Updated**: November 19, 2025
**Status**: Full Stack Development Setup Ready (Backend + Frontend)
