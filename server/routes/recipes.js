import express from 'express';
import { validate, recipeSchemas, commonSchemas } from '../middleware/validation.js';
import {
  getRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  addRecipeIngredient,
  updateRecipeIngredient,
  deleteRecipeIngredient
} from '../controllers/recipeController.js';

const router = express.Router();

/**
 * @swagger
 * /api/recipes:
 *   get:
 *     summary: Get all recipes for the authenticated user
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search recipes by title or description
 *       - in: query
 *         name: cuisine
 *         schema:
 *           type: string
 *         description: Filter by cuisine type
 *       - in: query
 *         name: difficulty
 *         schema:
 *           type: string
 *           enum: [easy, medium, hard]
 *         description: Filter by difficulty level
 *       - in: query
 *         name: meal_type
 *         schema:
 *           type: string
 *         description: Filter by meal type
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [created_at, title, prep_time, cook_time]
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
 *         description: Recipes retrieved successfully
 */
router.get('/', validate({ query: recipeSchemas.searchQuery }), getRecipes);

/**
 * @swagger
 * /api/recipes/{id}:
 *   get:
 *     summary: Get a specific recipe by ID with ingredients
 *     tags: [Recipes]
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
 *         description: Recipe retrieved successfully
 *       404:
 *         description: Recipe not found
 */
router.get('/:id', validate({ params: commonSchemas.uuidParam }), getRecipeById);

/**
 * @swagger
 * /api/recipes:
 *   post:
 *     summary: Create a new recipe with ingredients
 *     tags: [Recipes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - instructions
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               instructions:
 *                 type: string
 *               prep_time:
 *                 type: integer
 *                 minimum: 0
 *               cook_time:
 *                 type: integer
 *                 minimum: 0
 *               servings:
 *                 type: integer
 *                 minimum: 1
 *               difficulty_level:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               cuisine_type:
 *                 type: string
 *                 maxLength: 100
 *               meal_type:
 *                 type: string
 *                 maxLength: 50
 *               is_public:
 *                 type: boolean
 *                 default: false
 *               image_url:
 *                 type: string
 *                 format: uri
 *               source_url:
 *                 type: string
 *                 format: uri
 *               ingredients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - ingredient_name
 *                   properties:
 *                     ingredient_name:
 *                       type: string
 *                       maxLength: 255
 *                     quantity:
 *                       type: number
 *                       minimum: 0
 *                     unit:
 *                       type: string
 *                       maxLength: 50
 *                     notes:
 *                       type: string
 *     responses:
 *       201:
 *         description: Recipe created successfully
 *       409:
 *         description: Recipe with this title already exists
 */
router.post('/', validate({ body: recipeSchemas.create }), createRecipe);

/**
 * @swagger
 * /api/recipes/{id}:
 *   put:
 *     summary: Update an existing recipe
 *     tags: [Recipes]
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
 *               title:
 *                 type: string
 *                 maxLength: 255
 *               description:
 *                 type: string
 *               instructions:
 *                 type: string
 *               prep_time:
 *                 type: integer
 *                 minimum: 0
 *               cook_time:
 *                 type: integer
 *                 minimum: 0
 *               servings:
 *                 type: integer
 *                 minimum: 1
 *               difficulty_level:
 *                 type: string
 *                 enum: [easy, medium, hard]
 *               cuisine_type:
 *                 type: string
 *                 maxLength: 100
 *               meal_type:
 *                 type: string
 *                 maxLength: 50
 *               is_public:
 *                 type: boolean
 *               image_url:
 *                 type: string
 *                 format: uri
 *               source_url:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Recipe updated successfully
 *       404:
 *         description: Recipe not found
 *       409:
 *         description: Recipe with this title already exists
 */
router.put('/:id', validate({ 
  params: commonSchemas.uuidParam, 
  body: recipeSchemas.update 
}), updateRecipe);

/**
 * @swagger
 * /api/recipes/{id}:
 *   delete:
 *     summary: Delete a recipe
 *     tags: [Recipes]
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
 *         description: Recipe deleted successfully
 *       404:
 *         description: Recipe not found
 */
router.delete('/:id', validate({ params: commonSchemas.uuidParam }), deleteRecipe);

/**
 * @swagger
 * /api/recipes/{id}/ingredients:
 *   post:
 *     summary: Add ingredient to recipe
 *     tags: [Recipe Ingredients]
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
 *               - ingredient_name
 *             properties:
 *               ingredient_name:
 *                 type: string
 *                 maxLength: 255
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *               unit:
 *                 type: string
 *                 maxLength: 50
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ingredient added to recipe successfully
 *       404:
 *         description: Recipe not found
 *       409:
 *         description: Ingredient with this name already exists in recipe
 */
router.post('/:id/ingredients', validate({ 
  params: commonSchemas.uuidParam,
  body: recipeSchemas.createIngredient 
}), addRecipeIngredient);

/**
 * @swagger
 * /api/recipes/ingredients/{id}:
 *   put:
 *     summary: Update recipe ingredient
 *     tags: [Recipe Ingredients]
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
 *               ingredient_name:
 *                 type: string
 *                 maxLength: 255
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *               unit:
 *                 type: string
 *                 maxLength: 50
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recipe ingredient updated successfully
 *       404:
 *         description: Recipe ingredient not found
 *       409:
 *         description: Ingredient with this name already exists in recipe
 */
router.put('/ingredients/:id', validate({ 
  params: commonSchemas.uuidParam, 
  body: recipeSchemas.updateIngredient 
}), updateRecipeIngredient);

/**
 * @swagger
 * /api/recipes/ingredients/{id}:
 *   delete:
 *     summary: Delete recipe ingredient
 *     tags: [Recipe Ingredients]
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
 *         description: Recipe ingredient deleted successfully
 *       404:
 *         description: Recipe ingredient not found
 */
router.delete('/ingredients/:id', validate({ params: commonSchemas.uuidParam }), deleteRecipeIngredient);

export default router;