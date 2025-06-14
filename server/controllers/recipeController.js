import prisma from '../config/database.js';
import { executeTransaction } from '../config/database.js';

/**
 * Recipe Management Controller
 * Handles CRUD operations for recipes and their ingredients
 */

/**
 * Get all recipes for the authenticated user
 * GET /api/recipes
 */
export const getRecipes = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      search, 
      tag,
      cuisine,
      difficulty,
      meal_type,
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
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Filter by cuisine
    if (cuisine) {
      whereClause.cuisine_type = {
        contains: cuisine,
        mode: 'insensitive'
      };
    }

    // Filter by difficulty
    if (difficulty) {
      whereClause.difficulty_level = difficulty;
    }

    // Filter by meal type
    if (meal_type) {
      whereClause.meal_type = {
        contains: meal_type,
        mode: 'insensitive'
      };
    }

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get recipes with ingredient counts
    const [recipes, totalCount] = await Promise.all([
      prisma.recipes.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          instructions: true,
          prep_time: true,
          cook_time: true,
          servings: true,
          difficulty_level: true,
          cuisine_type: true,
          meal_type: true,
          is_public: true,
          image_url: true,
          source_url: true,
          created_at: true,
          updated_at: true,
          recipe_ingredients: {
            select: {
              id: true,
              ingredient_name: true,
              quantity: true,
              unit: true,
              notes: true,
              created_at: true
            },
            orderBy: {
              created_at: 'asc'
            }
          },
          _count: {
            select: {
              recipe_ingredients: true,
              recipe_reviews: true
            }
          }
        }
      }),
      prisma.recipes.count({ where: whereClause })
    ]);

    // Transform the data to include counts and properly formatted ingredients
    const recipesWithCounts = recipes.map(recipe => ({
      ...recipe,
      ingredients_count: recipe._count.recipe_ingredients,
      reviews_count: recipe._count.recipe_reviews,
      recipe_ingredients: recipe.recipe_ingredients.map(ingredient => ({
        ...ingredient,
        quantity: ingredient.quantity ? parseFloat(ingredient.quantity) : null
      })),
      _count: undefined
    }));

    res.status(200).json({
      recipes: recipesWithCounts,
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
 * Get a specific recipe by ID with ingredients
 * GET /api/recipes/:id
 */
export const getRecipeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const recipe = await prisma.recipes.findFirst({
      where: {
        id,
        user_id: userId
      },
      select: {
        id: true,
        title: true,
        description: true,
        instructions: true,
        prep_time: true,
        cook_time: true,
        servings: true,
        difficulty_level: true,
        cuisine_type: true,
        meal_type: true,
        is_public: true,
        image_url: true,
        source_url: true,
        created_at: true,
        updated_at: true,
        recipe_ingredients: {
          select: {
            id: true,
            ingredient_name: true,
            quantity: true,
            unit: true,
            notes: true,
            created_at: true
          },
          orderBy: {
            created_at: 'asc'
          }
        }
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

    // Transform ingredients to have proper number types
    const recipeWithIngredients = {
      ...recipe,
      recipe_ingredients: recipe.recipe_ingredients.map(ingredient => ({
        ...ingredient,
        quantity: ingredient.quantity ? parseFloat(ingredient.quantity) : null
      }))
    };

    res.status(200).json({
      recipe: recipeWithIngredients
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Create a new recipe with ingredients
 * POST /api/recipes
 */
export const createRecipe = async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      instructions, 
      prep_time, 
      cook_time, 
      servings, 
      difficulty_level, 
      cuisine_type, 
      meal_type, 
      is_public, 
      image_url, 
      source_url,
      ingredients 
    } = req.body;
    const userId = req.user.id;

    // Check if recipe with same title already exists for this user
    const existingRecipe = await prisma.recipes.findFirst({
      where: {
        user_id: userId,
        title: {
          equals: title,
          mode: 'insensitive'
        }
      }
    });

    if (existingRecipe) {
      return res.status(409).json({
        error: {
          message: 'A recipe with this title already exists',
          statusCode: 409
        }
      });
    }

    // Create recipe with ingredients in a transaction
    const result = await executeTransaction(async (prisma) => {
      // Create the recipe
      const recipe = await prisma.recipes.create({
        data: {
          user_id: userId,
          title,
          description,
          instructions,
          prep_time,
          cook_time,
          servings,
          difficulty_level,
          cuisine_type,
          meal_type,
          is_public: is_public || false,
          image_url,
          source_url
        },
        select: {
          id: true,
          title: true,
          description: true,
          instructions: true,
          prep_time: true,
          cook_time: true,
          servings: true,
          difficulty_level: true,
          cuisine_type: true,
          meal_type: true,
          is_public: true,
          image_url: true,
          source_url: true,
          created_at: true,
          updated_at: true
        }
      });

      // Add ingredients if provided
      let recipeIngredients = [];
      if (ingredients && ingredients.length > 0) {
        const ingredientData = ingredients.map(ingredient => ({
          recipe_id: recipe.id,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity ? parseFloat(ingredient.quantity) : null,
          unit: ingredient.unit,
          notes: ingredient.notes
        }));

        recipeIngredients = await prisma.recipe_ingredients.createMany({
          data: ingredientData
        });

        // Fetch the created ingredients
        recipeIngredients = await prisma.recipe_ingredients.findMany({
          where: { recipe_id: recipe.id },
          select: {
            id: true,
            ingredient_name: true,
            quantity: true,
            unit: true,
            notes: true,
            created_at: true
          },
          orderBy: { created_at: 'asc' }
        });
      }

      return {
        ...recipe,
        recipe_ingredients: recipeIngredients.map(ingredient => ({
          ...ingredient,
          quantity: ingredient.quantity ? parseFloat(ingredient.quantity) : null
        }))
      };
    });

    res.status(201).json({
      message: 'Recipe created successfully',
      recipe: result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing recipe
 * PUT /api/recipes/:id
 */
export const updateRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      description, 
      instructions, 
      prep_time, 
      cook_time, 
      servings, 
      difficulty_level, 
      cuisine_type, 
      meal_type, 
      is_public, 
      image_url, 
      source_url 
    } = req.body;
    const userId = req.user.id;

    // Check if recipe exists and belongs to user
    const existingRecipe = await prisma.recipes.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingRecipe) {
      return res.status(404).json({
        error: {
          message: 'Recipe not found',
          statusCode: 404
        }
      });
    }

    // Check if another recipe with the same title exists (if title is being changed)
    if (title && title.toLowerCase() !== existingRecipe.title.toLowerCase()) {
      const duplicateRecipe = await prisma.recipes.findFirst({
        where: {
          user_id: userId,
          title: {
            equals: title,
            mode: 'insensitive'
          },
          id: {
            not: id
          }
        }
      });

      if (duplicateRecipe) {
        return res.status(409).json({
          error: {
            message: 'A recipe with this title already exists',
            statusCode: 409
          }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (prep_time !== undefined) updateData.prep_time = prep_time;
    if (cook_time !== undefined) updateData.cook_time = cook_time;
    if (servings !== undefined) updateData.servings = servings;
    if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
    if (cuisine_type !== undefined) updateData.cuisine_type = cuisine_type;
    if (meal_type !== undefined) updateData.meal_type = meal_type;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (source_url !== undefined) updateData.source_url = source_url;

    const updatedRecipe = await prisma.recipes.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        title: true,
        description: true,
        instructions: true,
        prep_time: true,
        cook_time: true,
        servings: true,
        difficulty_level: true,
        cuisine_type: true,
        meal_type: true,
        is_public: true,
        image_url: true,
        source_url: true,
        created_at: true,
        updated_at: true,
        recipe_ingredients: {
          select: {
            id: true,
            ingredient_name: true,
            quantity: true,
            unit: true,
            notes: true,
            created_at: true
          },
          orderBy: {
            created_at: 'asc'
          }
        }
      }
    });

    // Transform ingredients to have proper number types
    const recipeWithIngredients = {
      ...updatedRecipe,
      recipe_ingredients: updatedRecipe.recipe_ingredients.map(ingredient => ({
        ...ingredient,
        quantity: ingredient.quantity ? parseFloat(ingredient.quantity) : null
      }))
    };

    res.status(200).json({
      message: 'Recipe updated successfully',
      recipe: recipeWithIngredients
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete a recipe
 * DELETE /api/recipes/:id
 */
export const deleteRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if recipe exists and belongs to user
    const existingRecipe = await prisma.recipes.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingRecipe) {
      return res.status(404).json({
        error: {
          message: 'Recipe not found',
          statusCode: 404
        }
      });
    }

    // Delete the recipe (cascading delete will handle ingredients and reviews)
    await prisma.recipes.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Recipe deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Add ingredient to recipe
 * POST /api/recipes/:id/ingredients
 */
export const addRecipeIngredient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ingredient_name, quantity, unit, notes } = req.body;
    const userId = req.user.id;

    // Check if recipe exists and belongs to user
    const recipe = await prisma.recipes.findFirst({
      where: {
        id,
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

    // Check if ingredient already exists in this recipe
    const existingIngredient = await prisma.recipe_ingredients.findFirst({
      where: {
        recipe_id: id,
        ingredient_name: {
          equals: ingredient_name,
          mode: 'insensitive'
        }
      }
    });

    if (existingIngredient) {
      return res.status(409).json({
        error: {
          message: 'An ingredient with this name already exists in the recipe',
          statusCode: 409
        }
      });
    }

    const ingredient = await prisma.recipe_ingredients.create({
      data: {
        recipe_id: id,
        ingredient_name,
        quantity: quantity ? parseFloat(quantity) : null,
        unit,
        notes
      },
      select: {
        id: true,
        ingredient_name: true,
        quantity: true,
        unit: true,
        notes: true,
        created_at: true
      }
    });

    res.status(201).json({
      message: 'Ingredient added to recipe successfully',
      ingredient: {
        ...ingredient,
        quantity: ingredient.quantity ? parseFloat(ingredient.quantity) : null
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update recipe ingredient
 * PUT /api/recipes/ingredients/:id
 */
export const updateRecipeIngredient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ingredient_name, quantity, unit, notes } = req.body;
    const userId = req.user.id;

    // Check if ingredient exists and belongs to user's recipe
    const existingIngredient = await prisma.recipe_ingredients.findFirst({
      where: {
        id,
        recipe: {
          user_id: userId
        }
      },
      include: {
        recipe: true
      }
    });

    if (!existingIngredient) {
      return res.status(404).json({
        error: {
          message: 'Recipe ingredient not found',
          statusCode: 404
        }
      });
    }

    // Check if another ingredient with the same name exists (if name is being changed)
    if (ingredient_name && ingredient_name.toLowerCase() !== existingIngredient.ingredient_name.toLowerCase()) {
      const duplicateIngredient = await prisma.recipe_ingredients.findFirst({
        where: {
          recipe_id: existingIngredient.recipe_id,
          ingredient_name: {
            equals: ingredient_name,
            mode: 'insensitive'
          },
          id: {
            not: id
          }
        }
      });

      if (duplicateIngredient) {
        return res.status(409).json({
          error: {
            message: 'An ingredient with this name already exists in the recipe',
            statusCode: 409
          }
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (ingredient_name !== undefined) updateData.ingredient_name = ingredient_name;
    if (quantity !== undefined) updateData.quantity = quantity ? parseFloat(quantity) : null;
    if (unit !== undefined) updateData.unit = unit;
    if (notes !== undefined) updateData.notes = notes;

    const updatedIngredient = await prisma.recipe_ingredients.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        ingredient_name: true,
        quantity: true,
        unit: true,
        notes: true,
        created_at: true
      }
    });

    res.status(200).json({
      message: 'Recipe ingredient updated successfully',
      ingredient: {
        ...updatedIngredient,
        quantity: updatedIngredient.quantity ? parseFloat(updatedIngredient.quantity) : null
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete recipe ingredient
 * DELETE /api/recipes/ingredients/:id
 */
export const deleteRecipeIngredient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if ingredient exists and belongs to user's recipe
    const existingIngredient = await prisma.recipe_ingredients.findFirst({
      where: {
        id,
        recipe: {
          user_id: userId
        }
      }
    });

    if (!existingIngredient) {
      return res.status(404).json({
        error: {
          message: 'Recipe ingredient not found',
          statusCode: 404
        }
      });
    }

    // Delete the ingredient
    await prisma.recipe_ingredients.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Recipe ingredient deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Import recipe from JSON data
 * POST /api/recipes/import
 */
export const importRecipeFromJson = async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      instructions, 
      prep_time, 
      cook_time, 
      servings, 
      difficulty_level, 
      cuisine_type, 
      meal_type, 
      image_url, 
      source_url,
      source_name,
      tags,
      ingredients 
    } = req.body;
    const userId = req.user.id;

    // Check if recipe with same title already exists for this user
    const existingRecipe = await prisma.recipes.findFirst({
      where: {
        user_id: userId,
        title: {
          equals: title,
          mode: 'insensitive'
        }
      }
    });

    if (existingRecipe) {
      return res.status(409).json({
        error: {
          message: 'A recipe with this title already exists',
          statusCode: 409
        }
      });
    }

    // Determine meal type from tags if not provided
    let mealTypeToUse = meal_type;
    if (!mealTypeToUse && tags && tags.length > 0) {
      const mealTypeMap = {
        'breakfast': 'breakfast',
        'lunch': 'lunch', 
        'dinner': 'dinner',
        'dessert': 'dessert',
        'snack': 'snack',
        'appetizer': 'appetizer',
        'main': 'main',
        'side': 'side'
      };
      
      for (const tag of tags) {
        const lowerTag = tag.toLowerCase();
        if (mealTypeMap[lowerTag]) {
          mealTypeToUse = mealTypeMap[lowerTag];
          break;
        }
      }
    }

    // Create recipe with ingredients in a transaction
    const result = await executeTransaction(async (prisma) => {
      // Create the recipe
      const recipe = await prisma.recipes.create({
        data: {
          user_id: userId,
          title,
          description,
          instructions,
          prep_time,
          cook_time,
          servings,
          difficulty_level,
          cuisine_type,
          meal_type: mealTypeToUse,
          is_public: false,
          image_url,
          source_url
        },
        select: {
          id: true,
          title: true,
          description: true,
          instructions: true,
          prep_time: true,
          cook_time: true,
          servings: true,
          difficulty_level: true,
          cuisine_type: true,
          meal_type: true,
          is_public: true,
          image_url: true,
          source_url: true,
          created_at: true,
          updated_at: true
        }
      });

      // Add ingredients
      let recipeIngredients = [];
      if (ingredients && ingredients.length > 0) {
        const ingredientData = ingredients.map(ingredient => ({
          recipe_id: recipe.id,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity ? parseFloat(ingredient.quantity) : null,
          unit: ingredient.unit,
          notes: ingredient.notes
        }));

        await prisma.recipe_ingredients.createMany({
          data: ingredientData
        });

        // Fetch the created ingredients
        recipeIngredients = await prisma.recipe_ingredients.findMany({
          where: { recipe_id: recipe.id },
          select: {
            id: true,
            ingredient_name: true,
            quantity: true,
            unit: true,
            notes: true,
            created_at: true
          },
          orderBy: { created_at: 'asc' }
        });
      }

      return {
        ...recipe,
        recipe_ingredients: recipeIngredients.map(ingredient => ({
          ...ingredient,
          quantity: ingredient.quantity ? parseFloat(ingredient.quantity) : null
        })),
        tags: tags || [],
        source_name: source_name
      };
    });

    res.status(201).json({
      message: 'Recipe imported successfully',
      recipe: result
    });

  } catch (error) {
    next(error);
  }
};