import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { PrismaClient } from '@prisma/client';

import errorHandler from './middleware/errorHandler.js';
import loggingMiddleware from './middleware/logging.js';
import authMiddleware from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import storeRoutes from './routes/stores.js';
import shoppingRoutes from './routes/shopping.js';
import inventoryRoutes from './routes/inventory.js';
import recipeRoutes from './routes/recipes.js';
import mealRoutes from './routes/meals.js';
import reviewRoutes from './routes/reviews.js';
import feedbackRoutes from './routes/feedback.js';
import adminRoutes from './routes/admin.js';

// Load environment variables
dotenv.config();

const app = express();

// Initialize Prisma client with connection handling
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Make Prisma client available throughout the app
app.locals.prisma = prisma;

// Test database connection on startup (non-blocking)
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((error) => {
    console.warn('⚠️  Database connection failed:', error.message);
    console.warn('Server will continue running in degraded mode');
  });

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    // Allow file:// protocol for direct HTML file access
    /^file:\/\//,
    // Allow any localhost during development
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - Much more generous for production use
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes (about 1 per second sustained)
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and auth verification
    return req.path === '/health' || req.path === '/api/auth/me';
  }
});
app.use(limiter);

// Much more generous auth rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 auth requests per 15 minutes
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests against the limit
  skip: (req) => {
    // Skip rate limiting for auth verification endpoint
    return req.path === '/api/auth/me';
  },
  keyGenerator: (req) => {
    // Use IP only for rate limiting to avoid session issues
    return req.ip;
  }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(loggingMiddleware);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    console.warn('Database health check failed:', error.message);
    res.status(200).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
      message: 'Server running but database unavailable'
    });
  }
});

// Recipe proxy endpoint for CORS handling
app.get('/recipe-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL parameter is required'
      });
    }

    // Validate URL
    let targetUrl;
    try {
      targetUrl = new URL(decodeURIComponent(url));
      if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    console.log(`Recipe proxy request for: ${targetUrl.href}`);

    // Enhanced headers to mimic a real browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1'
    };

    // Special handling for specific domains
    if (targetUrl.hostname.includes('butterbeready.com')) {
      headers['Referer'] = 'https://www.google.com/';
      headers['Sec-Fetch-User'] = '?1';
    }

    const response = await fetch(targetUrl.href, {
      method: 'GET',
      headers,
      timeout: 20000,
      follow: 5 // Follow up to 5 redirects
    });

    if (!response.ok) {
      console.warn(`Failed to fetch ${targetUrl.href}: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      });
    }

    const html = await response.text();
    
    if (!html || html.trim().length < 100) {
      return res.status(400).json({
        success: false,
        error: 'Received empty or very short response'
      });
    }

    console.log(`Successfully proxied ${targetUrl.href} (${html.length} characters)`);

    res.json({
      success: true,
      html,
      url: targetUrl.href,
      status: response.status
    });

  } catch (error) {
    console.error('Recipe proxy error:', error);
    
    let errorMessage = 'Failed to fetch URL';
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Website not found or unreachable';
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      errorMessage = 'Request timed out - website may be slow';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/stores', authMiddleware, storeRoutes);
app.use('/api/shopping', authMiddleware, shoppingRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/recipes', authMiddleware, recipeRoutes);
app.use('/api/meals', authMiddleware, mealRoutes);
app.use('/api', reviewRoutes); // Reviews routes handle their own auth per endpoint
app.use('/api/feedback', authMiddleware, feedbackRoutes);
app.use('/api/admin', adminRoutes); // Admin routes handle their own auth

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

export default app;