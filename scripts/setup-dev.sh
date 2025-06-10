#!/bin/bash

# Kitchen Pal Development Environment Setup Script
# This script sets up your local development environment

set -e

echo "🚀 Setting up Kitchen Pal Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PostgreSQL is running locally
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL CLI not found. You might need to install PostgreSQL or use Docker."
fi

print_status "Installing dependencies..."
npm install

print_status "Setting up development database..."

# Check if local PostgreSQL is running
if pg_isready -h localhost -p 5432 &> /dev/null; then
    print_success "Local PostgreSQL is running"
    
    # Create database if it doesn't exist
    print_status "Creating development database..."
    createdb kitchen_pal || print_warning "Database might already exist"
    
    # Run Prisma migrations
    print_status "Running database migrations..."
    npx prisma migrate dev --name init
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npx prisma generate
    
    # Seed the database
    print_status "Seeding database with development data..."
    npm run db:seed
    
else
    print_warning "Local PostgreSQL not running. Starting with Docker..."
    
    # Start only the database container
    print_status "Starting PostgreSQL with Docker..."
    docker-compose up -d postgres
    
    # Wait for database to be ready
    print_status "Waiting for database to be ready..."
    sleep 10
    
    # Run Prisma migrations
    print_status "Running database migrations..."
    npx prisma migrate dev --name init
    
    # Generate Prisma client
    print_status "Generating Prisma client..."
    npx prisma generate
    
    # Seed the database
    print_status "Seeding database with development data..."
    npm run db:seed
fi

print_success "Development environment setup complete!"

echo ""
echo "🎉 Your development environment is ready!"
echo ""
echo "📋 Available admin accounts for testing:"
echo "   Email: admin@kitchen-pal.local"
echo "   Password: admin123"
echo ""
echo "   Email: dev@kitchen-pal.local" 
echo "   Password: dev123"
echo ""
echo "🚀 To start development:"
echo "   Frontend: npm run dev"
echo "   Backend:  npm run server:dev"
echo "   Both:     npm run dev:full"
echo ""
echo "🔧 Database management:"
echo "   Prisma Studio: npm run db:studio"
echo "   pgAdmin:       http://localhost:5050 (if using Docker)"
echo ""
echo "⚙️  Your development server will run on:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3004"
echo "" 