# Kitchen Pal PostgreSQL Database Integration

## Specification ID
KP-013-Backend-PostgreSQL-Database-Integration

## Overview
Implement comprehensive PostgreSQL database integration to replace the current localStorage-based data persistence. This includes creating a full backend API with authentication, CRUD operations for all data types, and proper data validation. The database schema is already prepared and the infrastructure is ready via Docker Compose.

## Related Files
- `database/init.sql` - Database schema (ready)
- `docker-compose.yml` - Database infrastructure (ready)
- `src/providers/AuthProvider.tsx` - Current localStorage auth (to be replaced)
- `App.tsx` - Current localStorage data providers (to be replaced)
- `types.ts` - TypeScript interfaces (may need updates)
- `constants.tsx` - API configuration constants (to be added)
- All data provider components in `App.tsx` (Users, Stores, Shopping Lists, etc.)

## Requirements

### Functional Requirements
1. **User Authentication & Authorization**
   - Secure user registration with email verification
   - Login/logout with JWT token-based authentication
   - Password hashing using bcrypt
   - Session management with refresh tokens
   - Password reset functionality

2. **Data Management APIs**
   - Users and user preferences CRUD operations
   - Stores management (per-user)
   - Shopping lists and items management
   - Inventory items management
   - Recipes and recipe ingredients management
   - Meal plans and meal planning
   - Recipe reviews and ratings
   - User feedback system

3. **Data Migration**
   - Import existing localStorage data to database
   - Graceful fallback handling during migration
   - Data validation and cleanup during import

4. **Security & Validation**
   - Input validation for all endpoints with Zod schemas
   - SQL injection prevention through Prisma ORM
   - Rate limiting for API endpoints
   - CORS configuration
   - Request/response logging with sensitive data scrubbing
   - Static Application Security Testing (SAST) integration

### Technical Requirements
1. **Backend Framework**: Node.js with Express.js
2. **Database ORM**: Prisma for PostgreSQL integration with transaction support
3. **Authentication**: JWT with refresh tokens (using async methods)
4. **Validation**: Zod for request validation schemas
5. **Password Security**: bcrypt for password hashing
6. **Environment Configuration**: dotenv for environment variables
7. **API Documentation**: OpenAPI/Swagger with JSDoc comments
8. **Error Handling**: Centralized error handling middleware
9. **HTTP Logging**: Morgan for request logging with sensitive data filtering
10. **Frontend State Management**: TanStack Query (React Query) for API state management

## Implementation Details

### Changes Required

1. **Backend API Server Setup**
   - Create `server/` directory structure
   - Set up Express.js server with middleware
   - Configure database connection with connection pooling
   - Implement authentication middleware
   - Set up request validation middleware
   - Configure CORS and security headers

2. **Authentication System**
   - `server/auth/authController.js`
     - POST /api/auth/register - User registration
     - POST /api/auth/login - User login
     - POST /api/auth/logout - User logout
     - POST /api/auth/refresh - Refresh JWT token
     - GET /api/auth/me - Get current authenticated user
     - POST /api/auth/forgot-password - Password reset request
     - POST /api/auth/reset-password - Password reset confirmation
     - GET /api/auth/verify-email - Email verification

3. **User Management APIs**
   - `server/users/userController.js`
     - GET /api/users/profile - Get current user profile
     - PUT /api/users/profile - Update user profile
     - PUT /api/users/preferences - Update user preferences
     - DELETE /api/users/account - Delete user account

4. **Stores Management APIs**
   - `server/stores/storeController.js`
     - GET /api/stores - Get user's stores
     - POST /api/stores - Create new store
     - PUT /api/stores/:id - Update store
     - DELETE /api/stores/:id - Delete store

5. **Shopping Lists APIs**
   - `server/shopping/shoppingController.js`
     - GET /api/shopping/lists - Get user's shopping lists (with search/filter support)
     - POST /api/shopping/lists - Create shopping list
     - PUT /api/shopping/lists/:id - Update shopping list
     - DELETE /api/shopping/lists/:id - Delete shopping list
     - GET /api/shopping/lists/:id/items - Get shopping list items
     - POST /api/shopping/lists/:id/items - Add item to shopping list
     - POST /api/shopping/lists/:id/items/bulk-update - Bulk update items (check/uncheck multiple)
     - DELETE /api/shopping/lists/:id/items/clear-checked - Remove all checked items
     - PUT /api/shopping/items/:id - Update shopping list item
     - DELETE /api/shopping/items/:id - Delete shopping list item

6. **Inventory Management APIs**
   - `server/inventory/inventoryController.js`
     - GET /api/inventory - Get user's inventory items (with search, filter, sort support)
       - Query params: ?search=ingredient&location=pantry&sortBy=expiryDate:asc
     - POST /api/inventory - Add inventory item
     - PUT /api/inventory/:id - Update inventory item
     - DELETE /api/inventory/:id - Delete inventory item
     - GET /api/inventory/low-stock - Get low stock items

7. **Recipe Management APIs**
   - `server/recipes/recipeController.js`
     - GET /api/recipes - Get user's recipes (with pagination, search, and filtering)
       - Query params: ?search=chicken&tag=quick&cuisine=italian&sortBy=createdAt:desc&page=1&limit=20
     - POST /api/recipes - Create new recipe (with transaction for ingredients)
     - GET /api/recipes/:id - Get specific recipe
     - PUT /api/recipes/:id - Update recipe
     - DELETE /api/recipes/:id - Delete recipe (cascading delete for ingredients)
     - POST /api/recipes/:id/ingredients - Add recipe ingredient
     - PUT /api/recipes/ingredients/:id - Update recipe ingredient
     - DELETE /api/recipes/ingredients/:id - Delete recipe ingredient

8. **Meal Planning APIs**
   - `server/meals/mealController.js`
     - GET /api/meals/plans - Get user's meal plans
     - POST /api/meals/plans - Create meal plan
     - PUT /api/meals/plans/:id - Update meal plan
     - DELETE /api/meals/plans/:id - Delete meal plan
     - POST /api/meals/plans/:id/recipes - Add recipe to meal plan
     - DELETE /api/meals/plan-recipes/:id - Remove recipe from meal plan

9. **Recipe Reviews APIs**
   - `server/reviews/reviewController.js`
     - GET /api/recipes/:id/reviews - Get recipe reviews
     - POST /api/recipes/:id/reviews - Add recipe review
     - PUT /api/reviews/:id - Update review
     - DELETE /api/reviews/:id - Delete review

10. **User Feedback APIs**
    - `server/feedback/feedbackController.js`
      - POST /api/feedback - Submit feedback
      - GET /api/feedback - Get user's feedback (admin: all feedback)
      - PUT /api/feedback/:id - Update feedback status (admin only)

11. **Frontend API Integration**
    - `src/services/apiService.ts` - Centralized API client
    - Update all provider components to use API calls instead of localStorage
    - Implement proper error handling and loading states
    - Add authentication token management
    - Update form submissions to use API endpoints

12. **Database Connection Setup**
    - `server/config/database.js` - Database connection configuration
    - Connection pooling setup with Prisma
    - Proper cascading delete constraints configuration
    - Database health check endpoint
    - Migration scripts for existing data
    - Transaction handling for complex operations

### New Files

- **Backend Structure:**
  ```
  server/
  ├── app.js                    # Express app setup
  ├── server.js                 # Server entry point
  ├── config/
  │   ├── database.js           # Database configuration
  │   └── auth.js               # JWT configuration
  ├── middleware/
  │   ├── auth.js               # Authentication middleware
  │   ├── validation.js         # Zod request validation
  │   ├── logging.js            # Morgan HTTP logging with data scrubbing
  │   └── errorHandler.js       # Error handling
  ├── routes/
  │   ├── auth.js               # Authentication routes
  │   ├── users.js              # User management routes
  │   ├── stores.js             # Store management routes
  │   ├── shopping.js           # Shopping list routes
  │   ├── inventory.js          # Inventory routes
  │   ├── recipes.js            # Recipe routes
  │   ├── meals.js              # Meal planning routes
  │   ├── reviews.js            # Review routes
  │   └── feedback.js           # Feedback routes
  ├── controllers/              # Business logic controllers
  ├── models/                   # Database models/queries
  ├── utils/                    # Utility functions
  └── tests/                    # API tests
  ```

- **Frontend Services:**
  - `src/services/apiService.ts` - HTTP client with authentication
  - `src/services/authService.ts` - Authentication API calls
  - `src/hooks/useAuth.ts` - Authentication hook
  - `src/hooks/useApi.ts` - Generic API hook with loading/error states

### Dependencies

**Backend Dependencies:**
```json
{
  "express": "^4.18.2",
  "pg": "^8.11.0",
  "prisma": "^5.0.0",
  "@prisma/client": "^5.0.0",
  "bcrypt": "^5.1.0",
  "jsonwebtoken": "^9.0.0",
  "zod": "^3.22.4",
  "cors": "^2.8.5",
  "helmet": "^7.0.0",
  "morgan": "^1.10.0",
  "express-rate-limit": "^6.7.0",
  "dotenv": "^16.3.0",
  "winston": "^3.10.0",
  "swagger-jsdoc": "^6.2.8",
  "swagger-ui-express": "^5.0.0"
}
```

**Frontend Dependencies:**
```json
{
  "axios": "^1.4.0",
  "@tanstack/react-query": "^4.29.0"
}
```

## Testing Requirements

1. **Unit Tests**
   - Authentication middleware tests
   - Controller function tests
   - Zod validation schema tests
   - Database model tests
   - JWT async method tests

2. **Integration Tests**
   - API endpoint tests for each route with JSDoc documentation
   - Database transaction tests (Prisma transactions)
   - Authentication flow tests
   - Error handling tests
   - Bulk operation endpoint tests

3. **End-to-End Tests**
   - Complete user registration and login flow
   - CRUD operations for each data type
   - Search and filtering functionality tests
   - Data migration from localStorage
   - Frontend-backend integration tests

4. **Performance Tests**
   - Database query performance with indexing
   - API response time benchmarks
   - Concurrent user handling
   - Memory leak detection
   - Search and pagination performance

5. **Security Tests**
   - Static Application Security Testing (SAST)
   - Dependency vulnerability scanning (npm audit)
   - Authentication and authorization tests
   - Input validation and sanitization tests

## Documentation Updates

- **API Documentation**: Create OpenAPI/Swagger documentation with JSDoc comments
- **Database Schema Documentation**: Update with relationships, constraints, and cascading deletes
- **Environment Configuration Guide**: Document all required environment variables
- **Migration Guide**: Step-by-step guide for data migration with transaction safety
- **Development Setup**: Updated setup instructions for backend development
- **Deployment Guide**: Update Docker Compose deployment instructions
- **Search and Filtering Guide**: Document query parameter conventions for all endpoints

## Migration/Deployment Notes

1. **Phased Deployment Strategy**
   - Phase 1: Deploy backend API alongside existing frontend
   - Phase 2: Implement data migration tools
   - Phase 3: Update frontend to use API endpoints
   - Phase 4: Remove localStorage dependencies

2. **Data Migration Process**
   - Create migration script to export localStorage data
   - Import script to populate database with user consent
   - Validation script to ensure data integrity
   - Rollback mechanism for failed migrations

3. **Environment Variables Required**
   ```
   NODE_ENV=development
   PORT=3001
   DATABASE_URL=postgresql://user:password@postgres:5432/kitchen_pal
   JWT_SECRET=your_jwt_secret_key
   JWT_REFRESH_SECRET=your_jwt_refresh_secret
   BCRYPT_SALT_ROUNDS=12
   SESSION_SECRET=your_session_secret
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   FRONTEND_URL=https://kitchen-pal.kwakwakwak.com
   ```

4. **Database Initialization**
   - Ensure init.sql runs successfully with cascading delete constraints
   - Verify all tables and indexes are created
   - Test database connectivity from application
   - Configure Prisma schema with proper relations
   - Set up database backup strategy
   - Validate transaction support is working

## Rollback Plan

1. **Immediate Rollback (if backend fails)**
   - Revert to localStorage-only frontend
   - Disable API endpoints
   - Restore previous Docker Compose configuration

2. **Data Rollback (if migration fails)**
   - Export current database state
   - Restore localStorage data from backup
   - Provide manual data export tools for users

3. **Gradual Rollback (if issues discovered)**
   - Feature flag system to toggle between localStorage and API
   - User-by-user migration capability
   - Monitoring and alerting for data consistency issues

## Success Criteria

1. **Functional Success**
   - All current localStorage functionality works via API
   - User authentication is secure and reliable
   - Data persistence across browser sessions and devices
   - No data loss during migration

2. **Performance Success**
   - API response times < 200ms for most operations
   - Database queries optimized with proper indexing
   - Frontend loading states provide good UX
   - Concurrent user support without degradation

3. **Security Success**
   - Passwords properly hashed and secure
   - JWT tokens properly implemented with async methods and expiration
   - API endpoints protected against common vulnerabilities
   - Data validation with Zod prevents malicious input
   - Sensitive data properly scrubbed from logs
   - SAST and dependency scanning integrated

4. **Maintainability Success**
   - Clear separation between frontend and backend (app.js vs server.js pattern)
   - Comprehensive test coverage (>80%) including security tests
   - API documentation complete with JSDoc comments
   - Database schema properly documented with cascading deletes
   - Search and filtering functionality well-documented
   - TanStack Query provides robust frontend state management 