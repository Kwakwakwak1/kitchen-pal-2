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

    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (prisma) => {
      // Check if shopping list exists and belongs to user
      const shoppingList = await prisma.shopping_lists.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!shoppingList) {
        throw new Error('SHOPPING_LIST_NOT_FOUND');
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
        throw new Error('DUPLICATE_ITEM');
      }

      // Create the new item
      const item = await prisma.shopping_list_items.create({
        data: {
          shopping_list_id: id,
          ingredient_name: ingredient_name.trim(),
          quantity: quantity ? parseFloat(quantity) : null,
          unit: unit?.trim() || null,
          notes: notes?.trim() || null,
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

      return item;
    });

    res.status(201).json({
      message: 'Item added to shopping list successfully',
      item: result
    });

  } catch (error) {
    if (error.message === 'SHOPPING_LIST_NOT_FOUND') {
      return res.status(404).json({
        error: {
          message: 'Shopping list not found',
          statusCode: 404
        }
      });
    }

    if (error.message === 'DUPLICATE_ITEM') {
      return res.status(409).json({
        error: {
          message: 'An item with this name already exists in the shopping list',
          statusCode: 409,
          field: 'ingredient_name'
        }
      });
    }

    next(error);
  }
};

/**
 * Bulk create shopping list items
 * POST /api/shopping/lists/:id/items/bulk-create
 */
export const bulkCreateItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const userId = req.user.id;

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (prisma) => {
      // Check if shopping list exists and belongs to user
      const shoppingList = await prisma.shopping_lists.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!shoppingList) {
        throw new Error('SHOPPING_LIST_NOT_FOUND');
      }

      // Get existing items to check for duplicates
      const existingItems = await prisma.shopping_list_items.findMany({
        where: { shopping_list_id: id },
        select: { ingredient_name: true }
      });

      const existingNames = new Set(
        existingItems.map(item => item.ingredient_name.toLowerCase())
      );

      // Filter out items that would create duplicates
      const validItems = [];
      const duplicateItems = [];

      for (const item of items) {
        const normalizedName = item.ingredient_name.trim().toLowerCase();
        if (existingNames.has(normalizedName)) {
          duplicateItems.push(item.ingredient_name);
        } else {
          validItems.push({
            shopping_list_id: id,
            ingredient_name: item.ingredient_name.trim(),
            quantity: item.quantity ? parseFloat(item.quantity) : null,
            unit: item.unit?.trim() || null,
            notes: item.notes?.trim() || null,
            is_purchased: false
          });
          // Add to existing names to prevent duplicates within this batch
          existingNames.add(normalizedName);
        }
      }

      // Create all valid items in a single operation
      let createdItems = [];
      if (validItems.length > 0) {
        await prisma.shopping_list_items.createMany({
          data: validItems
        });

        // Get the created items with their IDs
        createdItems = await prisma.shopping_list_items.findMany({
          where: {
            shopping_list_id: id,
            ingredient_name: {
              in: validItems.map(item => item.ingredient_name)
            }
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
          },
          orderBy: { created_at: 'desc' },
          take: validItems.length
        });
      }

      return {
        createdItems,
        duplicateItems,
        totalRequested: items.length,
        totalCreated: createdItems.length
      };
    });

    // Prepare response
    const response = {
      message: result.duplicateItems.length > 0 
        ? `${result.totalCreated}/${result.totalRequested} items added successfully. ${result.duplicateItems.length} items skipped (duplicates).`
        : `${result.totalCreated} items added to shopping list successfully`,
      items: result.createdItems,
      created_count: result.totalCreated,
      total_requested: result.totalRequested
    };

    if (result.duplicateItems.length > 0) {
      response.duplicate_items = result.duplicateItems;
      response.warning = `The following items already exist and were skipped: ${result.duplicateItems.join(', ')}`;
    }

    res.status(201).json(response);

  } catch (error) {
    if (error.message === 'SHOPPING_LIST_NOT_FOUND') {
      return res.status(404).json({
        error: {
          message: 'Shopping list not found',
          statusCode: 404
        }
      });
    }

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

    // Use transaction to handle completion logic atomically
    const result = await prisma.$transaction(async (prisma) => {
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
        throw new Error('ITEM_NOT_FOUND');
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
          throw new Error('DUPLICATE_ITEM');
        }
      }

      // Prepare update data
      const updateData = {};
      if (ingredient_name !== undefined) updateData.ingredient_name = ingredient_name.trim();
      if (quantity !== undefined) updateData.quantity = quantity ? parseFloat(quantity) : null;
      if (unit !== undefined) updateData.unit = unit?.trim() || null;
      if (is_purchased !== undefined) updateData.is_purchased = is_purchased;
      if (notes !== undefined) updateData.notes = notes?.trim() || null;

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

      // Check if all items in the shopping list are now purchased (only if is_purchased was updated)
      let shoppingListUpdated = false;
      let updatedShoppingList = existingItem.shopping_list;

      if (is_purchased !== undefined) {
        const allItems = await prisma.shopping_list_items.findMany({
          where: { shopping_list_id: existingItem.shopping_list_id },
          select: { is_purchased: true }
        });

        const allItemsPurchased = allItems.every(item => item.is_purchased);

        // If all items are purchased, archive the shopping list
        if (allItemsPurchased && existingItem.shopping_list.is_active) {
          updatedShoppingList = await prisma.shopping_lists.update({
            where: { id: existingItem.shopping_list_id },
            data: { is_active: false },
            select: {
              id: true,
              name: true,
              is_active: true,
              created_at: true,
              updated_at: true
            }
          });
          shoppingListUpdated = true;
        }
      }

      return {
        updated_item: updatedItem,
        shopping_list: updatedShoppingList,
        shopping_list_updated: shoppingListUpdated
      };
    });

    const response = {
      message: result.shopping_list_updated 
        ? 'Shopping list item updated and shopping list completed'
        : 'Shopping list item updated successfully',
      item: result.updated_item
    };

    if (result.shopping_list_updated) {
      response.shopping_list = result.shopping_list;
      response.is_completed = true;
    }

    res.status(200).json(response);

  } catch (error) {
    if (error.message === 'ITEM_NOT_FOUND') {
      return res.status(404).json({
        error: {
          message: 'Shopping list item not found',
          statusCode: 404
        }
      });
    }

    if (error.message === 'DUPLICATE_ITEM') {
      return res.status(409).json({
        error: {
          message: 'An item with this name already exists in the shopping list',
          statusCode: 409,
          field: 'ingredient_name'
        }
      });
    }

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

    // Use transaction to ensure atomicity and prevent race conditions
    const result = await prisma.$transaction(async (prisma) => {
      // Check if shopping list exists and belongs to user
      const shoppingList = await prisma.shopping_lists.findFirst({
        where: {
          id,
          user_id: userId
        }
      });

      if (!shoppingList) {
        throw new Error('SHOPPING_LIST_NOT_FOUND');
      }

      // Verify all items belong to this shopping list and exist
      const itemIds = items.map(item => item.id);
      const existingItems = await prisma.shopping_list_items.findMany({
        where: {
          id: { in: itemIds },
          shopping_list_id: id
        }
      });

      if (existingItems.length !== items.length) {
        const foundIds = existingItems.map(item => item.id);
        const missingIds = itemIds.filter(id => !foundIds.includes(id));
        throw new Error(`ITEMS_NOT_FOUND:${missingIds.join(',')}`);
      }

      // Perform bulk update
      const updatedItems = [];
      for (const item of items) {
        const updatedItem = await prisma.shopping_list_items.update({
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
        });
        updatedItems.push(updatedItem);
      }

      // Check if all items in the shopping list are now purchased
      const allItems = await prisma.shopping_list_items.findMany({
        where: { shopping_list_id: id },
        select: { is_purchased: true }
      });

      const allItemsPurchased = allItems.every(item => item.is_purchased);
      let updatedShoppingList = shoppingList;

      // If all items are purchased, archive the shopping list
      if (allItemsPurchased && shoppingList.is_active) {
        updatedShoppingList = await prisma.shopping_lists.update({
          where: { id },
          data: { is_active: false },
          select: {
            id: true,
            name: true,
            is_active: true,
            created_at: true,
            updated_at: true
          }
        });
      }

      return {
        updated_items: updatedItems,
        shopping_list: updatedShoppingList,
        is_completed: allItemsPurchased
      };
    });

    res.status(200).json({
      message: result.is_completed && result.shopping_list.is_active === false
        ? 'Items updated and shopping list completed'
        : 'Items updated successfully',
      items: result.updated_items,
      shopping_list: result.shopping_list,
      is_completed: result.is_completed
    });

  } catch (error) {
    if (error.message === 'SHOPPING_LIST_NOT_FOUND') {
      return res.status(404).json({
        error: {
          message: 'Shopping list not found',
          statusCode: 404
        }
      });
    }

    if (error.message.startsWith('ITEMS_NOT_FOUND:')) {
      const missingIds = error.message.split(':')[1];
      return res.status(400).json({
        error: {
          message: 'Some items do not belong to this shopping list or do not exist',
          statusCode: 400,
          missing_item_ids: missingIds.split(',')
        }
      });
    }

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

/**
 * Purchase items, add to inventory, and complete/archive shopping list
 * POST /api/shopping/lists/:id/purchase-and-complete
 */
export const purchaseAndComplete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { purchased_items } = req.body;
    const userId = req.user.id;

    // Check if shopping list exists and belongs to user
    const shoppingList = await prisma.shopping_lists.findFirst({
      where: {
        id,
        user_id: userId
      },
      include: {
        shopping_list_items: true
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

    // Verify all item IDs belong to this shopping list
    const itemIds = purchased_items.map(item => item.item_id);
    const existingItems = shoppingList.shopping_list_items.filter(item => 
      itemIds.includes(item.id)
    );

    if (existingItems.length !== purchased_items.length) {
      return res.status(400).json({
        error: {
          message: 'Some items do not belong to this shopping list',
          statusCode: 400
        }
      });
    }

    // Use transaction to ensure data consistency
    const result = await executeTransaction(async (prisma) => {
      const inventoryItems = [];
      const updatedShoppingItems = [];

      // Process each purchased item
      for (const purchasedItem of purchased_items) {
        const shoppingItem = existingItems.find(item => item.id === purchasedItem.item_id);
        
        // Mark shopping list item as purchased
        const updatedItem = await prisma.shopping_list_items.update({
          where: { id: purchasedItem.item_id },
          data: { is_purchased: true },
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
        updatedShoppingItems.push(updatedItem);

        // Check if inventory item already exists
        const existingInventoryItem = await prisma.user_inventory.findFirst({
          where: {
            user_id: userId,
            ingredient_name: {
              equals: shoppingItem.ingredient_name,
              mode: 'insensitive'
            }
          }
        });

        if (existingInventoryItem) {
          // Update existing inventory item quantity - ensure numeric addition
          const existingQty = parseFloat(existingInventoryItem.quantity || 0);
          const purchasedQty = parseFloat(purchasedItem.quantity || 0);
          const newQuantity = existingQty + purchasedQty;
          const updatedInventoryItem = await prisma.user_inventory.update({
            where: { id: existingInventoryItem.id },
            data: { quantity: newQuantity },
            select: {
              id: true,
              ingredient_name: true,
              quantity: true,
              unit: true,
              created_at: true,
              updated_at: true
            }
          });
          inventoryItems.push(updatedInventoryItem);
        } else {
          // Create new inventory item
          const newInventoryItem = await prisma.user_inventory.create({
            data: {
              user_id: userId,
              ingredient_name: shoppingItem.ingredient_name,
              quantity: parseFloat(purchasedItem.quantity || 0),
              unit: shoppingItem.unit
            },
            select: {
              id: true,
              ingredient_name: true,
              quantity: true,
              unit: true,
              created_at: true,
              updated_at: true
            }
          });
          inventoryItems.push(newInventoryItem);
        }
      }

      // Check if all items in the shopping list are now purchased
      const allItems = await prisma.shopping_list_items.findMany({
        where: { shopping_list_id: id },
        select: { is_purchased: true }
      });

      const allItemsPurchased = allItems.every(item => item.is_purchased);
      let updatedShoppingList = shoppingList;

      // If all items are purchased, archive the shopping list
      if (allItemsPurchased) {
        updatedShoppingList = await prisma.shopping_lists.update({
          where: { id },
          data: { is_active: false },
          select: {
            id: true,
            name: true,
            is_active: true,
            created_at: true,
            updated_at: true
          }
        });
      }

      return {
        updated_items: updatedShoppingItems,
        inventory_items: inventoryItems,
        shopping_list: updatedShoppingList,
        is_completed: allItemsPurchased
      };
    });

    res.status(200).json({
      message: result.is_completed 
        ? 'Items purchased, added to inventory, and shopping list completed' 
        : 'Items purchased and added to inventory',
      updated_items: result.updated_items,
      inventory_items: result.inventory_items,
      shopping_list: result.shopping_list,
      is_completed: result.is_completed
    });

  } catch (error) {
    next(error);
  }
};