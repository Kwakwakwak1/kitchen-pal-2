import express from 'express';
import { validate, reviewSchemas, commonSchemas } from '../middleware/validation.js';
import authMiddleware from '../middleware/auth.js';
import {
  getRecipeReviews,
  addRecipeReview,
  updateReview,
  deleteReview,
  getUserReviews
} from '../controllers/reviewController.js';

const router = express.Router();

/**
 * @swagger
 * /api/reviews/recipe/{id}:
 *   get:
 *     summary: Get all reviews for a specific recipe
 *     tags: [Recipe Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Recipe ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, rating]
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
 *         description: Reviews retrieved successfully
 *       404:
 *         description: Recipe not found
 */
router.get('/reviews/recipe/:id', validate({ 
  params: commonSchemas.uuidParam,
  query: reviewSchemas.searchQuery 
}), getRecipeReviews);

/**
 * @swagger
 * /api/recipes/{id}/reviews:
 *   post:
 *     summary: Add a review to a recipe
 *     tags: [Recipe Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Recipe ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5 stars
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional review comment
 *     responses:
 *       201:
 *         description: Review added successfully
 *       404:
 *         description: Recipe not found
 *       409:
 *         description: User has already reviewed this recipe
 */
router.post('/recipes/:id/reviews', authMiddleware, validate({ 
  params: commonSchemas.uuidParam,
  body: reviewSchemas.create 
}), addRecipeReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     summary: Update a review
 *     tags: [Recipe Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5 stars
 *               comment:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Review comment
 *     responses:
 *       200:
 *         description: Review updated successfully
 *       404:
 *         description: Review not found or user lacks permission
 */
router.put('/reviews/:id', authMiddleware, validate({ 
  params: commonSchemas.uuidParam,
  body: reviewSchemas.update 
}), updateReview);

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     summary: Delete a review
 *     tags: [Recipe Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       404:
 *         description: Review not found or user lacks permission
 */
router.delete('/reviews/:id', authMiddleware, validate({ params: commonSchemas.uuidParam }), deleteReview);

/**
 * @swagger
 * /api/reviews/my-reviews:
 *   get:
 *     summary: Get current user's reviews
 *     tags: [Recipe Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, rating]
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
 *         description: User reviews retrieved successfully
 */
router.get('/reviews/my-reviews', authMiddleware, validate({ query: reviewSchemas.searchQuery }), getUserReviews);

export default router;