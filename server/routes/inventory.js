import express from 'express';
import { validate, inventorySchemas, commonSchemas } from '../middleware/validation.js';
import {
  getInventory,
  getInventoryItemById,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  batchDeleteInventoryItems,
  batchEmptyInventoryItems,
  getLowStockItems,
  getExpiringItems
} from '../controllers/inventoryController.js';

const router = express.Router();

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Get all inventory items for the authenticated user
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search items by ingredient name
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by storage location
 *       - in: query
 *         name: expired
 *         schema:
 *           type: boolean
 *         description: Filter by expiration status
 *       - in: query
 *         name: low_stock
 *         schema:
 *           type: boolean
 *         description: Filter by low stock status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [ingredient_name, expiry_date, created_at, quantity]
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
 *         description: Inventory items retrieved successfully
 */
router.get('/', validate({ query: inventorySchemas.searchQuery }), getInventory);

/**
 * @swagger
 * /api/inventory/low-stock:
 *   get:
 *     summary: Get low stock inventory items
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           default: 5
 *         description: Quantity threshold for low stock
 *     responses:
 *       200:
 *         description: Low stock items retrieved successfully
 */
router.get('/low-stock', getLowStockItems);

/**
 * @swagger
 * /api/inventory/expiring:
 *   get:
 *     summary: Get expiring inventory items
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Days ahead to check for expiring items
 *     responses:
 *       200:
 *         description: Expiring items retrieved successfully
 */
router.get('/expiring', getExpiringItems);

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: Get a specific inventory item by ID
 *     tags: [Inventory]
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
 *         description: Inventory item retrieved successfully
 *       404:
 *         description: Inventory item not found
 */
router.get('/:id', validate({ params: commonSchemas.uuidParam }), getInventoryItemById);

/**
 * @swagger
 * /api/inventory:
 *   post:
 *     summary: Create a new inventory item
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ingredient_name
 *               - quantity
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
 *               expiry_date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *                 maxLength: 100
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Inventory item created successfully
 *       409:
 *         description: Item with this name and location already exists
 */
router.post('/', validate({ body: inventorySchemas.create }), createInventoryItem);

/**
 * @swagger
 * /api/inventory/{id}:
 *   put:
 *     summary: Update an existing inventory item
 *     tags: [Inventory]
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
 *               expiry_date:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *                 maxLength: 100
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inventory item updated successfully
 *       404:
 *         description: Inventory item not found
 *       409:
 *         description: Item with this name and location already exists
 */
router.put('/:id', validate({ 
  params: commonSchemas.uuidParam, 
  body: inventorySchemas.update 
}), updateInventoryItem);

/**
 * @swagger
 * /api/inventory/batch/empty:
 *   put:
 *     summary: Batch empty inventory items (set quantity to 0)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 description: Array of inventory item IDs to empty
 *     responses:
 *       200:
 *         description: Inventory items emptied successfully
 *       404:
 *         description: Some inventory items were not found
 *       400:
 *         description: Invalid request data
 */
router.put('/batch/empty', validate({ body: inventorySchemas.batchEmpty }), batchEmptyInventoryItems);

/**
 * @swagger
 * /api/inventory/batch:
 *   delete:
 *     summary: Batch delete inventory items (permanently remove)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 description: Array of inventory item IDs to permanently delete
 *     responses:
 *       200:
 *         description: Inventory items deleted successfully
 *       404:
 *         description: Some inventory items were not found
 *       400:
 *         description: Invalid request data
 */
router.delete('/batch', validate({ body: inventorySchemas.batchDelete }), batchDeleteInventoryItems);

/**
 * @swagger
 * /api/inventory/{id}:
 *   delete:
 *     summary: Delete an inventory item
 *     tags: [Inventory]
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
 *         description: Inventory item deleted successfully
 *       404:
 *         description: Inventory item not found
 */
router.delete('/:id', validate({ params: commonSchemas.uuidParam }), deleteInventoryItem);

export default router;