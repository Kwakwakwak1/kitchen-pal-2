import prisma from '../config/database.js';
import { executeTransaction } from '../config/database.js';

/**
 * Shopping Lists Controller
 * Handles CRUD operations for shopping lists and their items
 */

/**
 * Get all shopping lists for the authenticated user
 * GET /api/shopping/lists
 */
export const getShoppingLists = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      search, 
      is_active,
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
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Filter by active status
    if (is_active !== undefined) {
      whereClause.is_active = is_active === 'true';
    }

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get shopping lists with item counts
    const [shoppingLists, totalCount] = await Promise.all([
      prisma.shopping_lists.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              shopping_list_items: true
            }
          }
        }
      }),
      prisma.shopping_lists.count({ where: whereClause })
    ]);

    // Transform the data to include item counts
    const listsWithCounts = shoppingLists.map(list => ({
      ...list,
      items_count: list._count.shopping_list_items,
      _count: undefined
    }));

    res.status(200).json({
      shopping_lists: listsWithCounts,
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
 * Get a specific shopping list by ID
 * GET /api/shopping/lists/:id
 */
export const getShoppingListById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const shoppingList = await prisma.shopping_lists.findFirst({
      where: {
        id,
        user_id: userId
      },
      select: {
        id: true,
        name: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!shoppingList) {
      return res.status(404).json({
        error: {
          message: 'Shopping list not found',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      shopping_list: shoppingList
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Create a new shopping list
 * POST /api/shopping/lists
 */
export const createShoppingList = async (req, res, next) => {
  try {
    const { name, is_active = true } = req.body;
    const userId = req.user.id;

    // Check if shopping list with same name already exists for this user
    const existingList = await prisma.shopping_lists.findFirst({
      where: {
        user_id: userId,
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });

    if (existingList) {
      return res.status(409).json({
        error: {
          message: 'A shopping list with this name already exists',
          statusCode: 409
        }
      });
    }

    const shoppingList = await prisma.shopping_lists.create({
      data: {
        user_id: userId,
        name,
        is_active
      },
      select: {
        id: true,
        name: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(201).json({
      message: 'Shopping list created successfully',
      shopping_list: shoppingList
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing shopping list
 * PUT /api/shopping/lists/:id
 */
export const updateShoppingList = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, is_active } = req.body;
    const userId = req.user.id;

    // Check if shopping list exists and belongs to user
    const existingList = await prisma.shopping_lists.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingList) {
      return res.status(404).json({
        error: {
          message: 'Shopping list not found',
          statusCode: 404
        }
      });
    }

    // Check if another list with the same name exists (if name is being changed)
    if (name && name.toLowerCase() !== existingList.name.toLowerCase()) {
      const duplicateList = await prisma.shopping_lists.findFirst({
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

      if (duplicateList) {
        return res.status(409).json({
          error: {
            message: 'A shopping list with this name already exists',
            statusCode: 409
          }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (is_active !== undefined) updateData.is_active = is_active;

    const updatedList = await prisma.shopping_lists.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        is_active: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(200).json({
      message: 'Shopping list updated successfully',
      shopping_list: updatedList
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete a shopping list
 * DELETE /api/shopping/lists/:id
 */
export const deleteShoppingList = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if shopping list exists and belongs to user
    const existingList = await prisma.shopping_lists.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingList) {
      return res.status(404).json({
        error: {
          message: 'Shopping list not found',
          statusCode: 404
        }
      });
    }

    // Delete the shopping list (cascading delete will handle items)
    await prisma.shopping_lists.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Shopping list deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all items for a specific shopping list
 * GET /api/shopping/lists/:id/items
 */
export const getShoppingListItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { purchased, sortBy = 'created_at', sortOrder = 'asc' } = req.query;

    // Check if shopping list exists and belongs to user
    const shoppingList = await prisma.shopping_lists.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!shoppingList) {
      return res.status(404).json({
        error: {
          message: 'Shopping list not found',
          statusCode: 404
        }
      });
    }

    // Build where clause for items
    const whereClause = {
      shopping_list_id: id
    };

    // Filter by purchased status
    if (purchased !== undefined) {
      whereClause.is_purchased = purchased === 'true';
    }

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const items = await prisma.shopping_list_items.findMany({
      where: whereClause,
      orderBy,
      select: {
        id: true,
        ingredient_name: true,
        quantity: true,
        unit: true,
        is_purchased: true,
        notes: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(200).json({
      items,
      count: items.length
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Add an item to a shopping list
 * POST /api/shopping/lists/:id/items
 */
export const addShoppingListItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ingredient_name, quantity, unit, notes } = req.body;
    const userId = req.user.id;

    // Check if shopping list exists and belongs to user
    const shoppingList = await prisma.shopping_lists.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!shoppingList) {
      return res.status(404).json({
        error: {
          message: 'Shopping list not found',
          statusCode: 404
        }
      });
    }

    // Check if item with same name already exists in this list
    const existingItem = await prisma.shopping_list_items.findFirst({
      where: {
        shopping_list_id: id,
        ingredient_name: {
          equals: ingredient_name,
          mode: 'insensitive'
        }
      }
    });

    if (existingItem) {
      return res.status(409).json({
        error: {
          message: 'An item with this name already exists in the shopping list',
          statusCode: 409
        }
      });
    }

    const item = await prisma.shopping_list_items.create({
      data: {
        shopping_list_id: id,
        ingredient_name,
        quantity,
        unit,
        notes,
        is_purchased: false
      },
      select: {
        id: true,
        ingredient_name: true,
        quantity: true,
        unit: true,
        is_purchased: true,
        notes: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(201).json({
      message: 'Item added to shopping list successfully',
      item
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update a shopping list item
 * PUT /api/shopping/items/:id
 */
export const updateShoppingListItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ingredient_name, quantity, unit, is_purchased, notes } = req.body;
    const userId = req.user.id;

    // Check if item exists and belongs to user's shopping list
    const existingItem = await prisma.shopping_list_items.findFirst({
      where: {
        id,
        shopping_list: {
          user_id: userId
        }
      },
      include: {
        shopping_list: true
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        error: {
          message: 'Shopping list item not found',
          statusCode: 404
        }
      });
    }

    // Check if another item with the same name exists (if name is being changed)
    if (ingredient_name && ingredient_name.toLowerCase() !== existingItem.ingredient_name.toLowerCase()) {
      const duplicateItem = await prisma.shopping_list_items.findFirst({
        where: {
          shopping_list_id: existingItem.shopping_list_id,
          ingredient_name: {
            equals: ingredient_name,
            mode: 'insensitive'
          },
          id: {
            not: id
          }
        }
      });

      if (duplicateItem) {
        return res.status(409).json({
          error: {
            message: 'An item with this name already exists in the shopping list',
            statusCode: 409
          }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (ingredient_name !== undefined) updateData.ingredient_name = ingredient_name;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unit !== undefined) updateData.unit = unit;
    if (is_purchased !== undefined) updateData.is_purchased = is_purchased;
    if (notes !== undefined) updateData.notes = notes;

    const updatedItem = await prisma.shopping_list_items.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        ingredient_name: true,
        quantity: true,
        unit: true,
        is_purchased: true,
        notes: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(200).json({
      message: 'Shopping list item updated successfully',
      item: updatedItem
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete a shopping list item
 * DELETE /api/shopping/items/:id
 */
export const deleteShoppingListItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if item exists and belongs to user's shopping list
    const existingItem = await prisma.shopping_list_items.findFirst({
      where: {
        id,
        shopping_list: {
          user_id: userId
        }
      }
    });

    if (!existingItem) {
      return res.status(404).json({
        error: {
          message: 'Shopping list item not found',
          statusCode: 404
        }
      });
    }

    // Delete the item
    await prisma.shopping_list_items.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Shopping list item deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update shopping list items (check/uncheck multiple items)
 * POST /api/shopping/lists/:id/items/bulk-update
 */
export const bulkUpdateItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const userId = req.user.id;

    // Check if shopping list exists and belongs to user
    const shoppingList = await prisma.shopping_lists.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!shoppingList) {
      return res.status(404).json({
        error: {
          message: 'Shopping list not found',
          statusCode: 404
        }
      });
    }

    // Verify all items belong to this shopping list
    const itemIds = items.map(item => item.id);
    const existingItems = await prisma.shopping_list_items.findMany({
      where: {
        id: { in: itemIds },
        shopping_list_id: id
      }
    });

    if (existingItems.length !== items.length) {
      return res.status(400).json({
        error: {
          message: 'Some items do not belong to this shopping list',
          statusCode: 400
        }
      });
    }

    // Perform bulk update using transaction
    const updatedItems = await executeTransaction(async (prisma) => {
      const updates = items.map(item =>
        prisma.shopping_list_items.update({
          where: { id: item.id },
          data: { is_purchased: item.is_purchased },
          select: {
            id: true,
            ingredient_name: true,
            quantity: true,
            unit: true,
            is_purchased: true,
            notes: true,
            created_at: true,
            updated_at: true
          }
        })
      );

      return Promise.all(updates);
    });

    res.status(200).json({
      message: 'Items updated successfully',
      items: updatedItems
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Clear all checked items from a shopping list
 * DELETE /api/shopping/lists/:id/items/clear-checked
 */
export const clearCheckedItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if shopping list exists and belongs to user
    const shoppingList = await prisma.shopping_lists.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!shoppingList) {
      return res.status(404).json({
        error: {
          message: 'Shopping list not found',
          statusCode: 404
        }
      });
    }

    // Delete all checked items
    const deleteResult = await prisma.shopping_list_items.deleteMany({
      where: {
        shopping_list_id: id,
        is_purchased: true
      }
    });

    res.status(200).json({
      message: 'Checked items cleared successfully',
      deleted_count: deleteResult.count
    });

  } catch (error) {
    next(error);
  }
};