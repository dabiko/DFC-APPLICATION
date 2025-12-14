# Getting Started - Digital Filing Cabinet (DFC)

A complete guide to clone, setup, and run the DFC application locally on your machine.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Clone the Repository](#clone-the-repository)
3. [Quick Start (TL;DR)](#quick-start-tldr)
4. [Detailed Setup](#detailed-setup)
   - [Step 1: Start Infrastructure Services](#step-1-start-infrastructure-services)
   - [Step 2: Setup PostgreSQL Database](#step-2-setup-postgresql-database)
   - [Step 3: Setup Backend (Django)](#step-3-setup-backend-django)
   - [Step 4: Setup Frontend (React)](#step-4-setup-frontend-react)
5. [Service URLs & Credentials](#service-urls--credentials)
6. [Daily Development Workflow](#daily-development-workflow)
7. [Useful Commands Reference](#useful-commands-reference)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have the following installed on your machine:

| Software | Minimum Version | Download Link |
|----------|-----------------|---------------|
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/downloads) |
| **Docker Desktop** | 4.0+ | [docker.com](https://www.docker.com/products/docker-desktop/) |
| **Python** | 3.11+ (3.13 recommended) | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ (LTS recommended) | [nodejs.org](https://nodejs.org/) |
| **PostgreSQL** | 15+ | [postgresql.org](https://www.postgresql.org/download/) |

### Verify Prerequisites

Run these commands to verify your installations:

```bash
# Check Git
git --version

# Check Docker
docker --version
docker-compose --version

# Check Python
python --version

# Check Node.js and npm
node --version
npm --version

# Check PostgreSQL
psql --version
```

---

## Clone the Repository

```bash
# Clone the repository
git clone <repository-url> DFC-APPLICATION

# Navigate to project directory
cd DFC-APPLICATION
```

---

## Quick Start (TL;DR)

For experienced developers who want to get started quickly:

```bash
# 1. Start Docker infrastructure services
docker-compose up -d

# 2. Setup PostgreSQL database (create database and user)
# Open pgAdmin or psql and create:
#   - Database: dfc_database
#   - User: postgres with password: dabiko

# 3. Setup Backend
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# 4. Setup Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/schema/swagger-ui/

---

## Detailed Setup

### Step 1: Start Infrastructure Services

The project uses Docker for infrastructure services (MinIO, Redis, Elasticsearch, RabbitMQ).

```bash
# From project root directory
docker-compose up -d
```

Wait for all containers to become healthy (about 60 seconds):

```bash
# Check container status
docker-compose ps
```

All services should show "healthy" status.

#### What Gets Started:

| Service | Port(s) | Purpose |
|---------|---------|---------|
| **MinIO** | 9000, 9001 | S3-compatible file storage |
| **Redis** | 6379 | Caching & Celery result backend |
| **Elasticsearch** | 9200, 9300 | Full-text search engine |
| **RabbitMQ** | 5672, 15672 | Message broker for Celery |

---

### Step 2: Setup PostgreSQL Database

The application uses PostgreSQL for the main database. You need to install PostgreSQL locally and create a database.

#### Option A: Using pgAdmin (GUI)

1. Open pgAdmin
2. Connect to your local PostgreSQL server
3. Create a new database:
   - Name: `dfc_database`
4. Ensure the postgres user has access (default password: `dabiko` or set your own)

#### Option B: Using psql (Command Line)

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE dfc_database;

# Set password (if not already set)
ALTER USER postgres WITH PASSWORD 'dabiko';

# Exit
\q
```

#### Option C: Using Docker PostgreSQL (Alternative)

If you prefer Docker for PostgreSQL, uncomment the postgres service in `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:latest
    container_name: dfc_postgres
    restart: always
    environment:
      POSTGRES_DB: dfc_database
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: dabiko
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql
```

Then run:
```bash
docker-compose up -d postgres
```

---

### Step 3: Setup Backend (Django)

#### 3.1 Create and Activate Virtual Environment

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (Command Prompt):
venv\Scripts\activate

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1

# Linux/Mac:
source venv/bin/activate
```

You should see `(venv)` in your terminal prompt.

#### 3.2 Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### 3.3 Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` if needed. Default values work for local development:

```env
# Key settings (defaults should work)
DEBUG=True
SECRET_KEY=your-secret-key-here-change-in-production
DATABASE_URL=postgres://postgres:dabiko@localhost:5432/dfc_database
MINIO_ENDPOINT=localhost:9000
REDIS_URL=redis://localhost:6379/0
ELASTICSEARCH_HOST=localhost
```

#### 3.4 Run Database Migrations

```bash
python manage.py migrate
```

#### 3.5 Create Admin User

```bash
python manage.py createsuperuser
```

Follow the prompts to create your admin account.

#### 3.6 Create MinIO Bucket (First Time Only)

1. Open MinIO Console: http://localhost:9001
2. Login with:
   - Username: `dfc_minio_admin`
   - Password: `dfc_minio_password_2025`
3. Click "Create Bucket"
4. Name: `dfc-documents`
5. Click "Create Bucket"

#### 3.7 Start Django Development Server

```bash
python manage.py runserver
```

Backend is now running at: **http://localhost:8000**

---

### Step 4: Setup Frontend (React)

Open a **new terminal** (keep the backend running).

#### 4.1 Install Node Dependencies

```bash
cd frontend
npm install
```

#### 4.2 Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Default values should work:

```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_API_BASE_URL=http://localhost:8000
```

#### 4.3 Start Development Server

```bash
npm run dev
```

Frontend is now running at: **http://localhost:5173**

---

## Service URLs & Credentials

### Application

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend** | http://localhost:5173 | React application |
| **Backend API** | http://localhost:8000 | Django REST API |
| **Swagger API Docs** | http://localhost:8000/api/schema/swagger-ui/ | Interactive API docs |
| **ReDoc API Docs** | http://localhost:8000/api/schema/redoc/ | Alternative API docs |
| **Django Admin** | http://localhost:8000/admin/ | Admin panel |

### Infrastructure Services

| Service | URL | Username | Password |
|---------|-----|----------|----------|
| **MinIO Console** | http://localhost:9001 | `dfc_minio_admin` | `dfc_minio_password_2025` |
| **RabbitMQ Management** | http://localhost:15672 | `dfc_rabbit` | `dfc_rabbit_password_2025` |
| **Elasticsearch** | http://localhost:9200 | - | - |

### Database Connection

| Parameter | Value |
|-----------|-------|
| Host | `localhost` |
| Port | `5432` |
| Database | `dfc_database` |
| Username | `postgres` |
| Password | `dabiko` |

---

## Daily Development Workflow

### Starting Your Development Session

```bash
# Terminal 1: Start Docker services (if not already running)
docker-compose up -d

# Terminal 2: Start Backend
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
python manage.py runserver

# Terminal 3: Start Frontend
cd frontend
npm run dev
```

### Optional: Start Celery Worker (for background tasks)

```bash
# Terminal 4: Celery Worker
cd backend
venv\Scripts\activate
celery -A config worker --loglevel=info

# Terminal 5: Celery Beat (scheduled tasks)
cd backend
venv\Scripts\activate
celery -A config beat --loglevel=info
```

### Stopping Development

```bash
# Stop Django/Frontend: Press Ctrl+C in each terminal

# Stop Docker services
docker-compose down

# Stop Docker and delete all data (use with caution!)
docker-compose down -v
```

---

## Useful Commands Reference

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View running containers
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f elasticsearch

# Restart a service
docker-compose restart minio
```

### Backend Commands

```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Run development server
python manage.py runserver

# Create migrations
python manage.py makemigrations

# Apply migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run tests
python manage.py test

# Open Django shell
python manage.py shell

# Rebuild search index
python manage.py search_index --rebuild
```

### Frontend Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Run Storybook (component library)
npm run storybook

# Run E2E tests
npm run cypress
```

---

## Troubleshooting

### Docker Issues

**Problem: Containers won't start**
```bash
# Check Docker is running
docker ps

# Check for port conflicts
netstat -ano | findstr :9000  # Windows
lsof -i :9000  # Linux/Mac

# Remove old containers and start fresh
docker-compose down -v
docker-compose up -d
```

**Problem: Elasticsearch keeps crashing**
```bash
# Elasticsearch needs more memory. Edit docker-compose.yml:
environment:
  - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
```

### Backend Issues

**Problem: ModuleNotFoundError**
```bash
# Ensure virtual environment is activated
venv\Scripts\activate  # Windows

# Reinstall dependencies
pip install -r requirements.txt
```

**Problem: Database connection error**
```bash
# Check PostgreSQL is running
psql -U postgres -h localhost -p 5432 -d dfc_database

# Verify .env settings match your PostgreSQL configuration
```

**Problem: MinIO connection error**
```bash
# Check MinIO is running
docker-compose ps minio

# Verify bucket exists at http://localhost:9001
```

### Frontend Issues

**Problem: npm install fails**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Problem: API connection error**
```bash
# Verify backend is running at http://localhost:8000
# Check .env has correct API URL:
VITE_API_URL=http://localhost:8000/api/v1
```

**Problem: CORS error in browser**
```bash
# Ensure backend CORS settings include frontend URL
# In backend .env:
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Port Conflicts

If default ports are in use, you can modify them:

| Service | Default Port | Config File |
|---------|-------------|-------------|
| Backend | 8000 | Run with `python manage.py runserver 8080` |
| Frontend | 5173 | Edit `frontend/vite.config.ts` |
| PostgreSQL | 5432 | Local PostgreSQL config |
| MinIO | 9000, 9001 | `docker-compose.yml` |
| Redis | 6379 | `docker-compose.yml` |
| Elasticsearch | 9200 | `docker-compose.yml` |
| RabbitMQ | 5672, 15672 | `docker-compose.yml` |

---

## Project Structure Overview

```
DFC-APPLICATION/
├── backend/               # Django backend
│   ├── apps/             # Django applications
│   │   ├── users/        # Authentication & user management
│   │   ├── documents/    # Document & folder management
│   │   ├── search/       # Elasticsearch integration
│   │   ├── audit/        # Audit logging
│   │   └── workflows/    # Celery tasks
│   ├── config/           # Django settings
│   ├── requirements.txt  # Python dependencies
│   └── manage.py         # Django CLI
│
├── frontend/             # React frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   └── store/        # Redux state management
│   ├── package.json      # Node dependencies
│   └── vite.config.ts    # Vite configuration
│
├── docker-compose.yml    # Docker services configuration
├── CLAUDE.md            # Project documentation
└── GETTING_STARTED.md   # This file
```

---

## Next Steps

After setup is complete:

1. **Login to the application** at http://localhost:5173 with your superuser credentials
2. **Explore the API** at http://localhost:8000/api/schema/swagger-ui/
3. **Read CLAUDE.md** for detailed project architecture and conventions
4. **Check the docs/ folder** for additional documentation

---

## Support

For issues:
- Check logs: `docker-compose logs -f` (Docker) or terminal output (Django/React)
- Review the main `CLAUDE.md` for project documentation
- Verify all services are running: `docker-compose ps`

---

**Happy coding!**
