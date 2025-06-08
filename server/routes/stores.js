import express from 'express';
import { validate, storeSchemas, commonSchemas } from '../middleware/validation.js';
import {
  getStores,
  getStoreById,
  createStore,
  updateStore,
  deleteStore
} from '../controllers/storeController.js';

const router = express.Router();

/**
 * @swagger
 * /api/stores:
 *   get:
 *     summary: Get all stores for the authenticated user
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search stores by name or location
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, location, created_at]
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Stores retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', validate({ query: storeSchemas.searchQuery }), getStores);

/**
 * @swagger
 * /api/stores/{id}:
 *   get:
 *     summary: Get a specific store by ID
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store retrieved successfully
 *       404:
 *         description: Store not found
 */
router.get('/:id', validate({ params: commonSchemas.uuidParam }), getStoreById);

/**
 * @swagger
 * /api/stores:
 *   post:
 *     summary: Create a new store
 *     tags: [Stores]
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
 *               location:
 *                 type: string
 *                 maxLength: 500
 *               website:
 *                 type: string
 *                 format: uri
 *     responses:
 *       201:
 *         description: Store created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Store with this name already exists
 */
router.post('/', validate({ body: storeSchemas.create }), createStore);

/**
 * @swagger
 * /api/stores/{id}:
 *   put:
 *     summary: Update an existing store
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
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
 *               location:
 *                 type: string
 *                 maxLength: 500
 *               website:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Store updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Store not found
 *       409:
 *         description: Store with this name already exists
 */
router.put('/:id', validate({ 
  params: commonSchemas.uuidParam, 
  body: storeSchemas.update 
}), updateStore);

/**
 * @swagger
 * /api/stores/{id}:
 *   delete:
 *     summary: Delete a store
 *     tags: [Stores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Store ID
 *     responses:
 *       200:
 *         description: Store deleted successfully
 *       404:
 *         description: Store not found
 */
router.delete('/:id', validate({ params: commonSchemas.uuidParam }), deleteStore);

export default router;