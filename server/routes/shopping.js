import express from 'express';
import { validate, shoppingSchemas, commonSchemas } from '../middleware/validation.js';
import {
  getShoppingLists,
  getShoppingListById,
  createShoppingList,
  updateShoppingList,
  deleteShoppingList,
  getShoppingListItems,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  bulkUpdateItems,
  clearCheckedItems
} from '../controllers/shoppingController.js';

const router = express.Router();

/**
 * @swagger
 * /api/shopping/lists:
 *   get:
 *     summary: Get all shopping lists for the authenticated user
 *     tags: [Shopping Lists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search lists by name
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, created_at, updated_at]
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
 *         description: Shopping lists retrieved successfully
 */
router.get('/lists', getShoppingLists);

/**
 * @swagger
 * /api/shopping/lists/{id}:
 *   get:
 *     summary: Get a specific shopping list by ID
 *     tags: [Shopping Lists]
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
 *         description: Shopping list retrieved successfully
 *       404:
 *         description: Shopping list not found
 */
router.get('/lists/:id', validate({ params: commonSchemas.uuidParam }), getShoppingListById);

/**
 * @swagger
 * /api/shopping/lists:
 *   post:
 *     summary: Create a new shopping list
 *     tags: [Shopping Lists]
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
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 255
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Shopping list created successfully
 *       409:
 *         description: Shopping list with this name already exists
 */
router.post('/lists', validate({ body: shoppingSchemas.createList }), createShoppingList);

/**
 * @swagger
 * /api/shopping/lists/{id}:
 *   put:
 *     summary: Update an existing shopping list
 *     tags: [Shopping Lists]
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
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Shopping list updated successfully
 *       404:
 *         description: Shopping list not found
 *       409:
 *         description: Shopping list with this name already exists
 */
router.put('/lists/:id', validate({ 
  params: commonSchemas.uuidParam, 
  body: shoppingSchemas.updateList 
}), updateShoppingList);

/**
 * @swagger
 * /api/shopping/lists/{id}:
 *   delete:
 *     summary: Delete a shopping list
 *     tags: [Shopping Lists]
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
 *         description: Shopping list deleted successfully
 *       404:
 *         description: Shopping list not found
 */
router.delete('/lists/:id', validate({ params: commonSchemas.uuidParam }), deleteShoppingList);

/**
 * @swagger
 * /api/shopping/lists/{id}/items:
 *   get:
 *     summary: Get all items for a specific shopping list
 *     tags: [Shopping List Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: purchased
 *         schema:
 *           type: boolean
 *         description: Filter by purchased status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [ingredient_name, created_at, updated_at]
 *           default: created_at
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *     responses:
 *       200:
 *         description: Shopping list items retrieved successfully
 *       404:
 *         description: Shopping list not found
 */
router.get('/lists/:id/items', validate({ params: commonSchemas.uuidParam }), getShoppingListItems);

/**
 * @swagger
 * /api/shopping/lists/{id}/items:
 *   post:
 *     summary: Add an item to a shopping list
 *     tags: [Shopping List Items]
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
 *         description: Item added to shopping list successfully
 *       404:
 *         description: Shopping list not found
 *       409:
 *         description: Item with this name already exists in the list
 */
router.post('/lists/:id/items', validate({ 
  params: commonSchemas.uuidParam, 
  body: shoppingSchemas.createItem 
}), addShoppingListItem);

/**
 * @swagger
 * /api/shopping/lists/{id}/items/bulk-update:
 *   post:
 *     summary: Bulk update shopping list items (check/uncheck multiple)
 *     tags: [Shopping List Items]
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
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - is_purchased
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     is_purchased:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Items updated successfully
 *       400:
 *         description: Some items do not belong to this list
 *       404:
 *         description: Shopping list not found
 */
router.post('/lists/:id/items/bulk-update', validate({ 
  params: commonSchemas.uuidParam, 
  body: shoppingSchemas.bulkUpdateItems 
}), bulkUpdateItems);

/**
 * @swagger
 * /api/shopping/lists/{id}/items/clear-checked:
 *   delete:
 *     summary: Clear all checked items from a shopping list
 *     tags: [Shopping List Items]
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
 *         description: Checked items cleared successfully
 *       404:
 *         description: Shopping list not found
 */
router.delete('/lists/:id/items/clear-checked', validate({ params: commonSchemas.uuidParam }), clearCheckedItems);

/**
 * @swagger
 * /api/shopping/items/{id}:
 *   put:
 *     summary: Update a shopping list item
 *     tags: [Shopping List Items]
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
 *               is_purchased:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Shopping list item updated successfully
 *       404:
 *         description: Shopping list item not found
 *       409:
 *         description: Item with this name already exists in the list
 */
router.put('/items/:id', validate({ 
  params: commonSchemas.uuidParam, 
  body: shoppingSchemas.updateItem 
}), updateShoppingListItem);

/**
 * @swagger
 * /api/shopping/items/{id}:
 *   delete:
 *     summary: Delete a shopping list item
 *     tags: [Shopping List Items]
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
 *         description: Shopping list item deleted successfully
 *       404:
 *         description: Shopping list item not found
 */
router.delete('/items/:id', validate({ params: commonSchemas.uuidParam }), deleteShoppingListItem);

export default router;