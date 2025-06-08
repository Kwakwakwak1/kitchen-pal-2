import { PrismaClient } from '@prisma/client';

/**
 * Database configuration and connection management
 * Provides connection pooling, health checks, and transaction support
 */

// Create global Prisma client instance with optimized configuration
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  errorFormat: 'pretty',
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    console.log('Query: ' + e.query);
    console.log('Duration: ' + e.duration + 'ms');
  });
}

// Log database errors
prisma.$on('error', (e) => {
  console.error('Database error:', e);
});

/**
 * Initialize database connection
 * @returns {Promise<boolean>} Success status
 */
export const initializeDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connection initialized');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

/**
 * Check database health
 * @returns {Promise<Object>} Health status object
 */
export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    };
  }
};

/**
 * Execute a database transaction
 * @param {Function} transactionFn - Function to execute within transaction
 * @returns {Promise<any>} Transaction result
 */
export const executeTransaction = async (transactionFn) => {
  try {
    return await prisma.$transaction(transactionFn);
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
};

/**
 * Gracefully disconnect from database
 * @returns {Promise<void>}
 */
export const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ Database disconnected gracefully');
  } catch (error) {
    console.error('❌ Error disconnecting database:', error.message);
  }
};

/**
 * Get database connection info
 * @returns {Object} Connection information
 */
export const getDatabaseInfo = () => {
  return {
    provider: 'postgresql',
    url: process.env.DATABASE_URL ? 'configured' : 'not configured',
    prismaVersion: '6.9.0'
  };
};

// Export the Prisma client instance
export default prisma;