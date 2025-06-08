import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Authentication middleware to verify JWT tokens
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: {
          message: 'Authorization header required',
          statusCode: 401
        }
      });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        error: {
          message: 'Access token required',
          statusCode: 401
        }
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        is_verified: true,
        created_at: true,
        last_login: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'User not found',
          statusCode: 401
        }
      });
    }

    if (!user.is_verified && process.env.REQUIRE_EMAIL_VERIFICATION !== 'false') {
      return res.status(401).json({
        error: {
          message: 'Account not verified',
          statusCode: 401
        }
      });
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          message: 'Invalid token',
          statusCode: 401
        }
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          message: 'Token expired',
          statusCode: 401
        }
      });
    } else {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        error: {
          message: 'Authentication error',
          statusCode: 500
        }
      });
    }
  }
};

/**
 * Optional authentication middleware - doesn't require auth but sets user if token is valid
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        is_verified: true
      }
    });

    if (user && user.is_verified) {
      req.user = user;
    }

    next();
  } catch (error) {
    // Ignore auth errors in optional auth
    next();
  }
};

export default authMiddleware;