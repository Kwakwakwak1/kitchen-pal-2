#!/bin/bash

# Kitchen Pal Development Environment Setup (Production-Safe)
# This script sets up development to run alongside production Docker containers

set -e

echo "🚀 Setting up Kitchen Pal Development Environment (Production-Safe)..."

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

print_status "Installing dependencies..."
npm install

print_status "Setting up development database (separate from production)..."

# Check if production containers are running
if docker ps | grep -q "kitchen-pal-db"; then
    print_warning "Production database container is running on port 5432"
    print_status "Development will use Docker database on port 5433"
    
    # Create a development docker-compose override
    cat > docker-compose.dev.yml << EOF
services:
  postgres-dev:
    image: postgres:15-alpine
    container_name: kitchen-pal-db-dev
    restart: unless-stopped
    environment:
      POSTGRES_DB: kitchen_pal_dev
      POSTGRES_USER: kitchen_pal_user
      POSTGRES_PASSWORD: kitchen_pal_password
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data_dev:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kitchen_pal_user -d kitchen_pal_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data_dev:
    driver: local
EOF

    # Start development database
    print_status "Starting development database on port 5433..."
    docker-compose -f docker-compose.dev.yml up -d postgres-dev
    
    # Wait for database to be ready
    print_status "Waiting for development database to be ready..."
    sleep 10
    
    # Update DATABASE_URL for development
    DEV_DATABASE_URL="postgresql://kitchen_pal_user:kitchen_pal_password@localhost:5433/kitchen_pal_dev"
    
elif pg_isready -h localhost -p 5432 &> /dev/null; then
    print_success "Local PostgreSQL is available on port 5432"
    print_status "Using local PostgreSQL for development"
    
    # Create development database
    print_status "Creating development database..."
    createdb kitchen_pal_dev 2>/dev/null || print_warning "Database might already exist"
    
    DEV_DATABASE_URL="postgresql://kitchen_pal_user:kitchen_pal_password@localhost:5432/kitchen_pal_dev"
    
else
    print_status "Starting development database with Docker on port 5433..."
    
    # Create development docker-compose
    cat > docker-compose.dev.yml << EOF
services:
  postgres-dev:
    image: postgres:15-alpine
    container_name: kitchen-pal-db-dev
    restart: unless-stopped
    environment:
      POSTGRES_DB: kitchen_pal_dev
      POSTGRES_USER: kitchen_pal_user
      POSTGRES_PASSWORD: kitchen_pal_password
      PGDATA: /var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data_dev:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kitchen_pal_user -d kitchen_pal_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data_dev:
    driver: local
EOF

    docker-compose -f docker-compose.dev.yml up -d postgres-dev
    sleep 10
    
    DEV_DATABASE_URL="postgresql://kitchen_pal_user:kitchen_pal_password@localhost:5433/kitchen_pal_dev"
fi

# Set development environment variables
export DATABASE_URL="$DEV_DATABASE_URL"
export API_PORT=3005
export NODE_ENV=development
export REQUIRE_EMAIL_VERIFICATION=false

print_status "Using development database: $DEV_DATABASE_URL"
print_status "Development API will run on port 3005 (production uses 3004)"

# Run Prisma migrations
print_status "Running database migrations..."
DATABASE_URL="$DEV_DATABASE_URL" npx prisma migrate dev --name init

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Seed the database
print_status "Seeding database with development data..."
DATABASE_URL="$DEV_DATABASE_URL" node scripts/seed-dev-data.js

print_success "Development environment setup complete!"

echo ""
echo "🎉 Your development environment is ready to run alongside production!"
echo ""
echo "📋 Development Configuration:"
echo "   Database: $DEV_DATABASE_URL"
echo "   Backend API: http://localhost:3005"
echo "   Frontend: http://localhost:5173"
echo ""
echo "📋 Production URLs (if running):"
echo "   Production Site: https://kitchen-pal.kwakwakwak.com"
echo "   Production Admin: http://localhost:5050 (pgAdmin)"
echo ""
echo "🚀 To start development servers:"
echo "   Backend:  API_PORT=3005 DATABASE_URL='$DEV_DATABASE_URL' npm run server:dev"
echo "   Frontend: VITE_API_URL='http://localhost:3005' npm run dev"
echo "   Both:     npm run dev:safe"
echo ""
echo "🔧 Database management:"
echo "   Prisma Studio: DATABASE_URL='$DEV_DATABASE_URL' npm run db:studio"
echo ""

# Create convenient npm script
print_status "Adding convenient development scripts to package.json..."

# Create a temporary script for starting dev with correct ports
cat > start-dev-safe.sh << EOF
#!/bin/bash
export DATABASE_URL="$DEV_DATABASE_URL"
export API_PORT=3005
export NODE_ENV=development
export REQUIRE_EMAIL_VERIFICATION=false

echo "🚀 Starting development environment (production-safe)..."
echo "   Backend API: http://localhost:3005"
echo "   Frontend: http://localhost:5173"
echo ""

# Start both frontend and backend with correct environment
concurrently \\
  "API_PORT=3005 DATABASE_URL='$DEV_DATABASE_URL' npm run server:dev" \\
  "VITE_API_URL='http://localhost:3005' npm run dev"
EOF

chmod +x start-dev-safe.sh

print_success "Created start-dev-safe.sh script for easy development startup"
echo "" 