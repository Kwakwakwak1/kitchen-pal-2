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

### 2. Cloudflare Tunnel Setup

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

### 3. SSL Certificates (Optional)

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

### 4. Build and Deploy

1. **Build the application:**
   ```bash
   npm run docker:build
   ```

2. **Start all services:**
   ```bash
   npm run docker:up
   ```

3. **Check logs:**
   ```bash
   npm run docker:logs
   ```

### 5. Verify Deployment

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

### 6. Initial Setup

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

1. **Containers won't start:**
   ```bash
   # Check logs
   docker-compose logs
   
   # Check environment variables
   cat .env
   
   # Restart services
   docker-compose down && docker-compose up -d
   ```

2. **Database connection issues:**
   ```bash
   # Check database logs
   docker-compose logs postgres
   
   # Verify database is healthy
   docker-compose exec postgres pg_isready -U kitchen_pal_user -d kitchen_pal
   ```

3. **Cloudflare tunnel issues:**
   ```bash
   # Check tunnel logs
   docker-compose logs cloudflared
   
   # Verify tunnel configuration
   cat cloudflare/config.yml
   
   # Test tunnel connectivity
   cloudflared tunnel --config cloudflare/config.yml --loglevel debug run kitchen-pal
   ```

4. **pgAdmin access issues:**
   ```bash
   # Reset pgAdmin data
   docker-compose down
   docker volume rm kitchen-pal-2_pgadmin_data
   docker-compose up -d pgadmin
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
2. Review this deployment guide
3. Check the project's GitHub issues
4. Consult Docker and Cloudflare documentation

---

**Important**: Always test deployments in a staging environment before production! 