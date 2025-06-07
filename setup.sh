#!/bin/bash

# Kitchen Pal Docker Setup Script
# This script helps you get started with the Docker deployment

set -e

echo "🍳 Kitchen Pal Docker Setup"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check prerequisites
echo "Checking prerequisites..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_status "Docker is installed"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_status "Docker Compose is installed"

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating from template..."
    if [ -f environment.template ]; then
        cp environment.template .env
        print_info "Please edit .env file with your actual values before continuing."
        print_info "Required variables: POSTGRES_PASSWORD, PGADMIN_PASSWORD, GEMINI_API_KEY, etc."
        echo
        read -p "Press Enter after you've configured .env file..."
    else
        print_error "environment.template not found. Please create .env file manually."
        exit 1
    fi
else
    print_status ".env file exists"
fi

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p nginx/ssl
mkdir -p database
mkdir -p cloudflare
print_status "Directories created"

# Generate SSL certificates for local development
if [ ! -f nginx/ssl/cert.pem ]; then
    print_info "Generating self-signed SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout nginx/ssl/key.pem \
        -out nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=KitchenPal/CN=kitchen-pal.kwakwakwak.com" \
        >/dev/null 2>&1
    print_status "SSL certificates generated"
else
    print_status "SSL certificates already exist"
fi

# Check for Cloudflare tunnel setup
if [ ! -f cloudflare/cert.pem ]; then
    print_warning "Cloudflare tunnel credentials not found."
    print_info "You need to set up Cloudflare tunnel manually. See DEPLOYMENT.md for details."
    echo
    read -p "Do you want to continue without Cloudflare tunnel? (y/N): " continue_without_tunnel
    if [[ ! $continue_without_tunnel =~ ^[Yy]$ ]]; then
        print_info "Please set up Cloudflare tunnel first and rerun this script."
        exit 1
    fi
fi

# Ask user what they want to do
echo
echo "What would you like to do?"
echo "1) Build and start all services"
echo "2) Build only"
echo "3) Start existing services"
echo "4) View logs"
echo "5) Stop all services"
echo "6) Clean up (remove containers and volumes)"

read -p "Choose an option (1-6): " choice

case $choice in
    1)
        print_info "Building and starting all services..."
        docker-compose build
        docker-compose up -d
        print_status "All services started"
        
        print_info "Waiting for services to be ready..."
        sleep 10
        
        # Check service status
        echo
        echo "Service Status:"
        docker-compose ps
        
        echo
        print_info "Access your application at:"
        echo "  - Main app: http://localhost (or your configured domain)"
        echo "  - pgAdmin: http://localhost:5050"
        
        if [ -f cloudflare/cert.pem ]; then
            echo "  - Public access: https://kitchen-pal.kwakwakwak.com"
        fi
        ;;
    2)
        print_info "Building containers..."
        docker-compose build
        print_status "Build completed"
        ;;
    3)
        print_info "Starting services..."
        docker-compose up -d
        print_status "Services started"
        docker-compose ps
        ;;
    4)
        print_info "Showing logs (press Ctrl+C to exit)..."
        docker-compose logs -f
        ;;
    5)
        print_info "Stopping all services..."
        docker-compose down
        print_status "All services stopped"
        ;;
    6)
        print_warning "This will remove all containers and data volumes!"
        read -p "Are you sure? (y/N): " confirm
        if [[ $confirm =~ ^[Yy]$ ]]; then
            docker-compose down -v
            docker system prune -f
            print_status "Cleanup completed"
        else
            print_info "Cleanup cancelled"
        fi
        ;;
    *)
        print_error "Invalid option"
        exit 1
        ;;
esac

echo
print_info "For more detailed instructions, see DEPLOYMENT.md"
print_info "For troubleshooting, run: docker-compose logs" 