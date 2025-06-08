import prisma from '../config/database.js';
import { executeTransaction } from '../config/database.js';

/**
 * Meal Planning Controller
 * Handles CRUD operations for meal plans and recipe assignments
 */

/**
 * Get all meal plans for the authenticated user
 * GET /api/meals/plans
 */
export const getMealPlans = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      search, 
      start_date,
      end_date,
      sortBy = 'start_date', 
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

    // Filter by date range
    if (start_date) {
      whereClause.start_date = {
        gte: new Date(start_date)
      };
    }

    if (end_date) {
      whereClause.end_date = {
        lte: new Date(end_date)
      };
    }

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get meal plans with recipe counts
    const [mealPlans, totalCount] = await Promise.all([
      prisma.meal_plans.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          start_date: true,
          end_date: true,
          created_at: true,
          updated_at: true,
          _count: {
            select: {
              meal_plan_recipes: true
            }
          }
        }
      }),
      prisma.meal_plans.count({ where: whereClause })
    ]);

    // Transform the data to include recipe counts
    const plansWithCounts = mealPlans.map(plan => ({
      ...plan,
      recipes_count: plan._count.meal_plan_recipes,
      _count: undefined
    }));

    res.status(200).json({
      meal_plans: plansWithCounts,
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
 * Get a specific meal plan by ID with recipes
 * GET /api/meals/plans/:id
 */
export const getMealPlanById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const mealPlan = await prisma.meal_plans.findFirst({
      where: {
        id,
        user_id: userId
      },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true,
        meal_plan_recipes: {
          select: {
            id: true,
            meal_date: true,
            meal_type: true,
            servings: true,
            created_at: true,
            recipe: {
              select: {
                id: true,
                title: true,
                description: true,
                prep_time: true,
                cook_time: true,
                servings: true,
                difficulty_level: true,
                cuisine_type: true,
                image_url: true
              }
            }
          },
          orderBy: [
            { meal_date: 'asc' },
            { meal_type: 'asc' }
          ]
        }
      }
    });

    if (!mealPlan) {
      return res.status(404).json({
        error: {
          message: 'Meal plan not found',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      meal_plan: mealPlan
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Create a new meal plan
 * POST /api/meals/plans
 */
export const createMealPlan = async (req, res, next) => {
  try {
    const { name, start_date, end_date } = req.body;
    const userId = req.user.id;

    // Check if meal plan with same name already exists for this user
    const existingPlan = await prisma.meal_plans.findFirst({
      where: {
        user_id: userId,
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });

    if (existingPlan) {
      return res.status(409).json({
        error: {
          message: 'A meal plan with this name already exists',
          statusCode: 409
        }
      });
    }

    // Validate date range
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return res.status(400).json({
        error: {
          message: 'Start date must be before end date',
          statusCode: 400
        }
      });
    }

    const mealPlan = await prisma.meal_plans.create({
      data: {
        user_id: userId,
        name,
        start_date: startDate,
        end_date: endDate
      },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(201).json({
      message: 'Meal plan created successfully',
      meal_plan: mealPlan
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing meal plan
 * PUT /api/meals/plans/:id
 */
export const updateMealPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, start_date, end_date } = req.body;
    const userId = req.user.id;

    // Check if meal plan exists and belongs to user
    const existingPlan = await prisma.meal_plans.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingPlan) {
      return res.status(404).json({
        error: {
          message: 'Meal plan not found',
          statusCode: 404
        }
      });
    }

    // Check if another plan with the same name exists (if name is being changed)
    if (name && name.toLowerCase() !== existingPlan.name.toLowerCase()) {
      const duplicatePlan = await prisma.meal_plans.findFirst({
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

      if (duplicatePlan) {
        return res.status(409).json({
          error: {
            message: 'A meal plan with this name already exists',
            statusCode: 409
          }
        });
      }
    }

    // Validate date range if dates are being updated
    let startDate, endDate;
    if (start_date || end_date) {
      startDate = start_date ? new Date(start_date) : existingPlan.start_date;
      endDate = end_date ? new Date(end_date) : existingPlan.end_date;

      if (startDate >= endDate) {
        return res.status(400).json({
          error: {
            message: 'Start date must be before end date',
            statusCode: 400
          }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (start_date !== undefined) updateData.start_date = startDate;
    if (end_date !== undefined) updateData.end_date = endDate;

    const updatedPlan = await prisma.meal_plans.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(200).json({
      message: 'Meal plan updated successfully',
      meal_plan: updatedPlan
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete a meal plan
 * DELETE /api/meals/plans/:id
 */
export const deleteMealPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if meal plan exists and belongs to user
    const existingPlan = await prisma.meal_plans.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingPlan) {
      return res.status(404).json({
        error: {
          message: 'Meal plan not found',
          statusCode: 404
        }
      });
    }

    // Delete the meal plan (cascading delete will handle recipes)
    await prisma.meal_plans.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Meal plan deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Add recipe to meal plan
 * POST /api/meals/plans/:id/recipes
 */
export const addRecipeToMealPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { recipe_id, meal_date, meal_type, servings } = req.body;
    const userId = req.user.id;

    // Check if meal plan exists and belongs to user
    const mealPlan = await prisma.meal_plans.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!mealPlan) {
      return res.status(404).json({
        error: {
          message: 'Meal plan not found',
          statusCode: 404
        }
      });
    }

    // Check if recipe exists and belongs to user
    const recipe = await prisma.recipes.findFirst({
      where: {
        id: recipe_id,
        user_id: userId
      }
    });

    if (!recipe) {
      return res.status(404).json({
        error: {
          message: 'Recipe not found',
          statusCode: 404
        }
      });
    }

    // Validate meal date is within plan range
    const mealDate = new Date(meal_date);
    if (mealDate < mealPlan.start_date || mealDate > mealPlan.end_date) {
      return res.status(400).json({
        error: {
          message: 'Meal date must be within the meal plan date range',
          statusCode: 400
        }
      });
    }

    // Check if recipe already exists for this meal time
    const existingMeal = await prisma.meal_plan_recipes.findFirst({
      where: {
        meal_plan_id: id,
        recipe_id,
        meal_date: mealDate,
        meal_type
      }
    });

    if (existingMeal) {
      return res.status(409).json({
        error: {
          message: 'This recipe is already planned for this meal time',
          statusCode: 409
        }
      });
    }

    const mealPlanRecipe = await prisma.meal_plan_recipes.create({
      data: {
        meal_plan_id: id,
        recipe_id,
        meal_date: mealDate,
        meal_type,
        servings: servings || recipe.servings || 1
      },
      select: {
        id: true,
        meal_date: true,
        meal_type: true,
        servings: true,
        created_at: true,
        recipe: {
          select: {
            id: true,
            title: true,
            description: true,
            prep_time: true,
            cook_time: true,
            servings: true,
            difficulty_level: true,
            cuisine_type: true,
            image_url: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Recipe added to meal plan successfully',
      meal_plan_recipe: mealPlanRecipe
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Remove recipe from meal plan
 * DELETE /api/meals/plan-recipes/:id
 */
export const removeRecipeFromMealPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if meal plan recipe exists and belongs to user
    const existingMealPlanRecipe = await prisma.meal_plan_recipes.findFirst({
      where: {
        id,
        meal_plan: {
          user_id: userId
        }
      }
    });

    if (!existingMealPlanRecipe) {
      return res.status(404).json({
        error: {
          message: 'Meal plan recipe not found',
          statusCode: 404
        }
      });
    }

    // Delete the meal plan recipe
    await prisma.meal_plan_recipes.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Recipe removed from meal plan successfully'
    });

  } catch (error) {
    next(error);
  }
};