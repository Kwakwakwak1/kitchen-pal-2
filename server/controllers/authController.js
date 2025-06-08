import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import emailService from '../services/emailService.js';

/**
 * Authentication Controller
 * Handles user registration, login, logout, and token management
 */

/**
 * Generate JWT access token
 * @param {string} userId - User ID
 * @returns {Promise<string>} JWT token
 */
const generateAccessToken = async (userId) => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
      (err, token) => {
        if (err) reject(err);
        else resolve(token);
      }
    );
  });
};

/**
 * Generate JWT refresh token
 * @param {string} userId - User ID
 * @returns {Promise<string>} JWT refresh token
 */
const generateRefreshToken = async (userId) => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) reject(err);
        else resolve(token);
      }
    );
  });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @param {string} secret - JWT secret
 * @returns {Promise<Object>} Decoded token
 */
const verifyToken = async (token, secret) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Comparison result
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        error: {
          message: 'User already exists with this email',
          statusCode: 409
        }
      });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Generate verification token
    const verification_token = emailService.generateVerificationToken();

    // Create user
    const user = await prisma.users.create({
      data: {
        email,
        password_hash,
        first_name,
        last_name,
        verification_token,
        is_verified: process.env.NODE_ENV === 'development' // Auto-verify in development
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        is_verified: true,
        created_at: true
      }
    });

    // Send verification email in production
    if (process.env.NODE_ENV === 'production' && !user.is_verified) {
      try {
        const emailResult = await emailService.sendVerificationEmail(
          user.email, 
          user.first_name, 
          verification_token
        );
        
        if (!emailResult.success) {
          console.warn('Failed to send verification email:', emailResult.reason || emailResult.error);
        }
      } catch (error) {
        console.error('Error sending verification email:', error);
        // Don't fail registration if email fails
      }
    }

    // Generate tokens
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(user.id),
      generateRefreshToken(user.id)
    ]);

    // Store refresh token in database
    await prisma.user_sessions.create({
      data: {
        user_id: user.id,
        session_token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900 // 15 minutes
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password',
          statusCode: 401
        }
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password',
          statusCode: 401
        }
      });
    }

    if (!user.is_verified && process.env.REQUIRE_EMAIL_VERIFICATION !== 'false') {
      return res.status(401).json({
        error: {
          message: 'Please verify your email address before logging in. Check your email for a verification link.',
          statusCode: 401,
          code: 'EMAIL_NOT_VERIFIED',
          details: {
            email: user.email,
            message: 'A verification email was sent to your email address. Please check your inbox and spam folder.'
          }
        }
      });
    }

    // Generate tokens
    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(user.id),
      generateRefreshToken(user.id)
    ]);

    // Store refresh token in database
    await prisma.user_sessions.create({
      data: {
        user_id: user.id,
        session_token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    // Return user data (excluding sensitive information)
    const userData = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      is_verified: user.is_verified,
      created_at: user.created_at,
      last_login: new Date()
    };

    res.status(200).json({
      message: 'Login successful',
      user: userData,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900 // 15 minutes
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      
      try {
        // Verify and decode the token to get user ID
        const decoded = await verifyToken(token, process.env.JWT_SECRET);
        
        // Remove all sessions for this user
        await prisma.user_sessions.deleteMany({
          where: { user_id: decoded.userId }
        });
      } catch (error) {
        // Token might be invalid/expired, but still return success
        console.warn('Logout with invalid token:', error.message);
      }
    }

    res.status(200).json({
      message: 'Logout successful'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refresh = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(401).json({
        error: {
          message: 'Refresh token required',
          statusCode: 401
        }
      });
    }

    // Verify refresh token
    const decoded = await verifyToken(refresh_token, process.env.JWT_REFRESH_SECRET);

    // Check if refresh token exists in database
    const session = await prisma.user_sessions.findFirst({
      where: {
        session_token: refresh_token,
        expires_at: { gt: new Date() }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            is_verified: true
          }
        }
      }
    });

    if (!session) {
      return res.status(401).json({
        error: {
          message: 'Invalid or expired refresh token',
          statusCode: 401
        }
      });
    }

    // Generate new access token
    const newAccessToken = await generateAccessToken(session.user.id);

    res.status(200).json({
      message: 'Token refreshed successfully',
      tokens: {
        access_token: newAccessToken,
        expires_in: 900 // 15 minutes
      },
      user: session.user
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          message: 'Invalid refresh token',
          statusCode: 401
        }
      });
    }
    next(error);
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const getCurrentUser = async (req, res, next) => {
  try {
    // User is already attached to request by auth middleware
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
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
      return res.status(404).json({
        error: {
          message: 'User not found',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      user
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      // Don't reveal whether user exists
      return res.status(200).json({
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = emailService.generateVerificationToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        reset_password_token: resetToken,
        reset_password_expires: resetExpires
      }
    });

    // Send password reset email
    try {
      const emailResult = await emailService.sendPasswordResetEmail(
        user.email,
        user.first_name,
        resetToken
      );
      
      if (!emailResult.success) {
        console.warn('Failed to send password reset email:', emailResult.reason || emailResult.error);
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      message: 'If an account with this email exists, a password reset link has been sent.'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 * POST /api/auth/reset-password
 */
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // Find user by reset token
    const user = await prisma.users.findFirst({
      where: {
        reset_password_token: token,
        reset_password_expires: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({
        error: {
          message: 'Invalid or expired reset token',
          statusCode: 400
        }
      });
    }

    // Hash new password
    const password_hash = await hashPassword(password);

    // Update password and clear reset token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password_hash,
        reset_password_token: null,
        reset_password_expires: null
      }
    });

    // Invalidate all sessions
    await prisma.user_sessions.deleteMany({
      where: { user_id: user.id }
    });

    res.status(200).json({
      message: 'Password reset successful. Please log in with your new password.'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
export const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await prisma.users.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          statusCode: 404
        }
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        error: {
          message: 'Email is already verified',
          statusCode: 400
        }
      });
    }

    // Generate new verification token
    const verification_token = emailService.generateVerificationToken();

    // Update user with new token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        verification_token
      }
    });

    // Send verification email
    try {
      const emailResult = await emailService.sendVerificationEmail(
        user.email,
        user.first_name,
        verification_token
      );
      
      if (!emailResult.success) {
        console.warn('Failed to send verification email:', emailResult.reason || emailResult.error);
        return res.status(500).json({
          error: {
            message: 'Failed to send verification email. Please try again later.',
            statusCode: 500
          }
        });
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      return res.status(500).json({
        error: {
          message: 'Failed to send verification email. Please try again later.',
          statusCode: 500
        }
      });
    }

    res.status(200).json({
      message: 'Verification email sent successfully. Please check your inbox.'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Verify email address
 * GET /api/auth/verify-email
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        error: {
          message: 'Verification token required',
          statusCode: 400
        }
      });
    }

    // Find user by verification token
    const user = await prisma.users.findFirst({
      where: {
        verification_token: token,
        is_verified: false
      }
    });

    if (!user) {
      return res.status(400).json({
        error: {
          message: 'Invalid verification token or account already verified',
          statusCode: 400
        }
      });
    }

    // Update user as verified
    await prisma.users.update({
      where: { id: user.id },
      data: {
        is_verified: true,
        verification_token: null
      }
    });

    res.status(200).json({
      message: 'Email verified successfully. You can now log in.'
    });

  } catch (error) {
    next(error);
  }
};