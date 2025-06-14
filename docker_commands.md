# Docker Deployment Commands - Kitchen Pal

This document contains all the Docker commands for deploying specific components of the Kitchen Pal application without restarting the entire Docker suite.

## 🚀 **Individual Component Deployment**

### Frontend Only
```bash
docker-compose up --build -d kitchen-pal-frontend
```

### Backend Only  
```bash
docker-compose up --build -d kitchen-pal-backend
```

### Database Only
```bash
docker-compose up --build -d kitchen-pal-db
```

### Nginx Proxy Only
```bash
docker-compose up --build -d kitchen-pal-nginx
```

### Redis Only
```bash
docker-compose up --build -d kitchen-pal-redis
```

## 🔄 **Multiple Component Deployment**

### Frontend & Backend
```bash
docker-compose up --build -d kitchen-pal-frontend kitchen-pal-backend
```

### Full Application Stack (without infrastructure)
```bash
docker-compose up --build -d kitchen-pal-frontend kitchen-pal-backend kitchen-pal-nginx
```

### Infrastructure Only
```bash
docker-compose up --build -d kitchen-pal-db kitchen-pal-redis kitchen-pal-pgadmin
```

## 🔧 **Service Restart Commands**

### Restart Without Rebuilding
```bash
# Frontend only
docker-compose restart kitchen-pal-frontend

# Backend only  
docker-compose restart kitchen-pal-backend

# Both frontend & backend
docker-compose restart kitchen-pal-frontend kitchen-pal-backend

# All services
docker-compose restart
```

## 📋 **Development & Debugging Commands**

### Deploy with Logs (Foreground)
```bash
# Frontend with logs
docker-compose up --build kitchen-pal-frontend

# Backend with logs
docker-compose up --build kitchen-pal-backend

# Both with logs
docker-compose up --build kitchen-pal-frontend kitchen-pal-backend
```

### Force Rebuild (No Cache)
```bash
# Frontend force rebuild
docker-compose build --no-cache kitchen-pal-frontend
docker-compose up -d kitchen-pal-frontend

# Backend force rebuild
docker-compose build --no-cache kitchen-pal-backend
docker-compose up -d kitchen-pal-backend

# Full rebuild
docker-compose build --no-cache
docker-compose up -d
```

## 📊 **Monitoring Commands**

### Check Container Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs kitchen-pal-frontend
docker-compose logs kitchen-pal-backend

# Follow logs (real-time)
docker-compose logs -f kitchen-pal-frontend
docker-compose logs -f kitchen-pal-backend

# Last 100 lines
docker-compose logs --tail=100 kitchen-pal-backend
```

### Container Resource Usage
```bash
docker stats
```

## 🛠️ **Maintenance Commands**

### Stop Services
```bash
# Stop specific service
docker-compose stop kitchen-pal-frontend
docker-compose stop kitchen-pal-backend

# Stop all services
docker-compose stop
```

### Remove Containers
```bash
# Remove specific service
docker-compose rm kitchen-pal-frontend
docker-compose rm kitchen-pal-backend

# Remove all stopped containers
docker-compose rm
```

### Clean Up
```bash
# Remove unused containers, networks, images
docker system prune

# Remove unused volumes (be careful!)
docker volume prune

# Nuclear option - remove everything
docker system prune -a --volumes
```

## 🎯 **Common Deployment Scenarios**

### 1. Fix Backend Issues (Server Crashes)
```bash
# Deploy backend fixes first
docker-compose up --build -d kitchen-pal-backend

# Check logs for issues
docker-compose logs -f kitchen-pal-backend
```

### 2. Update Frontend UI
```bash
# Deploy frontend changes
docker-compose up --build -d kitchen-pal-frontend

# Verify deployment
docker-compose ps
```

### 3. Full Application Update
```bash
# Deploy both with logs
docker-compose up --build kitchen-pal-frontend kitchen-pal-backend

# Or deploy in background
docker-compose up --build -d kitchen-pal-frontend kitchen-pal-backend
```

### 4. Database Migration
```bash
# Stop application first
docker-compose stop kitchen-pal-frontend kitchen-pal-backend

# Update database
docker-compose up --build -d kitchen-pal-db

# Wait for database to be ready, then restart application
docker-compose up -d kitchen-pal-backend kitchen-pal-frontend
```

## 🚨 **Troubleshooting Commands**

### Check Container Health
```bash
docker-compose ps
docker inspect kitchen-pal-backend --format='{{.State.Health.Status}}'
```

### Access Container Shell
```bash
# Backend container
docker-compose exec kitchen-pal-backend sh

# Database container
docker-compose exec kitchen-pal-db psql -U postgres -d kitchen_pal
```

### Check Environment Variables
```bash
docker-compose exec kitchen-pal-backend env
```

### Network Debugging
```bash
# List networks
docker network ls

# Inspect application network
docker network inspect kitchen-pal-2_default
```

## 📝 **Container Information**

| Service | Container Name | Purpose |
|---------|----------------|---------|
| Frontend | kitchen-pal-frontend | React/Vite application |
| Backend | kitchen-pal-backend | Node.js API server |
| Database | kitchen-pal-db | PostgreSQL database |
| Cache | kitchen-pal-redis | Redis cache |
| Proxy | kitchen-pal-nginx | Nginx reverse proxy |
| Admin | kitchen-pal-pgadmin | PostgreSQL admin interface |
| Proxy | kitchen-pal-proxy | Additional proxy/load balancer |
| Tunnel | kitchen-pal-tunnel | Development tunnel (ngrok/cloudflare) |

## 💡 **Best Practices**

1. **Always check logs** after deployment:
   ```bash
   docker-compose logs -f kitchen-pal-backend
   ```

2. **Deploy backend first** when fixing API issues:
   ```bash
   docker-compose up --build -d kitchen-pal-backend
   ```

3. **Use health checks** to verify services are ready:
   ```bash
   docker-compose ps
   ```

4. **Monitor resource usage** during deployment:
   ```bash
   docker stats
   ```

5. **Keep backups** before major updates:
   ```bash
   docker-compose exec kitchen-pal-db pg_dump -U postgres kitchen_pal > backup.sql
   ```

## 🔗 **Quick Reference**

```bash
# Most common commands
docker-compose up --build -d kitchen-pal-backend    # Deploy backend
docker-compose up --build -d kitchen-pal-frontend   # Deploy frontend  
docker-compose logs -f kitchen-pal-backend          # Watch backend logs
docker-compose ps                                   # Check status
docker-compose restart kitchen-pal-backend          # Quick restart
``` 