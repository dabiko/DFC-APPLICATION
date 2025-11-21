@echo off
REM Docker Build, Test, and Deploy Script for DFC Application (Windows)
REM Usage: docker-deploy.bat [build|test|push|deploy|all]

setlocal enabledelayedexpansion

REM Configuration
set REGISTRY=your-registry.com
set PROJECT=dfc
set VERSION=1.0.0

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="build" goto build
if "%1"=="test" goto test
if "%1"=="migrate" goto migrate
if "%1"=="static" goto static
if "%1"=="tag" goto tag
if "%1"=="push" goto push
if "%1"=="info" goto info
if "%1"=="all" goto all
goto help

:build
echo [BUILD] Building Docker images...
docker-compose build --no-cache backend frontend celery_worker
if errorlevel 1 (
    echo [ERROR] Build failed
    exit /b 1
)
echo [SUCCESS] Images built successfully
echo.
echo [INFO] Image sizes:
docker images | findstr "dfc_"
goto end

:test
echo [TEST] Testing Docker containers locally...
echo [INFO] Stopping existing containers...
docker-compose down
echo.
echo [INFO] Starting all services...
docker-compose up -d
echo.
echo [INFO] Waiting 60 seconds for services to start...
timeout /t 60 /nobreak >nul
echo.
echo [INFO] Checking service health...

REM Check PostgreSQL
docker exec dfc_postgres pg_isready -U dfc_admin_user >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL is not healthy
) else (
    echo [SUCCESS] PostgreSQL is healthy
)

REM Check Redis
docker exec dfc_redis redis-cli ping | findstr "PONG" >nul
if errorlevel 1 (
    echo [ERROR] Redis is not healthy
) else (
    echo [SUCCESS] Redis is healthy
)

echo.
echo [INFO] Running containers:
docker-compose ps
echo.
echo [INFO] Recent logs:
docker-compose logs --tail=20
goto end

:migrate
echo [MIGRATE] Running database migrations...
docker exec dfc_backend python manage.py migrate
if errorlevel 1 (
    echo [ERROR] Migrations failed
    exit /b 1
)
echo [SUCCESS] Migrations completed
goto end

:static
echo [STATIC] Collecting static files...
docker exec dfc_backend python manage.py collectstatic --noinput
if errorlevel 1 (
    echo [ERROR] Static collection failed
    exit /b 1
)
echo [SUCCESS] Static files collected
goto end

:tag
echo [TAG] Tagging images for registry...
docker tag dfc_backend:latest %REGISTRY%/%PROJECT%/backend:%VERSION%
docker tag dfc_backend:latest %REGISTRY%/%PROJECT%/backend:latest
docker tag dfc_frontend:latest %REGISTRY%/%PROJECT%/frontend:%VERSION%
docker tag dfc_frontend:latest %REGISTRY%/%PROJECT%/frontend:latest
docker tag dfc_celery_worker:latest %REGISTRY%/%PROJECT%/celery:%VERSION%
docker tag dfc_celery_worker:latest %REGISTRY%/%PROJECT%/celery:latest
echo [SUCCESS] Images tagged
echo.
echo [INFO] Tagged images:
docker images | findstr "%REGISTRY%/%PROJECT%"
goto end

:push
echo [PUSH] Pushing images to registry...
echo [WARNING] Make sure you're logged in: docker login %REGISTRY%
echo.
docker push %REGISTRY%/%PROJECT%/backend:%VERSION%
docker push %REGISTRY%/%PROJECT%/backend:latest
docker push %REGISTRY%/%PROJECT%/frontend:%VERSION%
docker push %REGISTRY%/%PROJECT%/frontend:latest
docker push %REGISTRY%/%PROJECT%/celery:%VERSION%
docker push %REGISTRY%/%PROJECT%/celery:latest
echo [SUCCESS] Images pushed to registry
goto end

:info
echo [INFO] Docker Images Information:
echo.
echo Built images:
docker images | findstr "dfc_"
echo.
echo Running containers:
docker-compose ps
echo.
echo Disk usage:
docker system df
goto end

:all
echo [ALL] Running complete build and test workflow...
call :build
if errorlevel 1 goto end
echo.
call :test
if errorlevel 1 goto end
echo.
call :migrate
if errorlevel 1 goto end
echo.
call :static
if errorlevel 1 goto end
echo.
call :tag
if errorlevel 1 goto end
echo.
echo [SUCCESS] All steps completed!
echo [INFO] To push to registry, run: %0 push
goto end

:help
echo Docker Build, Test, and Deploy Script (Windows)
echo.
echo Usage: %0 [command]
echo.
echo Commands:
echo   build    - Build Docker images
echo   test     - Test containers locally
echo   migrate  - Run database migrations
echo   static   - Collect static files
echo   tag      - Tag images for registry
echo   push     - Push images to registry
echo   info     - Show image and container information
echo   all      - Build, test, migrate, and tag (recommended)
echo   help     - Show this help message
echo.
echo Example workflow:
echo   %0 build      # Build images
echo   %0 test       # Test locally
echo   %0 migrate    # Run migrations
echo   %0 tag        # Tag for registry
echo   %0 push       # Push to registry
echo.

:end
endlocal
