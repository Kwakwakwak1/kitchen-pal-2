import prisma from '../config/database.js';

/**
 * Inventory Management Controller
 * Handles CRUD operations for user inventory items
 */

/**
 * Get all inventory items for the authenticated user
 * GET /api/inventory
 */
export const getInventory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      search, 
      location,
      expired,
      low_stock,
      sortBy = 'created_at', 
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build where clause
    const whereClause = {
      user_id: userId
    };

    // Add search functionality
    if (search) {
      whereClause.ingredient_name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Filter by location
    if (location) {
      whereClause.location = {
        contains: location,
        mode: 'insensitive'
      };
    }

    // Filter by expiration status
    if (expired !== undefined) {
      const now = new Date();
      if (expired === 'true') {
        whereClause.expiry_date = {
          lt: now
        };
      } else {
        whereClause.OR = [
          { expiry_date: null },
          { expiry_date: { gte: now } }
        ];
      }
    }

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get inventory items
    const [inventoryItems, totalCount] = await Promise.all([
      prisma.user_inventory.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          ingredient_name: true,
          quantity: true,
          unit: true,
          expiry_date: true,
          location: true,
          notes: true,
          created_at: true,
          updated_at: true
        }
      }),
      prisma.user_inventory.count({ where: whereClause })
    ]);

    // Calculate additional metadata
    const now = new Date();
    const itemsWithStatus = inventoryItems.map(item => {
      const isExpired = item.expiry_date && item.expiry_date < now;
      const isExpiringSoon = item.expiry_date && !isExpired && 
        item.expiry_date <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      return {
        ...item,
        quantity: item.quantity ? parseFloat(item.quantity) : null,
        is_expired: isExpired,
        is_expiring_soon: isExpiringSoon,
        days_until_expiry: item.expiry_date ? 
          Math.ceil((item.expiry_date - now) / (1000 * 60 * 60 * 24)) : null
      };
    });

    res.status(200).json({
      inventory: itemsWithStatus,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific inventory item by ID
 * GET /api/inventory/:id
 */
export const getInventoryItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const inventoryItem = await prisma.user_inventory.findFirst({
      where: {
        id,
        user_id: userId
      },
      select: {
        id: true,
        ingredient_name: true,
        quantity: true,
        unit: true,
        expiry_date: true,
        location: true,
        notes: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!inventoryItem) {
      return res.status(404).json({
        error: {
          message: 'Inventory item not found',
          statusCode: 404
        }
      });
    }

    // Add status information
    const now = new Date();
    const isExpired = inventoryItem.expiry_date && inventoryItem.expiry_date < now;
    const isExpiringSoon = inventoryItem.expiry_date && !isExpired && 
      inventoryItem.expiry_date <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const itemWithStatus = {
      ...inventoryItem,
      quantity: inventoryItem.quantity ? parseFloat(inventoryItem.quantity) : null,
      is_expired: isExpired,
      is_expiring_soon: isExpiringSoon,
      days_until_expiry: inventoryItem.expiry_date ? 
        Math.ceil((inventoryItem.expiry_date - now) / (1000 * 60 * 60 * 24)) : null
    };

    res.status(200).json({
      inventory_item: itemWithStatus
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Create a new inventory item
 * POST /api/inventory
 */
export const createInventoryItem = async (req, res, next) => {
  try {
    const { ingredient_name, quantity, unit, expiry_date, location, notes } = req.body;
    const userId = req.user.id;

    // Check if item with same name and location already exists
    const existingItem = await prisma.user_inventory.findFirst({
      where: {
        user_id: userId,
        ingredient_name: {
          equals: ingredient_name,
          mode: 'insensitive'
        },
        location: location || null
      }
    });

    if (existingItem) {
      return res.status(409).json({
        error: {
          message: 'An inventory item with this name and location already exists',
          statusCode: 409,
          details: {
            existing_item_id: existingItem.id
          }
        }
      });
    }

    const inventoryItem = await prisma.user_inventory.create({
      data: {
        user_id: userId,
        ingredient_name,
        quantity: quantity ? parseFloat(quantity) : null,
        unit,
        expiry_date: expiry_date ? new Date(expiry_date) : null,
        location,
        notes
      },
      select: {
        id: true,
        ingredient_name: true,
        quantity: true,
        unit: true,
        expiry_date: true,
        location: true,
        notes: true,
        created_at: true,
        updated_at: true
      }
    });

    // Add status information
    const now = new Date();
    const isExpired = inventoryItem.expiry_date && inventoryItem.expiry_date < now;
    const isExpiringSoon = inventoryItem.expiry_date && !isExpired && 
      inventoryItem.expiry_date <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const itemWithStatus = {
      ...inventoryItem,
      quantity: inventoryItem.quantity ? parseFloat(inventoryItem.quantity) : null,
      is_expired: isExpired,
      is_expiring_soon: isExpiringSoon,
      days_until_expiry: inventoryItem.expiry_date ? 
        Math.ceil((inventoryItem.expiry_date - now) / (1000 * 60 * 60 * 24)) : null
    };

    res.status(201).json({
      message: 'Inventory item created successfully',
      inventory_item: itemWithStatus
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing inventory item
 * PUT /api/inventory/:id
 */
export const updateInventoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ingredient_name, quantity, unit, expiry_date, location, notes } = req.body;
    const userId = req.user.id;

    // Check if inventory item exists and belongs to user
    const existingItem = await prisma.user_inventory.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        error: {
          message: 'Inventory item not found',
          statusCode: 404
        }
      });
    }

    // Check if another item with the same name and location exists (if those are being changed)
    if (ingredient_name || location !== undefined) {
      const newName = ingredient_name || existingItem.ingredient_name;
      const newLocation = location !== undefined ? location : existingItem.location;

      if (newName !== existingItem.ingredient_name || newLocation !== existingItem.location) {
        const duplicateItem = await prisma.user_inventory.findFirst({
          where: {
            user_id: userId,
            ingredient_name: {
              equals: newName,
              mode: 'insensitive'
            },
            location: newLocation,
            id: {
              not: id
            }
          }
        });

        if (duplicateItem) {
          return res.status(409).json({
            error: {
              message: 'An inventory item with this name and location already exists',
              statusCode: 409
            }
          });
        }
      }
    }

    // Prepare update data
    const updateData = {};
    if (ingredient_name !== undefined) updateData.ingredient_name = ingredient_name;
    if (quantity !== undefined) updateData.quantity = quantity ? parseFloat(quantity) : null;
    if (unit !== undefined) updateData.unit = unit;
    if (expiry_date !== undefined) updateData.expiry_date = expiry_date ? new Date(expiry_date) : null;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;

    const updatedItem = await prisma.user_inventory.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        ingredient_name: true,
        quantity: true,
        unit: true,
        expiry_date: true,
        location: true,
        notes: true,
        created_at: true,
        updated_at: true
      }
    });

    // Add status information
    const now = new Date();
    const isExpired = updatedItem.expiry_date && updatedItem.expiry_date < now;
    const isExpiringSoon = updatedItem.expiry_date && !isExpired && 
      updatedItem.expiry_date <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const itemWithStatus = {
      ...updatedItem,
      quantity: updatedItem.quantity ? parseFloat(updatedItem.quantity) : null,
      is_expired: isExpired,
      is_expiring_soon: isExpiringSoon,
      days_until_expiry: updatedItem.expiry_date ? 
        Math.ceil((updatedItem.expiry_date - now) / (1000 * 60 * 60 * 24)) : null
    };

    res.status(200).json({
      message: 'Inventory item updated successfully',
      inventory_item: itemWithStatus
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete an inventory item
 * DELETE /api/inventory/:id
 */
export const deleteInventoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if inventory item exists and belongs to user
    const existingItem = await prisma.user_inventory.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        error: {
          message: 'Inventory item not found',
          statusCode: 404
        }
      });
    }

    // Delete the inventory item
    await prisma.user_inventory.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Inventory item deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get low stock items
 * GET /api/inventory/low-stock
 */
export const getLowStockItems = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { threshold = 5 } = req.query;

    const lowStockItems = await prisma.user_inventory.findMany({
      where: {
        user_id: userId,
        quantity: {
          lte: parseFloat(threshold)
        }
      },
      orderBy: {
        quantity: 'asc'
      },
      select: {
        id: true,
        ingredient_name: true,
        quantity: true,
        unit: true,
        expiry_date: true,
        location: true,
        notes: true,
        created_at: true,
        updated_at: true
      }
    });

    // Add status information
    const now = new Date();
    const itemsWithStatus = lowStockItems.map(item => {
      const isExpired = item.expiry_date && item.expiry_date < now;
      const isExpiringSoon = item.expiry_date && !isExpired && 
        item.expiry_date <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      return {
        ...item,
        quantity: item.quantity ? parseFloat(item.quantity) : null,
        is_expired: isExpired,
        is_expiring_soon: isExpiringSoon,
        days_until_expiry: item.expiry_date ? 
          Math.ceil((item.expiry_date - now) / (1000 * 60 * 60 * 24)) : null
      };
    });

    res.status(200).json({
      low_stock_items: itemsWithStatus,
      count: itemsWithStatus.length,
      threshold: parseFloat(threshold)
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get expiring items
 * GET /api/inventory/expiring
 */
export const getExpiringItems = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const now = new Date();
    const futureDate = new Date(now.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

    const expiringItems = await prisma.user_inventory.findMany({
      where: {
        user_id: userId,
        expiry_date: {
          gte: now,
          lte: futureDate
        }
      },
      orderBy: {
        expiry_date: 'asc'
      },
      select: {
        id: true,
        ingredient_name: true,
        quantity: true,
        unit: true,
        expiry_date: true,
        location: true,
        notes: true,
        created_at: true,
        updated_at: true
      }
    });

    // Add status information
    const itemsWithStatus = expiringItems.map(item => {
      const isExpired = item.expiry_date && item.expiry_date < now;
      const isExpiringSoon = item.expiry_date && !isExpired && 
        item.expiry_date <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      return {
        ...item,
        quantity: item.quantity ? parseFloat(item.quantity) : null,
        is_expired: isExpired,
        is_expiring_soon: isExpiringSoon,
        days_until_expiry: item.expiry_date ? 
          Math.ceil((item.expiry_date - now) / (1000 * 60 * 60 * 24)) : null
      };
    });

    res.status(200).json({
      expiring_items: itemsWithStatus,
      count: itemsWithStatus.length,
      days_threshold: parseInt(days)
    });

  } catch (error) {
    next(error);
  }
};