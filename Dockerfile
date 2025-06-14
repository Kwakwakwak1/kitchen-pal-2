# Frontend for Kitchen Pal React Application
FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build arguments for Vite environment variables
# For production, API requests should go to the same domain (no explicit URL)
ARG VITE_API_URL=""

# Build the application
ENV NODE_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build:skip-check

# Remove dev dependencies after build
RUN npm prune --production

# Install serve to serve the built files
RUN npm install -g serve

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Start the frontend
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:3000"] 