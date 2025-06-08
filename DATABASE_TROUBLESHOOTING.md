# Database Troubleshooting Guide

## Common Issues and Solutions

### PostgreSQL Authentication Issues After Redeploy

**Problem**: After running `npm run docker:deploy`, you get authentication errors like:
- `FATAL: password authentication failed for user "kitchen_pal_user"`
- 401 Unauthorized errors in pgAdmin
- Connection refused errors

**Root Cause**: The PostgreSQL Docker container and initialization scripts sometimes have timing or configuration conflicts during user creation.

### Permanent Solution

1. **Always use the combined deployment command**:
   ```bash
   npm run docker:deploy-and-fix
   ```

2. **Or run the fix manually after deployment**:
   ```bash
   npm run docker:deploy
   npm run docker:fix-db
   ```

3. **Or use the script directly**:
   ```bash
   ./fix-database-password.sh
   ```

### What the Fix Does

1. **Waits for PostgreSQL** to be fully ready
2. **Sets the password explicitly** for `kitchen_pal_user`
3. **Tests the connection** to verify it works
4. **Restarts pgAdmin** to refresh its connections

### Access Information

- **pgAdmin URL**: http://localhost:5050/pgadmin/
- **pgAdmin Login**: admin@gmail.com / admin123
- **Database Host**: postgres (from containers) or localhost (external)
- **Database Port**: 5432
- **Database Name**: kitchen_pal
- **Database User**: kitchen_pal_user
- **Database Password**: kitchen_pal_password

### Files Changed for This Fix

1. **`database/init.sql`**: Removed conflicting user creation
2. **`database/servers.json`**: Fixed pgAdmin server configuration
3. **`database/pgpass`**: Added password file for pgAdmin
4. **`database/fix-password.sql`**: Password enforcement script
5. **`docker-compose.yml`**: Updated volumes and initialization order
6. **`fix-database-password.sh`**: Manual fix script
7. **`package.json`**: Added helper npm scripts

### Prevention

- **Always use**: `npm run docker:deploy-and-fix` instead of just `npm run docker:deploy`
- **Create a .env file** from `environment.template` with your actual values
- **Don't modify the database password** in the Docker environment variables without updating all related files

### Manual Database Connection Testing

```bash
# Test from within Docker network
docker run --rm --network kitchen-pal-2_kitchen-pal-network postgres:15-alpine \
  psql "postgresql://kitchen_pal_user:kitchen_pal_password@postgres:5432/kitchen_pal" \
  -c "SELECT current_user, current_database();"

# Test direct connection (if psql is installed locally)
PGPASSWORD=kitchen_pal_password psql -h localhost -p 5432 -U kitchen_pal_user -d kitchen_pal
```

### Emergency Database Reset

If all else fails:
```bash
# Stop and remove everything
npm run docker:clean

# Start fresh
npm run docker:deploy-and-fix
```

This will destroy all data but ensure a clean start. 