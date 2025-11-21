# Docker Deployment Strategy for DFC Application

## Overview

This document outlines the recommended deployment strategy for the Digital Filing Cabinet (DFC) application, explaining when to use Docker, what to include in Docker images, and best practices for both development and production.

---

## Table of Contents

1. [Current Setup Analysis](#current-setup-analysis)
2. [Recommended Approach](#recommended-approach)
3. [Development Workflow](#development-workflow)
4. [Production Deployment](#production-deployment)
5. [What Gets Committed to Git](#what-gets-committed-to-git)
6. [What Gets Included in Docker Images](#what-gets-included-in-docker-images)
7. [Build and Deploy Commands](#build-and-deploy-commands)

---

## Current Setup Analysis

### What You Have:
- **Docker Compose**: Orchestrates all services (PostgreSQL, MinIO, Redis, Elasticsearch, RabbitMQ, Backend, Celery, Frontend)
- **Backend Dockerfile**: Builds Python/Django application
- **Frontend Dockerfile**: Multi-stage build (Node build → Nginx serve)
- **Volume mounts**: Development mode mounts source code directly

### Current Issues:
1. `.env` file committed to Git (contains sensitive credentials)
2. Volume mounts in development copy entire codebase (including unnecessary files)
3. No clear separation between development and production configurations

---

## Recommended Approach

### **✅ YES - This is the BEST Approach:**

```
Local Development → Test & Build → Docker Images → Production Deployment
```

**Why this approach is optimal:**

1. **Speed**: Develop locally with fast hot-reload (no container rebuilds)
2. **Testing**: Test locally before building Docker images
3. **Optimization**: Only include production-ready code in Docker images
4. **Security**: Environment-specific configs (no dev secrets in production)
5. **Portability**: Docker images are portable and consistent across environments

---

## Development Workflow

### Phase 1: Local Development (Recommended)

**Backend (Django):**
```bash
# Use local Python virtual environment
cd backend
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements/development.txt

# Run locally (connects to Docker infrastructure)
python manage.py runserver
```

**Frontend (React):**
```bash
cd frontend
npm install
npm run dev
```

**Infrastructure (Docker Compose):**
```bash
# Start only infrastructure services
docker-compose up postgres redis minio elasticsearch rabbitmq -d
```

**Advantages:**
- ⚡ Fast hot-reload (no container rebuilds)
- 🐛 Easy debugging (attach debugger directly)
- 📦 Smaller Docker images (no dev dependencies)
- 💾 Data persists in Docker volumes

---

### Phase 2: Testing in Docker (Before Production)

```bash
# Build images locally
docker-compose build backend frontend

# Run entire stack
docker-compose up

# Test the application
# If tests pass, images are ready for production
```

---

## Production Deployment

### Step 1: Build Production Images

```bash
# Build optimized production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Tag images for registry
docker tag dfc_backend:latest your-registry.com/dfc/backend:v1.0.0
docker tag dfc_frontend:latest your-registry.com/dfc/frontend:v1.0.0
```

### Step 2: Push to Registry

```bash
# Push to Docker registry (Docker Hub, AWS ECR, Google GCR, etc.)
docker push your-registry.com/dfc/backend:v1.0.0
docker push your-registry.com/dfc/frontend:v1.0.0
```

### Step 3: Deploy to Production Server

```bash
# On production server
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker exec dfc_backend python manage.py migrate

# Collect static files
docker exec dfc_backend python manage.py collectstatic --noinput
```

---

## What Gets Committed to Git

### ✅ **COMMIT These Files:**

```
Project Structure:
├── backend/
│   ├── apps/                    # Application code
│   ├── config/                  # Django settings
│   ├── requirements/            # Python dependencies
│   ├── Dockerfile               # Backend Docker build instructions
│   ├── .dockerignore            # Files to exclude from Docker
│   ├── .gitignore               # Files to exclude from Git
│   ├── manage.py                # Django management script
│   └── .env.example             # Example environment file (NO SECRETS)
├── frontend/
│   ├── src/                     # React source code
│   ├── public/                  # Static assets
│   ├── package.json             # Node dependencies
│   ├── package-lock.json        # Locked dependency versions
│   ├── Dockerfile               # Frontend Docker build instructions
│   ├── nginx.conf               # Nginx configuration
│   ├── .dockerignore            # Files to exclude from Docker
│   ├── .gitignore               # Files to exclude from Git
│   └── .env.example             # Example environment file (NO SECRETS)
├── docker-compose.yml           # Docker orchestration (development)
├── docker-compose.prod.yml      # Production overrides
├── .gitignore                   # Root gitignore
└── README.md                    # Documentation
```

### ❌ **NEVER COMMIT These:**

```
Sensitive Files:
- .env                           # Contains secrets
- .env.local                     # Local overrides
- *.pem, *.key, *.cert           # SSL certificates
- secrets.yml                    # Secret configurations
- credentials.json               # API credentials

Build Artifacts:
- node_modules/                  # Node dependencies (rebuild from package-lock.json)
- backend/venv/                  # Python virtual env (rebuild from requirements.txt)
- frontend/dist/                 # Built frontend (rebuild during deployment)
- backend/staticfiles/           # Collected static files
- backend/media/                 # User uploads

Development Files:
- __pycache__/                   # Python bytecode
- *.pyc                          # Compiled Python
- .DS_Store                      # Mac OS files
- .vscode/                       # IDE settings
- *.log                          # Log files
```

---

## What Gets Included in Docker Images

### Backend Image Contents:

```dockerfile
# FROM python:3.13-slim
# ✅ Include:
- Python runtime
- System dependencies (PostgreSQL client, Tesseract, etc.)
- Application code (apps/, config/, manage.py)
- Python dependencies (from requirements/*.txt)
- Empty directories (media/, staticfiles/, logs/)

# ❌ Exclude (via .dockerignore):
- Virtual environments (venv/, .venv/)
- Python cache (__pycache__/, *.pyc)
- IDE files (.vscode/, .idea/)
- Test files (.pytest_cache/, .coverage)
- Documentation (*.md, docs/)
- Environment files (.env)
- Git files (.git/)
- Development scripts (test_*.py)
```

### Frontend Image Contents:

```dockerfile
# Stage 1: Builder (node:20-alpine)
- Node runtime
- Source code (src/, public/)
- package.json & package-lock.json
- Build the application → dist/

# Stage 2: Production (nginx:alpine)
# ✅ Include:
- Nginx web server
- Built static files ONLY (dist/)
- Nginx configuration

# ❌ Exclude:
- Node modules
- Source code (already built)
- Development files
```

**Why multi-stage build?**
- **Stage 1**: 1.2GB (with Node + dependencies)
- **Stage 2**: 50MB (only Nginx + static files)
- **Savings**: ~95% smaller final image!

---

## Build and Deploy Commands

### Development Commands

```bash
# Start infrastructure only
docker-compose up postgres redis minio elasticsearch rabbitmq -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild specific service
docker-compose build backend
docker-compose up -d backend
```

### Production Build Commands

```bash
# 1. Test locally first
cd backend && python manage.py test
cd frontend && npm run build

# 2. Build Docker images
docker-compose build --no-cache

# 3. Test Docker images locally
docker-compose up

# 4. Tag for production
docker tag dfc_backend:latest registry.company.com/dfc/backend:1.0.0
docker tag dfc_frontend:latest registry.company.com/dfc/frontend:1.0.0

# 5. Push to registry
docker push registry.company.com/dfc/backend:1.0.0
docker push registry.company.com/dfc/frontend:1.0.0

# 6. Deploy on production server
ssh production-server
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 7. Run migrations
docker exec dfc_backend python manage.py migrate
docker exec dfc_backend python manage.py collectstatic --noinput

# 8. Health check
curl http://production-server:8000/health/
curl http://production-server/  # Frontend
```

### Rollback Strategy

```bash
# If something goes wrong, rollback to previous version
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --force-recreate --scale backend=0
docker tag dfc_backend:1.0.0-previous dfc_backend:latest
docker-compose -f docker-compose.prod.yml up -d
```

---

## Security Best Practices

### 1. Environment Variables

**Development (`.env` - NOT committed):**
```bash
DB_PASSWORD=dev_password_123
SECRET_KEY=dev-secret-key-not-for-production
DEBUG=True
```

**Production (Environment variables or secrets manager):**
```bash
# Use Docker secrets, Kubernetes secrets, or AWS Secrets Manager
docker secret create db_password /path/to/password.txt
docker secret create django_secret_key /path/to/secret.txt
```

### 2. Image Security

```bash
# Scan images for vulnerabilities
docker scan dfc_backend:latest
docker scan dfc_frontend:latest

# Use non-root user in Dockerfile
USER appuser  # Add to Dockerfile for production
```

### 3. Network Security

```yaml
# docker-compose.prod.yml
services:
  backend:
    environment:
      - ALLOWED_HOSTS=production.company.com
      - CORS_ALLOWED_ORIGINS=https://production.company.com
    networks:
      - internal  # Not exposed to internet

  frontend:
    ports:
      - "443:443"  # HTTPS only
    networks:
      - public
```

---

## Summary: Your Questions Answered

### Q: "Can you make sure the git ignore file is updated and not pushing anything to docker that is not needed?"

**✅ DONE:**
- Updated `.gitignore` to exclude all sensitive files, build artifacts, and development files
- Updated `.dockerignore` for both backend and frontend to exclude unnecessary files from Docker images
- Added security sections to prevent committing secrets

### Q: "I need to build successfully and send what has been successfully built to docker. Is this the best approach?"

**✅ YES, this is the BEST approach:**

1. **Develop Locally** → Fast iteration with hot-reload
2. **Test Locally** → Ensure code works before building
3. **Build Docker Images** → Create optimized, production-ready images
4. **Test Docker Images** → Verify images work in containerized environment
5. **Deploy to Production** → Push images to registry and deploy

**Why it's the best:**
- 🚀 **Fast Development**: No waiting for container rebuilds
- ✅ **Quality Control**: Test before building images
- 📦 **Optimized Images**: Only production code included
- 🔒 **Secure**: No dev dependencies or secrets in production
- 🔄 **Reproducible**: Same images work everywhere (dev, staging, prod)
- 💰 **Cost-Effective**: Smaller images = faster deploys, lower bandwidth

**Alternative (NOT Recommended):**
- Develop inside Docker containers → Slow, requires rebuilds for every change
- Mount source code in production → Security risk, not portable

---

## Next Steps

1. ✅ **Updated files** (`.gitignore`, `.dockerignore`) are now optimized
2. 📝 **Create `.env.example`** with dummy values (no secrets)
3. 🧪 **Test build** locally: `docker-compose build`
4. 🚀 **Deploy** when ready: Follow production deployment steps above

---

**Last Updated**: 2025-11-21
**Version**: 1.0
**Maintained By**: Development Team
