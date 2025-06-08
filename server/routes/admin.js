import express from 'express';
import authMiddleware from '../middleware/auth.js';
import {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  deleteUser,
  exportSystemData
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       403:
 *         description: Admin access required
 */
router.get('/dashboard', getDashboardStats);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default: 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page (default: 20)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for email or name
 *     responses:
 *       200:
 *         description: List of users with pagination
 *       403:
 *         description: Admin access required
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   get:
 *     summary: Get detailed user information
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Detailed user information
 *       404:
 *         description: User not found
 *       403:
 *         description: Admin access required
 */
router.get('/users/:userId', getUserDetails);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Delete user and all associated data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Cannot delete own admin account
 *       404:
 *         description: User not found
 *       403:
 *         description: Admin access required
 */
router.delete('/users/:userId', deleteUser);

/**
 * @swagger
 * /api/admin/export:
 *   get:
 *     summary: Export system data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Export format (default: json)
 *       - in: query
 *         name: includeUserData
 *         schema:
 *           type: boolean
 *         description: Include full user data (default: false)
 *     responses:
 *       200:
 *         description: Exported data
 *       403:
 *         description: Admin access required
 */
router.get('/export', exportSystemData);

export default router;