#!/bin/bash

# Fix Database Password Script
# Run this after docker-compose up to ensure the password is set correctly

echo "🔧 Fixing database password..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec kitchen-pal-db pg_isready -U kitchen_pal_user -d kitchen_pal; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Set the password explicitly
echo "🔑 Setting password for kitchen_pal_user..."
docker exec -it kitchen-pal-db psql -U kitchen_pal_user -d kitchen_pal -c "ALTER USER kitchen_pal_user PASSWORD 'kitchen_pal_password';"

echo "✅ Password has been set!"

# Test the connection
echo "🧪 Testing connection..."
if docker run --rm --network kitchen-pal-2_kitchen-pal-network postgres:15-alpine psql "postgresql://kitchen_pal_user:kitchen_pal_password@postgres:5432/kitchen_pal" -c "SELECT 'Connection successful!' as status;" > /dev/null 2>&1; then
    echo "✅ Database connection test successful!"
else
    echo "❌ Database connection test failed!"
    exit 1
fi

# Restart pgAdmin to refresh connections
echo "🔄 Restarting pgAdmin..."
docker restart kitchen-pal-pgadmin

echo "✅ All done! Database password has been fixed."
echo "📝 You can now access pgAdmin at: http://localhost:5050/pgadmin/"
echo "🔑 pgAdmin login: admin@gmail.com / admin123" 