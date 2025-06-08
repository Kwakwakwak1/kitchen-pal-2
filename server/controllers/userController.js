import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';

/**
 * User Management Controller
 * Handles user profile, preferences, and account management
 */

/**
 * Get current user profile
 * GET /api/users/profile
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        is_verified: true,
        created_at: true,
        last_login: true
      }
    });

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      user
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * PUT /api/users/profile
 */
export const updateUserProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, email } = req.body;
    const userId = req.user.id;

    // Check if email is being changed and if it's already taken
    if (email && email !== req.user.email) {
      const existingUser = await prisma.users.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          error: {
            message: 'Email already in use by another account',
            statusCode: 409
          }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) {
      updateData.email = email;
      // If email is changing, set verification to false and generate new token
      updateData.is_verified = false;
      updateData.verification_token = uuidv4();
    }

    // Update user
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        is_verified: true,
        created_at: true,
        last_login: true
      }
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user preferences
 * GET /api/users/preferences
 */
export const getUserPreferences = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let preferences = await prisma.user_preferences.findFirst({
      where: { user_id: userId },
      select: {
        id: true,
        theme: true,
        language: true,
        notifications_enabled: true,
        dietary_restrictions: true,
        created_at: true,
        updated_at: true
      }
    });

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await prisma.user_preferences.create({
        data: {
          user_id: userId,
          theme: 'light',
          language: 'en',
          notifications_enabled: true,
          dietary_restrictions: []
        },
        select: {
          id: true,
          theme: true,
          language: true,
          notifications_enabled: true,
          dietary_restrictions: true,
          created_at: true,
          updated_at: true
        }
      });
    }

    res.status(200).json({
      preferences
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update user preferences
 * PUT /api/users/preferences
 */
export const updateUserPreferences = async (req, res, next) => {
  try {
    const { theme, language, notifications_enabled, dietary_restrictions } = req.body;
    const userId = req.user.id;

    // Prepare update data
    const updateData = {};
    if (theme !== undefined) updateData.theme = theme;
    if (language !== undefined) updateData.language = language;
    if (notifications_enabled !== undefined) updateData.notifications_enabled = notifications_enabled;
    if (dietary_restrictions !== undefined) updateData.dietary_restrictions = dietary_restrictions;

    // Check if preferences exist
    const existingPreferences = await prisma.user_preferences.findFirst({
      where: { user_id: userId }
    });

    let preferences;

    if (existingPreferences) {
      // Update existing preferences
      preferences = await prisma.user_preferences.update({
        where: { id: existingPreferences.id },
        data: updateData,
        select: {
          id: true,
          theme: true,
          language: true,
          notifications_enabled: true,
          dietary_restrictions: true,
          created_at: true,
          updated_at: true
        }
      });
    } else {
      // Create new preferences
      preferences = await prisma.user_preferences.create({
        data: {
          user_id: userId,
          theme: theme || 'light',
          language: language || 'en',
          notifications_enabled: notifications_enabled !== undefined ? notifications_enabled : true,
          dietary_restrictions: dietary_restrictions || []
        },
        select: {
          id: true,
          theme: true,
          language: true,
          notifications_enabled: true,
          dietary_restrictions: true,
          created_at: true,
          updated_at: true
        }
      });
    }

    res.status(200).json({
      message: 'Preferences updated successfully',
      preferences
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Change user password
 * PUT /api/users/password
 */
export const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    // Get user's current password hash
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { password_hash: true }
    });

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          statusCode: 404
        }
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        error: {
          message: 'Current password is incorrect',
          statusCode: 400
        }
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await prisma.users.update({
      where: { id: userId },
      data: { password_hash: newPasswordHash }
    });

    // Invalidate all user sessions except current one
    await prisma.user_sessions.deleteMany({
      where: { user_id: userId }
    });

    res.status(200).json({
      message: 'Password changed successfully. Please log in again.'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete user account
 * DELETE /api/users/account
 */
export const deleteUserAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    // Get user's password hash for verification
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { password_hash: true }
    });

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          statusCode: 404
        }
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(400).json({
        error: {
          message: 'Password is incorrect',
          statusCode: 400
        }
      });
    }

    // Delete user (cascading deletes will handle related data)
    await prisma.users.delete({
      where: { id: userId }
    });

    res.status(200).json({
      message: 'Account deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics
 * GET /api/users/stats
 */
export const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get counts for user's data
    const [
      recipesCount,
      inventoryCount,
      shoppingListsCount,
      activeShoppingListsCount,
      mealPlansCount
    ] = await Promise.all([
      prisma.recipes.count({ where: { user_id: userId } }),
      prisma.user_inventory.count({ where: { user_id: userId } }),
      prisma.shopping_lists.count({ where: { user_id: userId } }),
      prisma.shopping_lists.count({ where: { user_id: userId, is_active: true } }),
      prisma.meal_plans.count({ where: { user_id: userId } })
    ]);

    // Get recent activity
    const recentRecipes = await prisma.recipes.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        created_at: true
      }
    });

    const stats = {
      counts: {
        recipes: recipesCount,
        inventory_items: inventoryCount,
        shopping_lists: shoppingListsCount,
        active_shopping_lists: activeShoppingListsCount,
        meal_plans: mealPlansCount
      },
      recent_activity: {
        recent_recipes: recentRecipes
      }
    };

    res.status(200).json({
      stats
    });

  } catch (error) {
    next(error);
  }
};