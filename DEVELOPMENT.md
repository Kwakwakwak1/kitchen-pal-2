# Kitchen Pal - Development Guide

This guide will help you set up a complete development environment for Kitchen Pal, including admin accounts, test data, and proper configuration for local development.

## Quick Start

### 1. Environment Setup

First, configure your environment for development:

```bash
# Configure .env for development
chmod +x scripts/env-helper.sh
./scripts/env-helper.sh dev
```

### 2. Database Setup

Choose one of these options:

#### Option A: Local PostgreSQL (Recommended for development)
```bash
# Install PostgreSQL if you haven't already
# macOS: brew install postgresql
# Start PostgreSQL service
brew services start postgresql

# Run the development setup script
npm run setup:dev
```

#### Option B: Docker PostgreSQL
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait a moment for the database to start, then:
npm run setup:dev
```

### 3. Start Development Servers

```bash
# Start both frontend and backend together
npm run dev:full

# OR start them separately:
# Terminal 1: Backend
npm run server:dev

# Terminal 2: Frontend  
npm run dev
```

Your app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3004
- **Prisma Studio**: http://localhost:5555 (run `npm run db:studio`)

## Admin Accounts

The development database comes with pre-configured admin accounts:

### Primary Admin Account
- **Email**: `admin@kitchen-pal.local`
- **Password**: `admin123`
- **Role**: Full admin access

### Developer Account  
- **Email**: `dev@kitchen-pal.local`
- **Password**: `dev123`
- **Role**: Full admin access

### Test User Account
- **Email**: `test@kitchen-pal.local`
- **Password**: `test123`
- **Role**: Regular user with sample data

## Development Features

### Email Verification
- **Disabled by default** in development (`REQUIRE_EMAIL_VERIFICATION=false`)
- All new users are automatically verified
- You can still test email functionality by enabling it in `.env`

### Sample Data
The development database includes:
- 3 sample recipes with ingredients
- Sample inventory for the test user
- Pre-configured admin accounts

### Database Management

```bash
# Open Prisma Studio (visual database editor)
npm run db:studio

# Reset database and reseed with fresh data
npm run db:reset

# Just reseed existing database
npm run db:seed

# Run migrations
npm run db:migrate

# Generate Prisma client after schema changes
npm run db:generate
```

## Environment Management

Use the environment helper script to switch between development and production:

```bash
# Check current configuration
./scripts/env-helper.sh check

# Configure for development
./scripts/env-helper.sh dev

# Configure for production (when deploying)
./scripts/env-helper.sh prod

# Backup current .env
./scripts/env-helper.sh backup

# Restore from backup
./scripts/env-helper.sh restore
```

## Available Scripts

### Development Scripts
- `npm run dev` - Start frontend development server
- `npm run server:dev` - Start backend with auto-reload
- `npm run dev:full` - Start both frontend and backend
- `npm run setup:dev` - Complete development environment setup

### Database Scripts
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with development data
- `npm run db:reset` - Reset database and reseed
- `npm run db:migrate` - Run database migrations
- `npm run db:generate` - Generate Prisma client

### Docker Scripts (Production/Testing)
- `npm run docker:up` - Start all services with Docker
- `npm run docker:down` - Stop all Docker services
- `npm run docker:logs` - View Docker logs

## Testing Features

### Admin Panel Access
1. Log in with an admin account (`admin@kitchen-pal.local`)
2. Navigate to the Admin Dashboard
3. Test user management, system stats, and other admin features

### Recipe Management
1. Log in with any account
2. Create, edit, and manage recipes
3. Test the recipe import functionality
4. Add ingredients to recipes

### Inventory Management
1. Use the test account to see sample inventory
2. Add, edit, and remove inventory items
3. Test inventory tracking features

### Email Testing
If you want to test email functionality:

1. Enable email verification in `.env`:
   ```
   REQUIRE_EMAIL_VERIFICATION=true
   ```

2. Configure your email settings (already set up in your `.env`)

3. Test signup, email verification, and password reset flows

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# If using Docker:
docker-compose ps postgres

# Reset database completely
npm run db:reset
```

### Port Conflicts
- Frontend (5173): Check if another Vite app is running
- Backend (3004): Check if another Node.js app is using the port
- Database (5432): Check if PostgreSQL is already running

### Permission Issues
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Clear Everything and Start Fresh
```bash
# Stop all services
docker-compose down -v

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset database
npm run db:reset

# Restart development
npm run dev:full
```

## Development Workflow

### Making Changes

1. **Frontend Changes**: 
   - Edit files in `src/`
   - Vite will hot-reload automatically
   - Check browser console for errors

2. **Backend Changes**:
   - Edit files in `server/`
   - Backend will auto-restart (using `--watch`)
   - Check terminal for errors

3. **Database Schema Changes**:
   ```bash
   # Edit prisma/schema.prisma
   npm run db:migrate
   npm run db:generate
   ```

### Testing Before Production

1. Test all functionality with different user accounts
2. Verify admin features work correctly  
3. Test email flows if enabled
4. Check that database changes are properly migrated

### Deploying Changes

1. **Switch to production configuration**:
   ```bash
   ./scripts/env-helper.sh prod
   ```

2. **Build and deploy**:
   ```bash
   npm run docker:deploy
   ```

3. **Switch back to development**:
   ```bash
   ./scripts/env-helper.sh dev
   ```

## Advanced Development

### Adding New Admin Users
Edit `scripts/seed-dev-data.js` and add new users to the `adminUsers` array, then run:
```bash
npm run db:seed
```

### Custom Sample Data
Modify the sample data in `scripts/seed-dev-data.js`:
- Add more recipes
- Create different user scenarios
- Add sample shopping lists or meal plans

### Environment Variables
Key development environment variables:
- `NODE_ENV=development` - Enables development features
- `REQUIRE_EMAIL_VERIFICATION=false` - Skips email verification
- `DATABASE_URL` - Points to local database
- `FRONTEND_URL=http://localhost:5173` - For CORS and redirects

## Need Help?

1. Check the main README.md for general information
2. Check DEPLOYMENT.md for production deployment
3. Look at the existing test files in the project
4. Check the console logs for error messages
5. Use Prisma Studio to inspect database state

---
workflow: 
Production Deploy:
✅ Easy switch: ./scripts/env-helper.sh prod
✅ Deploy: npm run docker:deploy
✅ Switch back: ./scripts/env-helper.sh dev
Database Testing:
✅ Visual database editor: npm run db:studio
✅ Reset database: npm run db:reset
✅ Fresh test data anytime
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