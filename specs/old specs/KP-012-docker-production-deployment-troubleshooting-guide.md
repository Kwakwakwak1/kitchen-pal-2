# KP-012: Kitchen Pal Docker Production Deployment & Troubleshooting Guide

**Version:** 1.0  
**Status:** Implemented  
**Author:** Development Team  
**Date:** 2025-06-07  

## Overview

This specification documents the complete Docker-based production deployment process for Kitchen Pal, including comprehensive troubleshooting procedures. It serves as both a deployment guide and a systematic diagnostic reference for AI agents to resolve common issues.

## System Architecture

### Services Overview
- **React Application** (`app`): Kitchen Pal frontend served via Node.js + serve
- **PostgreSQL Database** (`postgres`): Primary data storage
- **Redis Cache** (`redis`): Session and caching layer
- **Nginx Proxy** (`nginx`): Reverse proxy and load balancer
- **pgAdmin 4** (`pgadmin`): Database administration interface
- **Cloudflare Tunnel** (`cloudflared`): Secure public access via tunnel

### Network Flow
```
Internet → Cloudflare Tunnel → Nginx (localhost:80) → React App (localhost:3000)
                                   ↳ pgAdmin (localhost:5050)
                                   ↳ PostgreSQL (localhost:5432)
                                   ↳ Redis (localhost:6379)
```

## Prerequisites

### Required Tools
- Docker Desktop (latest version)
- Docker Compose v2+
- Cloudflare account with tunnel access
- Domain configured with Cloudflare DNS

### Required Files
- `.env` file with tunnel token
- `cloudflare/config.yml` with proper tunnel configuration
- All Docker configuration files (see Configuration Reference)

## Quick Start Deployment

### 1. Environment Setup
```bash
# Create .env file with tunnel token
echo "TUNNEL_TOKEN=your_token_here" > .env

# Verify environment
docker --version
docker-compose --version
```

### 2. Build and Deploy
```bash
# Build application
docker-compose build app

# Start all services
docker-compose up -d

# Verify services are healthy
docker-compose ps
```

### 3. Start Cloudflare Tunnel
```bash
# Start tunnel with config
cloudflared tunnel --config cloudflare/config.yml run --token YOUR_TOKEN
```

### 4. Verify Deployment
```bash
# Test local access
curl http://localhost

# Test public access
curl https://your-domain.com
```

## Systematic Troubleshooting Guide

### Phase 1: Build Issues Diagnosis

#### 1.1 Check Build Dependencies
```bash
# Verify package.json has correct scripts
grep -A 5 "scripts" package.json

# Check for missing dependencies
npm ls vite @vitejs/plugin-react

# Verify minification configuration
grep -r "minify" vite.config.ts
```

**Common Issues:**
- ❌ `terser not found` → Switch to `esbuild` minification
- ❌ `vite: not found` → Install all deps before build, not just production
- ❌ Build hanging → Check .dockerignore file

#### 1.2 Dockerfile Validation
```bash
# Check Dockerfile configuration
cat Dockerfile | grep -E "(FROM|RUN|COPY|CMD)"

# Verify build context size
du -sh . --exclude=node_modules --exclude=.git
```

**Expected Configuration:**
- ✅ Single-stage build with Node.js Alpine
- ✅ Install all dependencies (not just production)
- ✅ Build with esbuild minification
- ✅ Prune dev dependencies after build
- ✅ Use `serve` to serve static files

#### 1.3 Build Context Optimization
```bash
# Check .dockerignore exists and is properly configured
cat .dockerignore | head -10

# Verify build context size
docker build --no-cache -t test-build .
```

**Required .dockerignore entries:**
```
node_modules
.git
.env*
*.md
docs/
database/
cloudflare/
nginx/
```

### Phase 2: Container Runtime Diagnosis

#### 2.1 Service Health Check
```bash
# Check all container status
docker-compose ps

# Check individual service logs
docker-compose logs app --tail 20
docker-compose logs nginx --tail 20
docker-compose logs postgres --tail 20
```

**Expected Status:**
- ✅ All services show "healthy" or "Up" status
- ✅ No restart loops
- ✅ Correct port mappings

#### 2.2 Database Authentication Diagnosis
```bash
# Check database logs for authentication errors
docker logs kitchen-pal-db --tail 20 | grep -i "authentication\|password"

# Test database connection with current credentials
docker exec -it kitchen-pal-db psql -U kitchen_pal_user -d kitchen_pal -c "SELECT current_user;"

# Check environment variables are loaded correctly
docker-compose exec postgres env | grep POSTGRES
```

**Common Authentication Issues:**
- ❌ `password authentication failed` → Database initialized with old password
- ❌ `fe_sendauth: no password supplied` → pgAdmin missing password configuration
- ❌ `role "postgres" does not exist` → Using wrong username for connection

**Resolution for Password Authentication Failed:**
```bash
# Stop all services
docker-compose down

# Remove PostgreSQL data volume to reset database
docker volume ls | grep postgres
docker volume rm kitchen-pal-2_postgres_data

# Restart with fresh database
docker-compose up -d

# Wait for initialization and test connection
sleep 15
docker logs kitchen-pal-db --tail 10
```

#### 2.3 Network Connectivity Test
```bash
# Test direct app access
curl -I http://localhost:3000

# Test nginx proxy
curl -I http://localhost:80

# Test pgAdmin
curl -I http://localhost:5050

# Test database connection
docker-compose exec postgres pg_isready
```

#### 2.4 Service Communication
```bash
# Test nginx → app communication
docker-compose exec nginx wget -O- http://app:3000

# Test app → database communication
docker-compose exec app ping postgres
```

### Phase 3: Cloudflare Tunnel Diagnosis

#### 3.1 Tunnel Configuration Validation
```bash
# Check tunnel exists and is active
cloudflared tunnel list

# Validate configuration file
cat cloudflare/config.yml

# Check DNS routing
cloudflared tunnel route dns kitchen-pal your-domain.com
```

**Required Config Elements:**
```yaml
tunnel: your-tunnel-id
ingress:
  - hostname: your-domain.com
    service: http://localhost:80
  - service: http_status:404
```

#### 3.2 Tunnel Connectivity Test
```bash
# Start tunnel in foreground for debugging
cloudflared tunnel --config cloudflare/config.yml run --token YOUR_TOKEN

# Check tunnel connections
cloudflared tunnel info your-tunnel-name

# Test local endpoint tunnel points to
curl http://localhost:80
```

#### 3.3 Public Access Validation
```bash
# Test HTTP (should redirect to HTTPS)
curl -v http://your-domain.com

# Test HTTPS (should serve app)
curl -I https://your-domain.com

# Check SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com
```

### Phase 4: Nginx Configuration Diagnosis

#### 4.1 Proxy Configuration Check
```bash
# Verify nginx configuration
docker-compose exec nginx nginx -t

# Check proxy settings
grep -A 10 "location /" nginx/nginx.conf
```

**Critical Configuration:**
- ✅ Listen on port 80 (not redirect to HTTPS)
- ✅ Proxy to `http://app:3000` (not `https://`)
- ✅ Proper proxy headers set
- ✅ No SSL redirect for tunnel traffic

#### 4.2 Request Flow Analysis
```bash
# Monitor nginx access logs
docker-compose logs nginx -f

# Test proxy while monitoring logs
curl http://localhost:80

# Check if requests reach backend
docker-compose logs app -f
```

## Common Issues & Solutions

### Build Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Terser not found | `terser not found` during build | Change `minify: 'terser'` to `minify: 'esbuild'` in vite.config.ts |
| Build hanging | Build takes >5 minutes | Add .dockerignore file with proper exclusions |
| Dependency errors | Missing modules during build | Install all deps (`npm ci`) not just production (`--only=production`) |
| Large build context | Slow build, large transfer | Optimize .dockerignore, exclude unnecessary files |

### Database Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Password authentication failed | `FATAL: password authentication failed for user "kitchen_pal_user"` | Reset database volume: `docker-compose down && docker volume rm kitchen-pal-2_postgres_data && docker-compose up -d` |
| Database not initializing | Container starts but database not accessible | Check .env file has real passwords, not template placeholders like `your_secure_database_password_here` |
| pgAdmin connection issues | `fe_sendauth: no password supplied` or connection timeout | Verify pgAdmin and database passwords are different in .env file |
| Environment variables not loading | Database starts with wrong credentials | Ensure .env file exists and has no syntax errors, restart containers completely |
| Persistent volume issues | Old data preventing new configuration | Remove volumes: `docker volume prune` or specific volume removal |

### Runtime Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| App not starting | Container exits immediately | Check Dockerfile CMD, verify serve installation |
| Port conflicts | "Port already in use" | Check for conflicting services, use different ports |
| Health check failing | Container marked unhealthy | Verify health check endpoint accessible |
| Database connection | "Connection refused" | Ensure postgres container is healthy first |

### Tunnel Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| 1033 Error | Cloudflare error 1033 | Check tunnel is running and configured correctly |
| 530 Error | Service unavailable | Verify local service (nginx) is accessible |
| 404 Error | Page not found | Check nginx configuration and proxy settings |
| Connection reset | SSL handshake fails | Ensure tunnel points to HTTP not HTTPS |

### Configuration Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| Wrong service endpoint | Tunnel can't reach app | Use `localhost:80` not `nginx:80` in tunnel config |
| Missing credentials | "cert.pem doesn't exist" | Use token authentication instead of cert file |
| pgAdmin email error | Invalid email address | Use valid email format (not .local domain) |
| SSL redirect loop | Infinite redirects | Remove HTTPS redirect from nginx for tunnel traffic |
| Environment template not updated | Services fail with authentication errors | Copy environment.template to .env and replace all placeholder values with real credentials |

## Configuration Reference

### Working Dockerfile
```dockerfile
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Install serve to serve the built files
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
```

### Working Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Main application
    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

### Working Cloudflare Config
```yaml
tunnel: your-tunnel-id

ingress:
  - hostname: your-domain.com
    service: http://localhost:80
    originRequest:
      httpHostHeader: your-domain.com
      noTLSVerify: true
  - service: http_status:404

originRequest:
  connectTimeout: 30s
  tlsTimeout: 10s
  tcpKeepAlive: 30s
  noTLSVerify: false
  originServerName: your-domain.com

loglevel: info
```

## Validation Checklist

### Build Validation
- [ ] `docker-compose build app` completes in <2 minutes
- [ ] No error messages during build
- [ ] Image size reasonable (<500MB)
- [ ] All dependencies installed correctly

### Runtime Validation
- [ ] All containers start successfully
- [ ] All containers show healthy status
- [ ] No container restart loops
- [ ] All ports accessible locally

### Network Validation
- [ ] `curl http://localhost:3000` returns HTML
- [ ] `curl http://localhost:80` returns HTML
- [ ] `curl http://localhost:5050` redirects to pgAdmin
- [ ] Database connection successful

### Tunnel Validation
- [ ] Tunnel shows active connections
- [ ] DNS routing configured correctly
- [ ] Local endpoint accessible
- [ ] Public domain serves application

### End-to-End Validation
- [ ] Public URL loads application
- [ ] HTTPS certificate valid
- [ ] All application features functional
- [ ] No console errors in browser

## AI Agent Instructions

When troubleshooting Kitchen Pal Docker deployment issues, follow this systematic approach:

### 1. Initial Assessment
- Check all services status with `docker-compose ps`
- Review recent logs for all services
- Verify environment variables are set

### 2. Build Issues Protocol
- If build fails, check Dockerfile configuration
- Verify package.json scripts and dependencies
- Check for .dockerignore file
- Test build with `--no-cache` flag

### 3. Runtime Issues Protocol
- Check container health status
- Test local network connectivity
- Verify service-to-service communication
- Check port availability

### 4. Tunnel Issues Protocol
- Verify tunnel configuration file
- Check tunnel status and connections
- Test local endpoint accessibility
- Validate DNS routing

### 5. Escalation Criteria
- If systematic checks don't resolve issue
- If configuration files are corrupted
- If external dependencies are unavailable

### 6. Documentation Updates
- Document any new issues encountered
- Update troubleshooting procedures
- Add new validation steps if needed

## Success Metrics

- Build time: <2 minutes
- All services healthy within 30 seconds
- Public URL accessible within 60 seconds
- End-to-end application functionality confirmed

## Maintenance

### Regular Health Checks
```bash
# Weekly validation script
docker-compose ps
curl -I https://your-domain.com
cloudflared tunnel list
```

### Log Monitoring
```bash
# Check for errors
docker-compose logs --since 24h | grep -i error

# Monitor tunnel health
cloudflared tunnel info your-tunnel-name
```

### Updates
- Monitor for security updates to base images
- Update Cloudflare tunnel token as needed
- Review and update configuration as application evolves

## Environment Configuration Troubleshooting

### Critical Environment Variables Check
```bash
# Verify all required variables are set with real values
cat .env | grep -E "PASSWORD|SECRET|TOKEN" | grep -v "your_"

# Common template placeholders that must be replaced:
grep -E "your_.*_here|your_.*_password|your_.*_token" .env
```

**Required Updates from Template:**
- ✅ `POSTGRES_PASSWORD` → Set real database password
- ✅ `PGADMIN_PASSWORD` → Set real pgAdmin password  
- ✅ `CLOUDFLARE_TUNNEL_TOKEN` → Set real tunnel token
- ✅ `JWT_SECRET` → Set long random string
- ✅ `SESSION_SECRET` → Set unique session key

### Database Reset Procedure
When database authentication fails due to environment changes:

```bash
# 1. Stop all services
docker-compose down

# 2. Verify environment file has real passwords
cat .env | grep POSTGRES_PASSWORD
# Should NOT show: POSTGRES_PASSWORD=your_secure_database_password_here

# 3. Remove PostgreSQL data volume
docker volume ls | grep postgres
docker volume rm kitchen-pal-2_postgres_data

# 4. Start services (database will initialize fresh)
docker-compose up -d

# 5. Wait for initialization
sleep 15

# 6. Verify database is accessible
docker logs kitchen-pal-db --tail 10
# Should show: "database system is ready to accept connections"

# 7. Test connection
docker exec -it kitchen-pal-db psql -U kitchen_pal_user -d kitchen_pal -c "SELECT current_user;"
```

---

*This specification serves as the definitive guide for Kitchen Pal Docker deployment and troubleshooting. Follow the systematic approach outlined here to ensure reliable deployments and efficient issue resolution.* 