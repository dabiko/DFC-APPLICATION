#!/bin/bash
# Docker Build, Test, and Deploy Script for DFC Application
# Usage: ./docker-deploy.sh [build|test|push|deploy|all]

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
REGISTRY="your-registry.com"  # Change this to your registry
PROJECT="dfc"
VERSION="1.0.0"

# Function to print colored messages
print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${NC}→ $1${NC}"; }

# Function to build Docker images
build_images() {
    print_info "Building Docker images..."
    docker-compose build --no-cache backend frontend celery_worker

    if [ $? -eq 0 ]; then
        print_success "Images built successfully"

        # Show image sizes
        print_info "Image sizes:"
        docker images | grep -E "dfc_(backend|frontend|celery)" | awk '{print $1 "\t" $7 " " $8}'
    else
        print_error "Build failed"
        exit 1
    fi
}

# Function to test Docker containers locally
test_containers() {
    print_info "Testing Docker containers locally..."

    # Stop any running containers
    docker-compose down

    # Start all services
    print_info "Starting all services..."
    docker-compose up -d

    # Wait for services to be healthy
    print_info "Waiting for services to be healthy (60 seconds)..."
    sleep 60

    # Check service health
    print_info "Checking service health..."

    # Check PostgreSQL
    if docker exec dfc_postgres pg_isready -U dfc_admin_user > /dev/null 2>&1; then
        print_success "PostgreSQL is healthy"
    else
        print_error "PostgreSQL is not healthy"
    fi

    # Check Redis
    if docker exec dfc_redis redis-cli ping | grep -q "PONG"; then
        print_success "Redis is healthy"
    else
        print_error "Redis is not healthy"
    fi

    # Check backend
    if curl -f http://localhost:8000/admin/ > /dev/null 2>&1; then
        print_success "Backend is responding"
    else
        print_warning "Backend might not be ready (this is OK if migrations haven't run)"
    fi

    # Check frontend
    if curl -f http://localhost:80/ > /dev/null 2>&1 || curl -f http://localhost:5173/ > /dev/null 2>&1; then
        print_success "Frontend is responding"
    else
        print_warning "Frontend might not be ready"
    fi

    # Show running containers
    print_info "Running containers:"
    docker-compose ps

    # Show logs
    print_info "Recent logs (last 20 lines):"
    docker-compose logs --tail=20
}

# Function to run database migrations
run_migrations() {
    print_info "Running database migrations..."
    docker exec dfc_backend python manage.py migrate

    if [ $? -eq 0 ]; then
        print_success "Migrations completed"
    else
        print_error "Migrations failed"
        exit 1
    fi
}

# Function to collect static files
collect_static() {
    print_info "Collecting static files..."
    docker exec dfc_backend python manage.py collectstatic --noinput

    if [ $? -eq 0 ]; then
        print_success "Static files collected"
    else
        print_error "Static collection failed"
        exit 1
    fi
}

# Function to tag images for registry
tag_images() {
    print_info "Tagging images for registry..."

    docker tag dfc_backend:latest ${REGISTRY}/${PROJECT}/backend:${VERSION}
    docker tag dfc_backend:latest ${REGISTRY}/${PROJECT}/backend:latest
    docker tag dfc_frontend:latest ${REGISTRY}/${PROJECT}/frontend:${VERSION}
    docker tag dfc_frontend:latest ${REGISTRY}/${PROJECT}/frontend:latest
    docker tag dfc_celery_worker:latest ${REGISTRY}/${PROJECT}/celery:${VERSION}
    docker tag dfc_celery_worker:latest ${REGISTRY}/${PROJECT}/celery:latest

    print_success "Images tagged"

    # Show tagged images
    print_info "Tagged images:"
    docker images | grep "${REGISTRY}/${PROJECT}"
}

# Function to push images to registry
push_images() {
    print_info "Pushing images to registry..."
    print_warning "Make sure you're logged in: docker login ${REGISTRY}"

    docker push ${REGISTRY}/${PROJECT}/backend:${VERSION}
    docker push ${REGISTRY}/${PROJECT}/backend:latest
    docker push ${REGISTRY}/${PROJECT}/frontend:${VERSION}
    docker push ${REGISTRY}/${PROJECT}/frontend:latest
    docker push ${REGISTRY}/${PROJECT}/celery:${VERSION}
    docker push ${REGISTRY}/${PROJECT}/celery:latest

    print_success "Images pushed to registry"
}

# Function to deploy to production
deploy_production() {
    print_warning "This will deploy to production!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        print_info "Deployment cancelled"
        exit 0
    fi

    print_info "Pulling latest images from registry..."
    docker-compose -f docker-compose.prod.yml pull

    print_info "Starting production containers..."
    docker-compose -f docker-compose.prod.yml up -d

    print_info "Running migrations..."
    docker exec dfc_backend python manage.py migrate

    print_info "Collecting static files..."
    docker exec dfc_backend python manage.py collectstatic --noinput

    print_success "Production deployment complete"

    print_info "Production status:"
    docker-compose -f docker-compose.prod.yml ps
}

# Function to show image information
show_info() {
    print_info "Docker Images Information:"
    echo ""

    print_info "Built images:"
    docker images | grep -E "dfc_|${REGISTRY}/${PROJECT}" || echo "No images found"
    echo ""

    print_info "Running containers:"
    docker-compose ps || echo "No containers running"
    echo ""

    print_info "Disk usage:"
    docker system df
}

# Main script logic
case "${1:-help}" in
    build)
        build_images
        ;;
    test)
        test_containers
        ;;
    migrate)
        run_migrations
        ;;
    static)
        collect_static
        ;;
    tag)
        tag_images
        ;;
    push)
        push_images
        ;;
    deploy)
        deploy_production
        ;;
    all)
        build_images
        test_containers
        run_migrations
        collect_static
        tag_images
        print_success "All steps completed!"
        print_info "To push to registry, run: $0 push"
        ;;
    info)
        show_info
        ;;
    help|*)
        echo "Docker Build, Test, and Deploy Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  build    - Build Docker images"
        echo "  test     - Test containers locally"
        echo "  migrate  - Run database migrations"
        echo "  static   - Collect static files"
        echo "  tag      - Tag images for registry"
        echo "  push     - Push images to registry"
        echo "  deploy   - Deploy to production"
        echo "  all      - Build, test, migrate, and tag (recommended)"
        echo "  info     - Show image and container information"
        echo "  help     - Show this help message"
        echo ""
        echo "Example workflow:"
        echo "  $0 build      # Build images"
        echo "  $0 test       # Test locally"
        echo "  $0 migrate    # Run migrations"
        echo "  $0 tag        # Tag for registry"
        echo "  $0 push       # Push to registry"
        echo ""
        ;;
esac
