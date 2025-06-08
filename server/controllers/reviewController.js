import prisma from '../config/database.js';

/**
 * Recipe Reviews Controller
 * Handles CRUD operations for recipe reviews and ratings
 */

/**
 * Get all reviews for a specific recipe
 * GET /api/recipes/:id/reviews
 */
export const getRecipeReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      sortBy = 'created_at', 
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Verify recipe exists
    const recipe = await prisma.recipes.findUnique({
      where: { id },
      select: { id: true, title: true }
    });

    if (!recipe) {
      return res.status(404).json({
        error: {
          message: 'Recipe not found',
          statusCode: 404
        }
      });
    }

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get reviews with user information
    const [reviews, totalCount] = await Promise.all([
      prisma.recipe_reviews.findMany({
        where: { recipe_id: id },
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          rating: true,
          review_text: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true
            }
          }
        }
      }),
      prisma.recipe_reviews.count({ where: { recipe_id: id } })
    ]);

    // Calculate average rating
    const avgRating = await prisma.recipe_reviews.aggregate({
      where: { recipe_id: id },
      _avg: {
        rating: true
      }
    });

    res.status(200).json({
      reviews,
      recipe: {
        id: recipe.id,
        title: recipe.title
      },
      statistics: {
        total_reviews: totalCount,
        average_rating: avgRating._avg.rating ? parseFloat(avgRating._avg.rating.toFixed(2)) : null
      },
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
 * Add a review to a recipe
 * POST /api/recipes/:id/reviews
 */
export const addRecipeReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Check if recipe exists
    const recipe = await prisma.recipes.findUnique({
      where: { id },
      select: { id: true, title: true }
    });

    if (!recipe) {
      return res.status(404).json({
        error: {
          message: 'Recipe not found',
          statusCode: 404
        }
      });
    }

    // Check if user has already reviewed this recipe
    const existingReview = await prisma.recipe_reviews.findFirst({
      where: {
        recipe_id: id,
        user_id: userId
      }
    });

    if (existingReview) {
      return res.status(409).json({
        error: {
          message: 'You have already reviewed this recipe',
          statusCode: 409
        }
      });
    }

    const review = await prisma.recipe_reviews.create({
      data: {
        recipe_id: id,
        user_id: userId,
        rating: parseInt(rating),
        review_text: comment
      },
      select: {
        id: true,
        rating: true,
        review_text: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Review added successfully',
      review
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update a review
 * PUT /api/reviews/:id
 */
export const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    // Check if review exists and belongs to user
    const existingReview = await prisma.recipe_reviews.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingReview) {
      return res.status(404).json({
        error: {
          message: 'Review not found or you do not have permission to update it',
          statusCode: 404
        }
      });
    }

    // Prepare update data
    const updateData = {};
    if (rating !== undefined) updateData.rating = parseInt(rating);
    if (comment !== undefined) updateData.review_text = comment;

    const updatedReview = await prisma.recipe_reviews.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        rating: true,
        review_text: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    res.status(200).json({
      message: 'Review updated successfully',
      review: updatedReview
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Delete a review
 * DELETE /api/reviews/:id
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if review exists and belongs to user
    const existingReview = await prisma.recipe_reviews.findFirst({
      where: {
        id,
        user_id: userId
      }
    });

    if (!existingReview) {
      return res.status(404).json({
        error: {
          message: 'Review not found or you do not have permission to delete it',
          statusCode: 404
        }
      });
    }

    // Delete the review
    await prisma.recipe_reviews.delete({
      where: { id }
    });

    res.status(200).json({
      message: 'Review deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user's own reviews
 * GET /api/reviews/my-reviews
 */
export const getUserReviews = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      sortBy = 'created_at', 
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get user's reviews with recipe information
    const [reviews, totalCount] = await Promise.all([
      prisma.recipe_reviews.findMany({
        where: { user_id: userId },
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          rating: true,
          review_text: true,
          created_at: true,
          updated_at: true,
          recipe: {
            select: {
              id: true,
              title: true,
              description: true,
              image_url: true
            }
          }
        }
      }),
      prisma.recipe_reviews.count({ where: { user_id: userId } })
    ]);

    res.status(200).json({
      reviews,
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