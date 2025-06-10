#!/bin/bash

# Function to kill processes on a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pids" ]; then
        echo "🧹 Cleaning up processes on port $port..."
        echo "$pids" | xargs kill -9 2>/dev/null
        sleep 1
        echo "✅ Port $port is now available"
    fi
}

# Clean up ports before starting
echo "🚀 Starting development environment (production-safe)..."
echo "🔍 Checking and cleaning up ports..."

# Kill any processes on our required ports
kill_port 3005  # Backend API
kill_port 5173  # Frontend dev server

echo ""
echo "   Backend API: http://localhost:3005"
echo "   Frontend: http://localhost:5173"
echo ""

export DATABASE_URL="postgresql://kitchen_pal_user:kitchen_pal_password@localhost:5433/kitchen_pal_dev"
export API_PORT=3005
export NODE_ENV=development
export REQUIRE_EMAIL_VERIFICATION=false

# Start both frontend and backend with correct environment
concurrently \
  "API_PORT=3005 DATABASE_URL='postgresql://kitchen_pal_user:kitchen_pal_password@localhost:5433/kitchen_pal_dev' npm run server:dev" \
  "VITE_API_URL='http://localhost:3005' npm run dev"
