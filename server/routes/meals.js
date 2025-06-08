import express from 'express';
import { validate, mealSchemas, commonSchemas } from '../middleware/validation.js';
import {
  getMealPlans,
  getMealPlanById,
  createMealPlan,
  updateMealPlan,
  deleteMealPlan,
  addRecipeToMealPlan,
  removeRecipeFromMealPlan
} from '../controllers/mealController.js';

const router = express.Router();

/**
 * @swagger
 * /api/meals/plans:
 *   get:
 *     summary: Get all meal plans for the authenticated user
 *     tags: [Meal Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search meal plans by name
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, start_date, end_date, created_at]
 *           default: start_date
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
 *         description: Meal plans retrieved successfully
 */
router.get('/plans', validate({ query: mealSchemas.searchQuery }), getMealPlans);

/**
 * @swagger
 * /api/meals/plans/{id}:
 *   get:
 *     summary: Get a specific meal plan by ID with recipes
 *     tags: [Meal Plans]
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
 *         description: Meal plan retrieved successfully
 *       404:
 *         description: Meal plan not found
 */
router.get('/plans/:id', validate({ params: commonSchemas.uuidParam }), getMealPlanById);

/**
 * @swagger
 * /api/meals/plans:
 *   post:
 *     summary: Create a new meal plan
 *     tags: [Meal Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - start_date
 *               - end_date
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Meal plan created successfully
 *       400:
 *         description: Invalid date range
 *       409:
 *         description: Meal plan with this name already exists
 */
router.post('/plans', validate({ body: mealSchemas.create }), createMealPlan);

/**
 * @swagger
 * /api/meals/plans/{id}:
 *   put:
 *     summary: Update an existing meal plan
 *     tags: [Meal Plans]
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
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Meal plan updated successfully
 *       400:
 *         description: Invalid date range
 *       404:
 *         description: Meal plan not found
 *       409:
 *         description: Meal plan with this name already exists
 */
router.put('/plans/:id', validate({ 
  params: commonSchemas.uuidParam, 
  body: mealSchemas.update 
}), updateMealPlan);

/**
 * @swagger
 * /api/meals/plans/{id}:
 *   delete:
 *     summary: Delete a meal plan
 *     tags: [Meal Plans]
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
 *         description: Meal plan deleted successfully
 *       404:
 *         description: Meal plan not found
 */
router.delete('/plans/:id', validate({ params: commonSchemas.uuidParam }), deleteMealPlan);

/**
 * @swagger
 * /api/meals/plans/{id}/recipes:
 *   post:
 *     summary: Add recipe to meal plan
 *     tags: [Meal Plans]
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
 *             required:
 *               - recipe_id
 *               - meal_date
 *               - meal_type
 *             properties:
 *               recipe_id:
 *                 type: string
 *                 format: uuid
 *               meal_date:
 *                 type: string
 *                 format: date
 *               meal_type:
 *                 type: string
 *                 maxLength: 20
 *               servings:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       201:
 *         description: Recipe added to meal plan successfully
 *       400:
 *         description: Meal date outside plan range
 *       404:
 *         description: Meal plan or recipe not found
 *       409:
 *         description: Recipe already planned for this meal time
 */
router.post('/plans/:id/recipes', validate({ 
  params: commonSchemas.uuidParam,
  body: mealSchemas.addRecipe 
}), addRecipeToMealPlan);

/**
 * @swagger
 * /api/meals/plan-recipes/{id}:
 *   delete:
 *     summary: Remove recipe from meal plan
 *     tags: [Meal Plans]
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
 *         description: Recipe removed from meal plan successfully
 *       404:
 *         description: Meal plan recipe not found
 */
router.delete('/plan-recipes/:id', validate({ params: commonSchemas.uuidParam }), removeRecipeFromMealPlan);

export default router;