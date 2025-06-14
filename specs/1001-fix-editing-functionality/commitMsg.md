# Commit Message for 1001-FIX-EDITING

## Title
fix: resolve authentication timing and recipe editing functionality

## Body
- Fix authentication timing issue causing 401 errors on app startup
- Add authentication guards to prevent queries before user login
- Completely rewrite recipe editing to handle API structure correctly
- Separate recipe metadata updates from ingredient updates using proper endpoints
- Preserve ingredient IDs for individual ingredient updates via PUT /recipes/ingredients/:id
- Add support for optional ingredient flags parsed from notes field
- Implement comprehensive error handling with optimistic updates and rollback
- Create toast notification system for immediate user feedback
- Fix TypeScript compilation errors in provider type definitions
- Transform API responses correctly in inventory and stores providers

Critical fixes:
1. Authentication: Eliminates 401 errors requiring page refresh
2. Recipe Editing: Enables editing of ingredients (quantity, unit, optional), instructions, and all metadata
3. API Integration: Properly handles backend's separate endpoints for recipe vs ingredient updates

## Files Modified
- src/providers/RecipesProviderAPI.tsx - Added auth guards
- src/providers/InventoryProviderAPI.tsx - Added auth guards, fixed response transformation
- src/providers/StoresProviderAPI.tsx - Added auth guards, fixed response transformation  
- src/services/recipesService.ts - Complete rewrite of updateRecipe with proper API handling
- types.ts - Added optional ID field to RecipeIngredient interface
- src/providers/ToastProvider.tsx (existing)
- src/components/ui/Toast.tsx (existing)
- src/index.css (existing)
- AppAPI.tsx (existing) 