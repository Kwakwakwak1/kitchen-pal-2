import express from 'express';
import { validate, feedbackSchemas, commonSchemas } from '../middleware/validation.js';
import {
  submitFeedback,
  getUserFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  getAllFeedback
} from '../controllers/feedbackController.js';

const router = express.Router();

/**
 * @swagger
 * /api/feedback:
 *   post:
 *     summary: Submit new feedback
 *     tags: [User Feedback]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *                 maxLength: 255
 *                 description: Brief subject of the feedback
 *               message:
 *                 type: string
 *                 maxLength: 2000
 *                 description: Detailed feedback message
 *               category:
 *                 type: string
 *                 enum: [bug, feature_request, improvement, general, complaint]
 *                 default: general
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *     responses:
 *       201:
 *         description: Feedback submitted successfully
 */
router.post('/', validate({ body: feedbackSchemas.create }), submitFeedback);

/**
 * @swagger
 * /api/feedback:
 *   get:
 *     summary: Get current user's feedback submissions
 *     tags: [User Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_review, resolved, rejected]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [bug, feature_request, improvement, general, complaint]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, subject, priority, status]
 *           default: created_at
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: User feedback retrieved successfully
 */
router.get('/', validate({ query: feedbackSchemas.searchQuery }), getUserFeedback);

/**
 * @swagger
 * /api/feedback/{id}:
 *   get:
 *     summary: Get specific feedback by ID
 *     tags: [User Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Feedback retrieved successfully
 *       404:
 *         description: Feedback not found
 */
router.get('/:id', validate({ params: commonSchemas.uuidParam }), getFeedbackById);

/**
 * @swagger
 * /api/feedback/{id}/status:
 *   put:
 *     summary: Update feedback status (admin only)
 *     tags: [User Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, in_review, resolved, rejected]
 *               admin_response:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional admin response to the feedback
 *     responses:
 *       200:
 *         description: Feedback status updated successfully
 *       404:
 *         description: Feedback not found
 */
router.put('/:id/status', validate({ 
  params: commonSchemas.uuidParam,
  body: feedbackSchemas.updateStatus 
}), updateFeedbackStatus);

/**
 * @swagger
 * /api/feedback/admin/all:
 *   get:
 *     summary: Get all feedback submissions (admin only)
 *     tags: [User Feedback]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in_review, resolved, rejected]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [bug, feature_request, improvement, general, complaint]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in subject and message
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, subject, priority, status]
 *           default: created_at
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *     responses:
 *       200:
 *         description: All feedback retrieved successfully
 */
router.get('/admin/all', validate({ query: feedbackSchemas.adminSearchQuery }), getAllFeedback);

export default router;