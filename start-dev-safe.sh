#!/bin/bash
export DATABASE_URL="postgresql://kitchen_pal_user:kitchen_pal_password@localhost:5433/kitchen_pal_dev"
export API_PORT=3005
export NODE_ENV=development
export REQUIRE_EMAIL_VERIFICATION=false

echo "🚀 Starting development environment (production-safe)..."
echo "   Backend API: http://localhost:3005"
echo "   Frontend: http://localhost:5173"
echo ""

# Start both frontend and backend with correct environment
concurrently \
  "API_PORT=3005 DATABASE_URL='postgresql://kitchen_pal_user:kitchen_pal_password@localhost:5433/kitchen_pal_dev' npm run server:dev" \
  "VITE_API_URL='http://localhost:3005' npm run dev"
