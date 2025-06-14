import { z } from 'zod';

/**
 * Validation middleware factory that validates request data using Zod schemas
 * @param {Object} schemas - Object containing validation schemas for body, params, query
 * @returns {Function} Express middleware function
 */
export const validate = (schemas) => {
  return (req, res, next) => {
    try {
      // Validate request body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      // Validate request parameters
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      // Validate query parameters
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.received
        }));

        return res.status(400).json({
          error: {
            message: 'Validation failed',
            statusCode: 400,
            details: {
              validation: validationErrors
            }
          }
        });
      }

      next(error);
    }
  };
};

// Common validation schemas
export const commonSchemas = {
  // UUID parameter validation
  uuidParam: z.object({
    id: z.string().uuid('Invalid UUID format')
  }),

  // Pagination query validation
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  }).refine(data => data.page >= 1, {
    message: "Page must be >= 1",
    path: ["page"]
  }).refine(data => data.limit >= 1 && data.limit <= 100, {
    message: "Limit must be between 1 and 100",
    path: ["limit"]
  }),

  // Search and filter query validation
  searchFilter: z.object({
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  }),

  // Date range validation
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }).refine(data => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: "Start date must be before end date",
    path: ["dateRange"]
  })
};

// User validation schemas
export const userSchemas = {
  register: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    first_name: z.string().min(1, 'First name is required').max(100),
    last_name: z.string().min(1, 'Last name is required').max(100)
  }),

  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  }),

  updateProfile: z.object({
    first_name: z.string().min(1).max(100).optional(),
    last_name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional()
  }),

  updatePreferences: z.object({
    theme: z.enum(['light', 'dark']).optional(),
    language: z.string().max(10).optional(),
    notifications_enabled: z.boolean().optional(),
    dietary_restrictions: z.array(z.string()).optional()
  }),

  resetPassword: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
  }),

  forgotPassword: z.object({
    email: z.string().email('Invalid email format')
  }),

  changePassword: z.object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'New password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'New password must contain at least one uppercase letter, one lowercase letter, and one number')
  }),

  deleteAccount: z.object({
    password: z.string().min(1, 'Password is required')
  })
};

// Recipe validation schemas
export const recipeSchemas = {
  create: z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().optional(),
    instructions: z.string().min(1, 'Instructions are required'),
    prep_time: z.number().int().min(0).optional(),
    cook_time: z.number().int().min(0).optional(),
    servings: z.number().int().min(1).optional(),
    difficulty_level: z.enum(['easy', 'medium', 'hard']).optional(),
    cuisine_type: z.string().max(100).optional(),
    meal_type: z.string().max(50).optional(),
    image_url: z.string().url().optional().or(z.literal('')),
    source_url: z.string().url().optional().or(z.literal('')),
    ingredients: z.array(z.object({
      ingredient_name: z.string().min(1).max(255),
      quantity: z.number().positive().optional(),
      unit: z.string().max(50).optional(),
      notes: z.string().optional()
    })).optional()
  }),

  update: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().optional(),
    instructions: z.string().min(1).optional(),
    prep_time: z.number().int().min(0).optional(),
    cook_time: z.number().int().min(0).optional(),
    servings: z.number().int().min(1).optional(),
    difficulty_level: z.enum(['easy', 'medium', 'hard']).optional(),
    cuisine_type: z.string().max(100).optional(),
    meal_type: z.string().max(50).optional(),
    image_url: z.string().url().optional().or(z.literal('')),
    source_url: z.string().url().optional().or(z.literal(''))
  }),

  searchQuery: z.object({
    search: z.string().optional(),
    tag: z.string().optional(),
    cuisine: z.string().optional(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    meal_type: z.string().optional(),
    sortBy: z.enum(['created_at', 'title', 'prep_time', 'cook_time']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  }),

  createIngredient: z.object({
    ingredient_name: z.string().min(1, 'Ingredient name is required').max(255),
    quantity: z.number().positive().optional(),
    unit: z.string().max(50).optional(),
    notes: z.string().optional()
  }),

  updateIngredient: z.object({
    ingredient_name: z.string().min(1).max(255).optional(),
    quantity: z.number().positive().optional(),
    unit: z.string().max(50).optional(),
    notes: z.string().optional()
  }),

  import: z.object({
    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().optional(),
    instructions: z.string().min(1, 'Instructions are required'),
    prep_time: z.number().int().min(0).optional(),
    cook_time: z.number().int().min(0).optional(),
    servings: z.number().int().min(1).optional(),
    difficulty_level: z.enum(['easy', 'medium', 'hard']).optional(),
    cuisine_type: z.string().max(100).optional(),
    meal_type: z.string().max(50).optional(),
    image_url: z.string().url().optional().or(z.literal('')),
    source_url: z.string().url().optional().or(z.literal('')),
    source_name: z.string().optional(),
    tags: z.array(z.string()).optional(),
    ingredients: z.array(z.object({
      ingredient_name: z.string().min(1).max(255),
      quantity: z.number().positive().optional(),
      unit: z.string().max(50).optional(),
      notes: z.string().optional()
    })).min(1, 'At least one ingredient is required')
  })
};

// Inventory validation schemas
export const inventorySchemas = {
  create: z.object({
    ingredient_name: z.string().min(1, 'Ingredient name is required').max(255),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().max(50).optional(),
    expiry_date: z.string().datetime().optional(),
    location: z.string().max(100).optional(),
    notes: z.string().optional()
  }),

  update: z.object({
    ingredient_name: z.string().min(1).max(255).optional(),
    quantity: z.number().positive().optional(),
    unit: z.string().max(50).optional(),
    expiry_date: z.string().datetime().optional(),
    location: z.string().max(100).optional(),
    notes: z.string().optional()
  }),

  searchQuery: z.object({
    search: z.string().optional(),
    location: z.string().optional(),
    expired: z.string().optional().transform(val => val === 'true'),
    low_stock: z.string().optional().transform(val => val === 'true'),
    sortBy: z.enum(['ingredient_name', 'expiry_date', 'created_at', 'quantity']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  }),

  batchDelete: z.object({
    ids: z.array(z.string().uuid('Invalid inventory item ID format')).min(1, 'At least one item ID must be provided')
  }),

  batchEmpty: z.object({
    ids: z.array(z.string().uuid('Invalid inventory item ID format')).min(1, 'At least one item ID must be provided')
  })
};

// Shopping list validation schemas
export const shoppingSchemas = {
  createList: z.object({
    name: z.string().min(1, 'List name is required').max(255),
    is_active: z.boolean().optional().default(true)
  }),

  updateList: z.object({
    name: z.string().min(1).max(255).optional(),
    is_active: z.boolean().optional()
  }),

  createItem: z.object({
    ingredient_name: z.string().min(1, 'Ingredient name is required').max(255),
    quantity: z.number().positive().optional(),
    unit: z.string().max(50).optional(),
    notes: z.string().optional()
  }),

  updateItem: z.object({
    ingredient_name: z.string().min(1).max(255).optional(),
    quantity: z.number().positive().optional(),
    unit: z.string().max(50).optional(),
    is_purchased: z.boolean().optional(),
    notes: z.string().optional()
  }),

  bulkUpdateItems: z.object({
    items: z.array(z.object({
      id: z.string().uuid(),
      is_purchased: z.boolean()
    }))
  }),

  bulkCreateItems: z.object({
    items: z.array(z.object({
      ingredient_name: z.string().min(1, 'Ingredient name is required').max(255),
      quantity: z.number().positive().optional(),
      unit: z.string().max(50).optional(),
      notes: z.string().optional()
    })).min(1, 'At least one item must be provided')
  }),

  purchaseAndComplete: z.object({
    purchased_items: z.array(z.object({
      item_id: z.string().uuid('Invalid item ID format'),
      quantity: z.number().positive('Quantity must be positive')
    })).min(1, 'At least one item must be provided')
  })
};

// Store validation schemas
export const storeSchemas = {
  create: z.object({
    name: z.string().min(1, 'Store name is required').max(255),
    location: z.string().max(500).optional(),
    website: z.string().url('Invalid website URL').optional().or(z.literal(''))
  }),

  update: z.object({
    name: z.string().min(1).max(255).optional(),
    location: z.string().max(500).optional(),
    website: z.string().url('Invalid website URL').optional().or(z.literal(''))
  }),

  searchQuery: z.object({
    search: z.string().optional(),
    sortBy: z.enum(['name', 'location', 'created_at']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
  })
};

// Meal planning validation schemas
export const mealSchemas = {
  create: z.object({
    name: z.string().min(1, 'Meal plan name is required').max(255),
    start_date: z.string().datetime('Invalid start date format'),
    end_date: z.string().datetime('Invalid end date format')
  }).refine(data => {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    return startDate < endDate;
  }, {
    message: 'Start date must be before end date',
    path: ['start_date']
  }),

  update: z.object({
    name: z.string().min(1).max(255).optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional()
  }),

  searchQuery: z.object({
    search: z.string().optional(),
    start_date: z.string().datetime().optional(),
    end_date: z.string().datetime().optional(),
    sortBy: z.enum(['name', 'start_date', 'end_date', 'created_at']).optional().default('start_date'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  }),

  addRecipe: z.object({
    recipe_id: z.string().uuid('Invalid recipe ID format'),
    meal_date: z.string().datetime('Invalid meal date format'),
    meal_type: z.string().min(1, 'Meal type is required').max(20),
    servings: z.number().int().min(1).optional()
  })
};

// Recipe review validation schemas
export const reviewSchemas = {
  create: z.object({
    rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
    comment: z.string().max(1000, 'Comment must be 1000 characters or less').optional()
  }),

  update: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().max(1000).optional()
  }),

  searchQuery: z.object({
    sortBy: z.enum(['created_at', 'rating']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  })
};

// User feedback validation schemas
export const feedbackSchemas = {
  create: z.object({
    subject: z.string().min(1, 'Subject is required').max(255, 'Subject must be 255 characters or less'),
    message: z.string().min(1, 'Message is required').max(2000, 'Message must be 2000 characters or less'),
    feedback_type: z.string().max(50, 'Feedback type must be 50 characters or less').optional().default('general'),
    category: z.enum(['bug', 'feature_request', 'improvement', 'general', 'complaint']).optional().default('general'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium')
  }),

  updateStatus: z.object({
    status: z.enum(['pending', 'in_review', 'resolved', 'rejected']).optional(),
    admin_response: z.string().max(1000, 'Admin response must be 1000 characters or less').optional()
  }),

  searchQuery: z.object({
    status: z.enum(['pending', 'in_review', 'resolved', 'rejected']).optional(),
    category: z.enum(['bug', 'feature_request', 'improvement', 'general', 'complaint']).optional(),
    sortBy: z.enum(['created_at', 'subject', 'priority', 'status']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  }),

  adminSearchQuery: z.object({
    status: z.enum(['pending', 'in_review', 'resolved', 'rejected']).optional(),
    category: z.enum(['bug', 'feature_request', 'improvement', 'general', 'complaint']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    search: z.string().optional(),
    sortBy: z.enum(['created_at', 'subject', 'priority', 'status']).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  })
};

export default validate;