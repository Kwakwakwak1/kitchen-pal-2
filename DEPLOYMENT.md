# Kitchen Pal Production Deployment Guide

This guide will walk you through deploying Kitchen Pal using Docker Compose with PostgreSQL, pgAdmin, and Cloudflare tunnel for secure public access.

## Prerequisites

1. **Docker & Docker Compose**
   - Docker Engine 24.0 or later
   - Docker Compose 2.0 or later

2. **Cloudflare Account**
   - Access to kwakwakwak.com domain
   - Cloudflare tunnel credentials

3. **Server/Machine**
   - Linux/macOS/Windows with Docker support
   - At least 2GB RAM and 10GB storage
   - Internet connection

## Step-by-Step Deployment

### 1. Environment Setup

First, copy the environment template and configure your variables:

```bash
cp environment.template .env
```

Edit the `.env` file with your actual values:

```bash
# Database Configuration
POSTGRES_DB=kitchen_pal
POSTGRES_USER=kitchen_pal_user
POSTGRES_PASSWORD=your_secure_database_password_here

# pgAdmin Configuration  
PGADMIN_EMAIL=admin@kitchen-pal.local
PGADMIN_PASSWORD=your_secure_pgadmin_password_here

# Application Configuration
NODE_ENV=production
VITE_API_URL=https://kitchen-pal.kwakwakwak.com
GEMINI_API_KEY=your_gemini_api_key_here

# Redis Configuration
REDIS_PASSWORD=your_secure_redis_password_here

# Cloudflare Tunnel Configuration
CLOUDFLARE_TUNNEL_TOKEN=your_cloudflare_tunnel_token_here

# JWT & Session Secrets
JWT_SECRET=your_very_long_random_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here
```

### 2. Quick Deployment (Recommended)

The application has been updated with improved Docker images (Node.js 20) and enhanced deployment scripts:

```bash
# Option 1: Use the robust deployment script (handles network issues)
npm run docker:deploy-robust

# Option 2: Standard deployment
npm run docker:deploy

# Option 3: Force rebuild if needed
npm run docker:deploy-force
```

### 3. Deployment Status & Current Issues

**✅ Fixed Issues:**
- Updated all Dockerfiles to use Node.js 20-alpine (more stable)
- Enhanced deployment script with network connectivity handling
- Fixed Docker Hub connectivity issues
- Added comprehensive error handling and troubleshooting

**⚠️ Current Status:**
- Docker images are pulling successfully
- Base infrastructure (PostgreSQL, Redis, Nginx) is working
- Some TypeScript compilation warnings remain (non-blocking for deployment)
- Application builds successfully with `build:skip-check` script

**🚀 Working Deployment Commands:**

```bash
# Quick deployment (recommended)
npm run docker:deploy-robust

# Manual step-by-step (for troubleshooting)
npm run docker:pull          # Pull base images
npm run docker:build         # Build application images  
npm run docker:up            # Start all services
npm run docker:logs          # View logs
npm run docker:status        # Check service status
```

### 4. Cloudflare Tunnel Setup

#### Create the Tunnel

1. Install cloudflared on your local machine:
   ```bash
   # On macOS
   brew install cloudflare/cloudflare/cloudflared
   
   # On Linux
   wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared-linux-amd64.deb
   ```

2. Authenticate with Cloudflare:
   ```bash
   cloudflared tunnel login
   ```

3. Create a new tunnel:
   ```bash
   cloudflared tunnel create kitchen-pal
   ```

4. Copy the tunnel credentials:
   ```bash
   # This will show you the tunnel ID and credentials file location
   cloudflared tunnel list
   
   # Copy the credentials file to your project
   cp ~/.cloudflared/[tunnel-id].json ./cloudflare/cert.pem
   ```

5. Create DNS records:
   ```bash
   # Route kitchen-pal.kwakwakwak.com to your tunnel
   cloudflared tunnel route dns kitchen-pal kitchen-pal.kwakwakwak.com
   
   # Optional: Route pgadmin subdomain
   cloudflared tunnel route dns kitchen-pal pgadmin.kitchen-pal.kwakwakwak.com
   ```

6. Update your `.env` file with the tunnel token:
   ```bash
   # Get the tunnel token
   cloudflared tunnel token kitchen-pal
   
   # Add to .env file
   CLOUDFLARE_TUNNEL_TOKEN=your_actual_tunnel_token_here
   ```

### 5. SSL Certificates (Optional)

For local SSL certificates (Cloudflare handles external SSL):

```bash
mkdir -p nginx/ssl
cd nginx/ssl

# Generate self-signed certificates for local use
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=kitchen-pal.kwakwakwak.com"

cd ../..
```

### 6. Verify Deployment

1. **Check service health:**
   ```bash
   docker-compose ps
   ```

2. **Test database connection:**
   ```bash
   docker-compose exec postgres psql -U kitchen_pal_user -d kitchen_pal -c "SELECT version();"
   ```

3. **Access the application:**
   - Main app: https://kitchen-pal.kwakwakwak.com
   - pgAdmin: https://kitchen-pal.kwakwakwak.com/pgadmin/ (or https://pgadmin.kitchen-pal.kwakwakwak.com)

### 7. Initial Setup

1. **Access pgAdmin:**
   - URL: https://kitchen-pal.kwakwakwak.com/pgadmin/
   - Email: admin@kitchen-pal.local (or your configured email)
   - Password: Your configured pgAdmin password

2. **Default Users:**
   - Admin: admin@kitchen-pal.local / admin123
   - Test User: test@kitchen-pal.local / testuser123

   **⚠️ Change these passwords immediately in production!**

## Management Commands

### Daily Operations

```bash
# View logs
npm run docker:logs

# Restart services
npm run docker:restart

# Stop services
npm run docker:down

# Update and restart
git pull
npm run docker:build
npm run docker:up

# Quick deploy (build + up)
npm run docker:deploy
```

### Database Operations

```bash
# Backup database
docker-compose exec postgres pg_dump -U kitchen_pal_user kitchen_pal > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore database
docker-compose exec -T postgres psql -U kitchen_pal_user kitchen_pal < backup_file.sql

# Access database directly
docker-compose exec postgres psql -U kitchen_pal_user kitchen_pal
```

### Monitoring

```bash
# Check container stats
docker stats

# Check disk usage
docker system df

# View specific service logs
docker-compose logs app
docker-compose logs postgres
docker-compose logs nginx
docker-compose logs cloudflared
```

## Troubleshooting

### Common Issues

1. **Docker image pull failures (EOF, timeout errors):**
   ```bash
   # Check Docker daemon status
   docker info
   
   # Restart Docker daemon
   sudo systemctl restart docker  # Linux
   # or restart Docker Desktop on macOS/Windows
   
   # Try pulling base images manually
   docker pull node:20-alpine
   docker pull postgres:15-alpine
   docker pull nginx:alpine
   
   # Use different registry if Docker Hub is down
   # Edit Dockerfiles to use alternative registries if needed
   ```

2. **Containers won't start:**
   ```bash
   # Check logs
   docker-compose logs
   
   # Check environment variables
   cat .env
   
   # Restart services
   docker-compose down && docker-compose up -d
   
   # Check available ports
   sudo lsof -i :80 -i :443 -i :5432 -i :5050
   ```

3. **Database connection issues:**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Verify database is healthy
   docker-compose exec postgres pg_isready -U kitchen_pal_user -d kitchen_pal
   
   # Reset database if needed
   docker-compose down
   docker volume rm kitchen-pal-2_postgres_data
   docker-compose up -d postgres
   ```

4. **Cloudflare tunnel issues:**
   ```bash
   # Check tunnel logs
   docker-compose logs cloudflared
   
   # Verify tunnel configuration
   cat cloudflare/config.yml
   
   # Test tunnel connectivity
   cloudflared tunnel --config cloudflare/config.yml --loglevel debug run kitchen-pal
   ```

5. **pgAdmin access issues:**
   ```bash
   # Reset pgAdmin data
   docker-compose down
   docker volume rm kitchen-pal-2_pgadmin_data
   docker-compose up -d pgadmin
   ```

6. **Network connectivity issues:**
   ```bash
   # Check if port 443/80 are available
   sudo netstat -tlnp | grep :443
   sudo netstat -tlnp | grep :80
   
   # Check firewall settings
   sudo ufw status  # Ubuntu/Debian
   sudo firewall-cmd --list-all  # CentOS/RHEL
   
   # Test DNS resolution
   nslookup kitchen-pal.kwakwakwak.com
   ```

### Docker-Specific Troubleshooting

1. **Image build failures:**
   ```bash
   # Clear Docker cache
   docker builder prune -a
   
   # Build with no cache
   docker-compose build --no-cache
   
   # Build individual services
   docker-compose build frontend
   docker-compose build backend
   docker-compose build recipe-proxy
   ```

2. **Registry connection issues:**
   ```bash
   # Check Docker Hub status
   curl -I https://registry-1.docker.io/
   
   # Configure Docker to use different registry mirrors
   # Edit /etc/docker/daemon.json (Linux) or Docker Desktop settings
   {
     "registry-mirrors": ["https://mirror.gcr.io"]
   }
   
   # Alternative: Use multi-arch images
   docker pull --platform linux/amd64 node:20-alpine
   ```

3. **Resource constraints:**
   ```bash
   # Check available resources
   docker system df
   docker stats
   
   # Clean up unused resources
   docker system prune -a
   docker volume prune
   
   # Increase Docker memory/CPU limits in Docker Desktop
   ```

### Performance Optimization

1. **Database tuning:**
   - Monitor query performance in pgAdmin
   - Review indexes in `database/init.sql`
   - Consider connection pooling for high traffic

2. **Application optimization:**
   - Monitor container resource usage
   - Adjust Docker resource limits if needed
   - Use Redis for session management (already configured)

3. **Nginx optimization:**
   - Review cache settings in `nginx/nginx.conf`
   - Adjust worker processes based on CPU cores
   - Monitor access logs for performance issues

## Enhanced Deployment Scripts

### Package.json Updates

The following scripts are now available:

```bash
# Standard deployment
npm run docker:deploy      # Build and start all services

# Extended deployment with database fix
npm run docker:deploy-and-fix

# Troubleshooting commands
npm run docker:clean      # Remove all containers and volumes
npm run docker:restart    # Restart all services
npm run docker:logs       # View logs from all services
```

## Security Considerations

1. **Change default passwords** immediately after deployment
2. **Use strong, unique passwords** for all services
3. **Regular security updates:**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```
4. **Monitor logs** for suspicious activity
5. **Backup data regularly**
6. **Keep Cloudflare tunnel credentials secure**

## Backup Strategy

### Automated Backup Script

Create a backup script:

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U kitchen_pal_user kitchen_pal > $BACKUP_DIR/db_backup_$DATE.sql

# Backup volumes
docker run --rm -v kitchen-pal-2_postgres_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/postgres_data_$DATE.tar.gz -C /data .
docker run --rm -v kitchen-pal-2_app_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/app_data_$DATE.tar.gz -C /data .

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

Make it executable and add to cron:
```bash
chmod +x backup.sh
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## Support

For issues and support:
1. Check the logs first: `npm run docker:logs`
2. Review this deployment guide and troubleshooting section
3. Check the project's GitHub issues
4. Consult Docker and Cloudflare documentation

---

**Important**: Always test deployments in a staging environment before production! 