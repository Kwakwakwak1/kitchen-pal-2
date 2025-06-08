import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Admin authentication middleware check
const isAdminUser = (email) => {
  // For now, admin users are defined by email domain or specific emails
  const adminEmails = ['admin@kitchen-pal.local', 'admin@kwakwakwak.com'];
  return adminEmails.includes(email) || email.endsWith('@kitchen-pal.admin');
};

/**
 * Get system dashboard statistics
 */
const getDashboardStats = async (req, res) => {
  try {
    // Check if user is admin
    if (!isAdminUser(req.user.email)) {
      return res.status(403).json({
        error: { message: 'Admin access required' }
      });
    }

    // Get comprehensive system stats
    const [
      userCount,
      recipeCount,
      inventoryCount,
      shoppingListCount,
      storeCount,
      recentUsers,
      systemHealth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.recipe.count(),
      prisma.inventoryItem.count(),
      prisma.shoppingList.count(),
      prisma.store.count(),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true
        }
      }),
      // System health checks
      Promise.resolve({
        database: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      })
    ]);

    res.json({
      stats: {
        users: userCount,
        recipes: recipeCount,
        inventoryItems: inventoryCount,
        shoppingLists: shoppingListCount,
        stores: storeCount
      },
      recentUsers,
      systemHealth
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      error: { message: 'Failed to get dashboard statistics' }
    });
  }
};

/**
 * Get all users with pagination and search
 */
const getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (!isAdminUser(req.user.email)) {
      return res.status(403).json({
        error: { message: 'Admin access required' }
      });
    }

    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              recipes: true,
              inventoryItems: true,
              shoppingLists: true,
              stores: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      error: { message: 'Failed to get users' }
    });
  }
};

/**
 * Get detailed user information
 */
const getUserDetails = async (req, res) => {
  try {
    // Check if user is admin
    if (!isAdminUser(req.user.email)) {
      return res.status(403).json({
        error: { message: 'Admin access required' }
      });
    }

    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        updatedAt: true,
        recipes: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: { select: { ingredients: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        inventoryItems: {
          select: {
            id: true,
            ingredientName: true,
            quantity: true,
            unit: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        shoppingLists: {
          select: {
            id: true,
            name: true,
            isActive: true,
            createdAt: true,
            _count: { select: { items: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        stores: {
          select: {
            id: true,
            name: true,
            location: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            recipes: true,
            inventoryItems: true,
            shoppingLists: true,
            stores: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        error: { message: 'User not found' }
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Error getting user details:', error);
    res.status(500).json({
      error: { message: 'Failed to get user details' }
    });
  }
};

/**
 * Delete user and all associated data
 */
const deleteUser = async (req, res) => {
  try {
    // Check if user is admin
    if (!isAdminUser(req.user.email)) {
      return res.status(403).json({
        error: { message: 'Admin access required' }
      });
    }

    const { userId } = req.params;

    // Prevent admin from deleting themselves
    if (userId === req.user.id) {
      return res.status(400).json({
        error: { message: 'Cannot delete your own admin account' }
      });
    }

    // Use transaction to delete user and all associated data
    await prisma.$transaction(async (tx) => {
      // Delete in correct order due to foreign key constraints
      await tx.shoppingListItem.deleteMany({
        where: {
          shoppingList: { userId }
        }
      });
      
      await tx.shoppingList.deleteMany({
        where: { userId }
      });
      
      await tx.recipeIngredient.deleteMany({
        where: {
          recipe: { userId }
        }
      });
      
      await tx.recipe.deleteMany({
        where: { userId }
      });
      
      await tx.inventoryItem.deleteMany({
        where: { userId }
      });
      
      await tx.store.deleteMany({
        where: { userId }
      });
      
      await tx.user.delete({
        where: { id: userId }
      });
    });

    res.json({
      message: 'User and all associated data deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: { message: 'Failed to delete user' }
    });
  }
};

/**
 * Get system-wide data export
 */
const exportSystemData = async (req, res) => {
  try {
    // Check if user is admin
    if (!isAdminUser(req.user.email)) {
      return res.status(403).json({
        error: { message: 'Admin access required' }
      });
    }

    const { format = 'json', includeUserData = 'false' } = req.query;

    if (includeUserData === 'true') {
      // Full system export including user data
      const [users, recipes, inventoryItems, shoppingLists, stores] = await Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            createdAt: true
          }
        }),
        prisma.recipe.findMany({
          include: {
            ingredients: true,
            user: {
              select: { email: true }
            }
          }
        }),
        prisma.inventoryItem.findMany({
          include: {
            user: {
              select: { email: true }
            }
          }
        }),
        prisma.shoppingList.findMany({
          include: {
            items: true,
            user: {
              select: { email: true }
            }
          }
        }),
        prisma.store.findMany({
          include: {
            user: {
              select: { email: true }
            }
          }
        })
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        users,
        recipes,
        inventoryItems,
        shoppingLists,
        stores
      };

      if (format === 'csv') {
        // Simple CSV export for users
        const csv = [
          'Email,First Name,Last Name,Created At,Recipe Count,Inventory Count,Shopping List Count,Store Count',
          ...users.map(user => [
            user.email,
            user.firstName,
            user.lastName,
            user.createdAt,
            recipes.filter(r => r.userId === user.id).length,
            inventoryItems.filter(i => i.userId === user.id).length,
            shoppingLists.filter(s => s.userId === user.id).length,
            stores.filter(s => s.userId === user.id).length
          ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=kitchen-pal-export.csv');
        return res.send(csv);
      }

      res.json(exportData);
    } else {
      // Stats-only export
      const stats = await getDashboardStats(req, res);
      res.json({
        exportDate: new Date().toISOString(),
        systemStats: stats
      });
    }
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({
      error: { message: 'Failed to export system data' }
    });
  }
};

export {
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  deleteUser,
  exportSystemData
};