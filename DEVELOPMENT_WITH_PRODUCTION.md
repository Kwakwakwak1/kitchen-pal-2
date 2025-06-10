# Running Development Alongside Production

This guide explains how to run both production (Docker) and development environments simultaneously without port conflicts.

## 🚨 The Problem

When running production via Docker, these ports are occupied:
- **5432** - PostgreSQL Database
- **3004** - Backend API (internal, via nginx)
- **5050** - pgAdmin
- **6379** - Redis
- **80/443** - Nginx (public web server)

Development tries to use some of the same ports, causing conflicts.

## ✅ The Solution

We've created a **production-safe development setup** that uses different ports:

| Service | Production (Docker) | Development | Conflict Resolved |
|---------|--------------------|--------------|--------------------|
| Database | 5432 | **5433** | ✅ Different port |
| Backend API | 3004 (internal) | **3005** | ✅ Different port |
| Frontend | 3000 (internal) | **5173** | ✅ Already different |

## 🚀 Quick Start

### 1. Start Production (Docker)
```bash
# Configure for production
./scripts/env-helper.sh prod

# Start production containers
npm run docker:up
```

### 2. Set Up Development (Production-Safe)
```bash
# Run the production-safe development setup
npm run setup:dev:safe
```

### 3. Start Development Servers
```bash
# Start both development servers (safe ports)
npm run dev:safe
```

## 📋 Result

You'll have both environments running simultaneously:

### Production Environment
- **URL**: https://kitchen-pal.kwakwakwak.com (via Cloudflare)
- **Database**: PostgreSQL on port 5432 (Docker)
- **Admin Panel**: http://localhost:5050 (pgAdmin)
- **Purpose**: Live production site

### Development Environment  
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3005
- **Database**: PostgreSQL on port 5433 (separate Docker container)
- **Purpose**: Local development and testing

## 🔧 Key Differences

### Separate Databases
- **Production DB**: `kitchen_pal` on port 5432
- **Development DB**: `kitchen_pal_dev` on port 5433
- Changes in development won't affect production data

### Different API Ports
- **Production API**: Port 3004 (internal, accessed via nginx)
- **Development API**: Port 3005 (direct access)

### Independent Admin Accounts
Both environments have their own admin accounts:
- Production: Use your production admin accounts
- Development: `admin@kitchen-pal.local` / `admin123`

## 🛠️ Development Commands

```bash
# Start development (production-safe)
npm run dev:safe

# Manual start (if needed)
API_PORT=3005 VITE_API_URL='http://localhost:3005' npm run dev:full

# Database management (development)
DATABASE_URL='postgresql://kitchen_pal_user:kitchen_pal_password@localhost:5433/kitchen_pal_dev' npm run db:studio

# Reset development database
DATABASE_URL='postgresql://kitchen_pal_user:kitchen_pal_password@localhost:5433/kitchen_pal_dev' npm run db:reset
```

## 🔄 Workflow

### Typical Development Process
1. **Keep production running**: `npm run docker:up`
2. **Work in development**: `npm run dev:safe`
3. **Test changes**: Use development environment
4. **Deploy when ready**: Changes go through your normal deployment process

### Environment Switching
```bash
# Check current configuration
./scripts/env-helper.sh check

# Switch to production config (for deployment)
./scripts/env-helper.sh prod

# Switch back to development
./scripts/env-helper.sh dev
```

## 🚨 Important Notes

### Database Separation
- Development and production databases are **completely separate**
- Changes in development won't affect production
- Each has its own admin users and sample data

### Port Awareness
- Development frontend connects to development API (port 3005)
- Production frontend connects to production API (via nginx)
- No cross-environment communication

### Environment Variables
The production-safe setup automatically handles environment variables:
- `API_PORT=3005` for development backend
- `VITE_API_URL=http://localhost:3005` for development frontend
- `DATABASE_URL` points to development database

## 🧹 Cleanup

### Stop Development Only
```bash
# Stop development servers (Ctrl+C)
# Development database container stays running
```

### Stop Development Database
```bash
# Stop development database container
docker-compose -f docker-compose.dev.yml down
```

### Stop Everything
```bash
# Stop production
npm run docker:down

# Stop development database
docker-compose -f docker-compose.dev.yml down

# Clean up development files
rm -f start-dev-safe.sh docker-compose.dev.yml
```

## ✅ Benefits

1. **Test safely**: Development changes don't affect production
2. **Real production testing**: Your production site runs live while you develop
3. **Compare environments**: Easy to compare development vs production behavior
4. **Independent data**: Each environment has its own database and users
5. **No downtime**: Production keeps running while you develop

📋 Login Credentials
Admin Access (for testing admin features):
Email: admin@kitchen-pal.local
Password: admin123
Developer Account (also admin):
Email: dev@kitchen-pal.local
Password: dev123
Test User (with sample inventory):
Email: test@kitchen-pal.local
Password: test123