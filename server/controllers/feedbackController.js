import prisma from '../config/database.js';

/**
 * User Feedback Controller
 * Handles CRUD operations for user feedback collection
 */

/**
 * Submit new feedback
 * POST /api/feedback
 */
export const submitFeedback = async (req, res, next) => {
  try {
    const { subject, message, category, priority, feedback_type } = req.body;
    const userId = req.user.id;

    const feedback = await prisma.user_feedback.create({
      data: {
        user_id: userId,
        subject,
        message,
        feedback_type: feedback_type || 'general',
        category: category || 'general',
        priority: priority || 'medium',
        status: 'pending'
      },
      select: {
        id: true,
        subject: true,
        message: true,
        feedback_type: true,
        category: true,
        priority: true,
        status: true,
        created_at: true,
        updated_at: true
      }
    });

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get user's feedback submissions
 * GET /api/feedback
 */
export const getUserFeedback = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { 
      status,
      category,
      sortBy = 'created_at', 
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build where clause
    const whereClause = {
      user_id: userId
    };

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by category
    if (category) {
      whereClause.category = category;
    }

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get feedback with admin responses
    const [feedbackItems, totalCount] = await Promise.all([
      prisma.user_feedback.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          subject: true,
          message: true,
          feedback_type: true,
          category: true,
          priority: true,
          status: true,
          admin_response: true,
          created_at: true,
          updated_at: true,
          admin: {
            select: {
              id: true,
              first_name: true,
              last_name: true
            }
          }
        }
      }),
      prisma.user_feedback.count({ where: whereClause })
    ]);

    res.status(200).json({
      feedback: feedbackItems,
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
 * Get specific feedback by ID (user can only access their own)
 * GET /api/feedback/:id
 */
export const getFeedbackById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const feedback = await prisma.user_feedback.findFirst({
      where: {
        id,
        user_id: userId
      },
      select: {
        id: true,
        subject: true,
        message: true,
        feedback_type: true,
        category: true,
        priority: true,
        status: true,
        admin_response: true,
        created_at: true,
        updated_at: true,
        admin: {
          select: {
            id: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    if (!feedback) {
      return res.status(404).json({
        error: {
          message: 'Feedback not found',
          statusCode: 404
        }
      });
    }

    res.status(200).json({
      feedback
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update feedback status (admin only)
 * PUT /api/feedback/:id/status
 */
export const updateFeedbackStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, admin_response } = req.body;
    const adminUserId = req.user.id;

    // Note: In a real app, you'd check if user has admin role
    // For now, we'll allow any authenticated user to act as admin

    // Check if feedback exists
    const existingFeedback = await prisma.user_feedback.findUnique({
      where: { id }
    });

    if (!existingFeedback) {
      return res.status(404).json({
        error: {
          message: 'Feedback not found',
          statusCode: 404
        }
      });
    }

    // Prepare update data
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (admin_response !== undefined) updateData.admin_response = admin_response;
    
    // Set admin if marking as resolved
    if (status === 'resolved' && existingFeedback.status !== 'resolved') {
      updateData.admin_id = adminUserId;
    }

    const updatedFeedback = await prisma.user_feedback.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        subject: true,
        message: true,
        feedback_type: true,
        category: true,
        priority: true,
        status: true,
        admin_response: true,
        created_at: true,
        updated_at: true,
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        },
        admin: {
          select: {
            id: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    res.status(200).json({
      message: 'Feedback status updated successfully',
      feedback: updatedFeedback
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all feedback (admin only)
 * GET /api/feedback/admin/all
 */
export const getAllFeedback = async (req, res, next) => {
  try {
    // Note: In a real app, you'd check if user has admin role
    const { 
      status,
      category,
      priority,
      search,
      sortBy = 'created_at', 
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build where clause
    const whereClause = {};

    // Filter by status
    if (status) {
      whereClause.status = status;
    }

    // Filter by category
    if (category) {
      whereClause.category = category;
    }

    // Filter by priority
    if (priority) {
      whereClause.priority = priority;
    }

    // Search functionality
    if (search) {
      whereClause.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build order by clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get all feedback with user information
    const [feedbackItems, totalCount] = await Promise.all([
      prisma.user_feedback.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          subject: true,
          message: true,
          feedback_type: true,
          category: true,
          priority: true,
          status: true,
          admin_response: true,
          created_at: true,
          updated_at: true,
          user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true
            }
          },
          admin: {
            select: {
              id: true,
              first_name: true,
              last_name: true
            }
          }
        }
      }),
      prisma.user_feedback.count({ where: whereClause })
    ]);

    // Calculate statistics
    const stats = await prisma.user_feedback.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.status;
      return acc;
    }, {});

    res.status(200).json({
      feedback: feedbackItems,
      statistics: {
        total: totalCount,
        by_status: statusStats
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