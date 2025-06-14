#!/bin/bash

# Kitchen Pal Deployment Script
# Handles Docker Hub connectivity issues and provides robust deployment

set -e

echo "🚀 Starting Kitchen Pal deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker status..."
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    fi
    print_status "Docker is running ✓"
}

# Check network connectivity
check_connectivity() {
    print_status "Checking Docker Hub connectivity..."
    if curl -s --connect-timeout 5 https://registry-1.docker.io/v2/ >/dev/null; then
        print_status "Docker Hub is accessible ✓"
        return 0
    else
        print_warning "Docker Hub connectivity issues detected"
        return 1
    fi
}

# Try to pull base images manually
pull_base_images() {
    print_status "Attempting to pull base images..."
    local images=("node:20-alpine" "postgres:15-alpine" "nginx:alpine" "redis:7-alpine" "dpage/pgadmin4:latest" "cloudflare/cloudflared:latest")
    
    for image in "${images[@]}"; do
        print_status "Pulling $image..."
        if docker pull "$image" 2>/dev/null; then
            print_status "Successfully pulled $image ✓"
        else
            print_warning "Failed to pull $image"
        fi
    done
}

# Build application images
build_apps() {
    print_status "Building application images..."
    
    # Try building each service individually
    local services=("frontend" "backend" "recipe-proxy")
    
    for service in "${services[@]}"; do
        print_status "Building $service..."
        if docker-compose build "$service" 2>/dev/null; then
            print_status "Successfully built $service ✓"
        else
            print_error "Failed to build $service"
            return 1
        fi
    done
}

# Start services in order
start_services() {
    print_status "Starting services..."
    
    # Start core infrastructure first
    print_status "Starting database and cache services..."
    docker-compose up -d postgres redis
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Start application services
    print_status "Starting application services..."
    docker-compose up -d backend frontend recipe-proxy
    
    # Start nginx and other services
    print_status "Starting web server and additional services..."
    docker-compose up -d nginx pgadmin
    
    # Start cloudflare tunnel if token is available
    if [ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
        print_status "Starting Cloudflare tunnel..."
        docker-compose up -d cloudflared
    else
        print_warning "CLOUDFLARE_TUNNEL_TOKEN not set, skipping tunnel deployment"
    fi
}

# Check service health
check_health() {
    print_status "Checking service health..."
    docker-compose ps
    
    # Test database connection
    if docker-compose exec -T postgres pg_isready -U kitchen_pal_user -d kitchen_pal >/dev/null 2>&1; then
        print_status "Database is healthy ✓"
    else
        print_warning "Database health check failed"
    fi
}

# Main deployment function
deploy() {
    check_docker
    
    # Check if environment file exists
    if [ ! -f .env ]; then
        print_warning "No .env file found. Copying from environment.template..."
        cp environment.template .env
        print_warning "Please edit .env file with your actual values before deploying!"
        exit 1
    fi
    
    # Load environment variables
    # set -a
    # source .env 2>/dev/null || true
    # set +a
    
    # Check connectivity and attempt different deployment strategies
    if check_connectivity; then
        print_status "Using standard deployment method..."
        
        # Try standard docker-compose deployment
        if pull_base_images && build_apps; then
            start_services
        else
            print_error "Standard deployment failed"
            exit 1
        fi
    else
        print_warning "Docker Hub connectivity issues. Trying alternative approaches..."
        
        # Try to start with existing images
        print_status "Attempting deployment with existing images..."
        if docker-compose up -d --no-recreate 2>/dev/null; then
            print_status "Deployment successful using existing images ✓"
        else
            print_error "All deployment methods failed"
            print_error "Please check your network connection and Docker configuration"
            exit 1
        fi
    fi
    
    # Final health check
    sleep 5
    check_health
    
    print_status "🎉 Deployment completed successfully!"
    print_status "Access your application at: https://kitchen-pal.kwakwakwak.com"
    print_status "Or locally at: http://localhost"
    print_status ""
    print_status "To view logs: npm run docker:logs"
    print_status "To check status: npm run docker:status"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        deploy
        ;;
    "pull")
        check_docker
        pull_base_images
        ;;
    "build")
        check_docker
        build_apps
        ;;
    "start")
        check_docker
        start_services
        ;;
    "health")
        check_health
        ;;
    *)
        echo "Usage: $0 [deploy|pull|build|start|health]"
        echo "  deploy  - Full deployment (default)"
        echo "  pull    - Pull base images only"
        echo "  build   - Build application images only"
        echo "  start   - Start services only"
        echo "  health  - Check service health"
        exit 1
        ;;
esac 