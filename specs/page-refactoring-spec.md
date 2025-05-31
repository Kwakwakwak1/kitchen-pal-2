# Page Refactoring Specification

## Overview
Refactor the large App.tsx file by extracting page-specific components into separate files organized in a `pages` folder structure.

## Goals
- Improve code maintainability and readability
- Better organization of page-specific logic
- Easier to navigate and modify individual pages
- Maintain all existing functionality

## Folder Structure
```
src/
├── pages/
│   ├── dashboard/
│   │   └── DashboardPage.tsx
│   ├── recipes/
│   │   ├── RecipesPage.tsx
│   │   ├── RecipeDetailPage.tsx
│   │   ├── RecipeForm.tsx
│   │   ├── RecipeCard.tsx
│   │   └── RecipeUrlImport.tsx
│   ├── inventory/
│   │   ├── InventoryPage.tsx
│   │   └── InventoryItemForm.tsx
│   ├── shopping-lists/
│   │   ├── ShoppingListsPage.tsx
│   │   └── ShoppingListGeneratorPage.tsx
│   ├── stores/
│   │   ├── StoresPage.tsx
│   │   └── StoreForm.tsx
│   └── auth/
│       ├── LoginPage.tsx
│       ├── SignupPage.tsx
│       └── ProfilePage.tsx
├── components/
│   ├── shared/
│   │   ├── InventoryStatusBadge.tsx
│   │   ├── InventoryAnalysisCard.tsx
│   │   └── ProtectedRoute.tsx
│   └── ... (existing components)
└── App.tsx (refactored)
```

## Implementation Checklist

### Phase 1: Dashboard ✅ COMPLETED
- [x] Create `src/pages/dashboard/` folder
- [x] Extract `DashboardPage` component to `src/pages/dashboard/DashboardPage.tsx`
- [x] Update imports in DashboardPage (fixed path to `../../../App`)
- [x] Update App.tsx to import from new location
- [x] Test dashboard functionality - All working correctly
- [x] Fixed import path error and verified dev server runs without errors

### Phase 2: Shared Components ⬜ NEXT
- [x] Create `src/components/shared/` folder
- [x] Extract `InventoryStatusBadge` to `src/components/shared/InventoryStatusBadge.tsx`
- [x] Extract `InventoryAnalysisCard` to `src/components/shared/InventoryAnalysisCard.tsx`
- [x] Extract `ProtectedRoute` to `src/components/shared/ProtectedRoute.tsx`
- [x] Update imports across all affected files

### Phase 3: Recipes ⬜
- [x] Create `src/pages/recipes/` folder
- [x] Extract `RecipeUrlImport` to `src/pages/recipes/RecipeUrlImport.tsx`
- [x] Extract `RecipeForm` to `src/pages/recipes/RecipeForm.tsx`
- [x] Extract `RecipeCard` to `src/pages/recipes/RecipeCard.tsx`
- [x] Extract `RecipesPage` to `src/pages/recipes/RecipesPage.tsx`
- [x] Extract `RecipeDetailPage` to `src/pages/recipes/RecipeDetailPage.tsx`
- [x] Update all imports
- [x] Update App.tsx routes
- [x] Test recipes functionality

### Phase 4: Inventory ⬜
- [x] Create `src/pages/inventory/` folder
- [x] Extract `InventoryItemForm` to `src/pages/inventory/InventoryItemForm.tsx`
- [x] Extract `InventoryPage` to `src/pages/inventory/InventoryPage.tsx`
- [x] Update imports
- [x] Update App.tsx routes
- [x] Test inventory functionality

### Phase 5: Shopping Lists ⬜
- [x] Create `src/pages/shopping-lists/` folder
- [x] Extract `ShoppingListsPage` to `src/pages/shopping-lists/ShoppingListsPage.tsx`
- [x] Extract `ShoppingListGeneratorPage` to `src/pages/shopping-lists/ShoppingListGeneratorPage.tsx`
- [x] Update imports
- [x] Update App.tsx routes
- [x] Test shopping lists functionality

### Phase 6: Stores ⬜
- [x] Create `src/pages/stores/` folder
- [x] Extract `StoreForm` to `src/pages/stores/StoreForm.tsx`
- [x] Extract `StoresPage` to `src/pages/stores/StoresPage.tsx`
- [x] Update imports
- [x] Update App.tsx routes
- [x] Test stores functionality

### Phase 7: Auth/Profile ⬜
- [x] Create `src/pages/auth/` folder
- [x] Extract `LoginPage` to `src/pages/auth/LoginPage.tsx`
- [x] Extract `SignupPage` to `src/pages/auth/SignupPage.tsx`
- [x] Extract `ProfilePage` to `src/pages/auth/ProfilePage.tsx`
- [x] Update imports
- [x] Update App.tsx routes
- [x] Test authentication and profile functionality

### Phase 8: Final Cleanup ⬜
- [x] Review App.tsx for any remaining extractable components
- [x] Ensure all imports are correct
- [x] Run comprehensive tests
- [x] Update documentation if needed

## Testing Strategy
- After each phase, run the development server
- Test the specific functionality that was refactored
- Ensure no broken imports or missing dependencies
- Verify that all page navigation works correctly

## Dependencies to Track
- React imports (useState, useEffect, etc.)
- Context hooks (useAuth, useRecipes, etc.)
- Utility functions (generateId, normalizeIngredientName, etc.)
- Type definitions
- Component imports
- Service imports

## Notes
- Maintain all existing functionality
- Keep component interfaces unchanged
- Preserve all TypeScript types
- Ensure proper error handling remains intact
- Maintain accessibility features

## Progress Notes
### Phase 1 Completed ✅
- Successfully extracted DashboardPage component
- Fixed import path from `../../App` to `../../../App` (App.tsx is at root level)
- Verified dashboard functionality works correctly
- Development server running without errors on http://localhost:5174
- Ready to proceed to Phase 2

## Import Path Reference
- From `src/pages/dashboard/` to App.tsx: `../../../App`
- From `src/pages/dashboard/` to components: `../../components`  
- From `src/pages/dashboard/` to constants: `../../constants`
- From `src/pages/dashboard/` to types: `../../types` 