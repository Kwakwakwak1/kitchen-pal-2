import prisma from '../config/database.js';

/**
 * Store Management Controller
 * Handles CRUD operations for user stores
 */

/**
 * Get all stores for the authenticated user
 * GET /api/stores
 */
export const getStores = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    // Build where clause
    const whereClause = {
      user_id: userId
    };

    // Add search functionality
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const stores = await prisma.stores.findMany({
      where: whereClause,
      orderBy,
      select: {
        id: true,
        name: true,
        location: true,
        website: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(200).json({
      stores,
      count: stores.length
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific store by ID
 * GET /api/stores/:id
 */
export const getStoreById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const store = await prisma.stores.findFirst({
      where: {
        id,
        user_id: userId
      },
      select: {
        id: true,
        name: true,
        location: true,
        website: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!store) {
      return res.status(404).json({
        error: {
          message: 'Store not found',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      store
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Create a new store
 * POST /api/stores
 */
export const createStore = async (req, res, next) => {
  try {
    const { name, location, website } = req.body;
    const userId = req.user.id;

    // Check if store with same name already exists for this user
    const existingStore = await prisma.stores.findFirst({
      where: {
        user_id: userId,
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });

    if (existingStore) {
      return res.status(409).json({
        error: {
          message: 'A store with this name already exists',
          statusCode: 409
        }
      });
    }

    const store = await prisma.stores.create({
      data: {
        user_id: userId,
        name,
        location,
        website
      },
      select: {
        id: true,
        name: true,
        location: true,
        website: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(201).json({
      message: 'Store created successfully',
      store
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing store
 * PUT /api/stores/:id
 */
export const updateStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, location, website } = req.body;
    const userId = req.user.id;

    // Check if store exists and belongs to user
    const existingStore = await prisma.stores.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingStore) {
      return res.status(404).json({
        error: {
          message: 'Store not found',
          statusCode: 404
        }
      });
    }

    // Check if another store with the same name exists (if name is being changed)
    if (name && name.toLowerCase() !== existingStore.name.toLowerCase()) {
      const duplicateStore = await prisma.stores.findFirst({
        where: {
          user_id: userId,
          name: {
            equals: name,
            mode: 'insensitive'
          },
          id: {
            not: id
          }
        }
      });

      if (duplicateStore) {
        return res.status(409).json({
          error: {
            message: 'A store with this name already exists',
            statusCode: 409
          }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;

    const updatedStore = await prisma.stores.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        location: true,
        website: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(200).json({
      message: 'Store updated successfully',
      store: updatedStore
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete a store
 * DELETE /api/stores/:id
 */
export const deleteStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if store exists and belongs to user
    const existingStore = await prisma.stores.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingStore) {
      return res.status(404).json({
        error: {
          message: 'Store not found',
          statusCode: 404
        }
      });
    }

    // Delete the store
    await prisma.stores.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Store deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};