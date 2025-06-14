# Recipe Inventory Analysis Feature Specification

## Overview

This feature enhances the recipes page by displaying real-time inventory analysis for each recipe. Users can quickly see how many ingredients they have available, what's missing, the completion percentage, and how many servings they can make based on their current inventory—all without navigating to the inventory page.

## Feature Goals

1. **Instant Recipe Readiness Assessment**: Users can see at a glance which recipes they can make with their current inventory
2. **Smart Serving Calculations**: Display maximum possible servings based on available ingredients
3. **Missing Ingredient Identification**: Clear indication of what ingredients are needed to complete recipes
4. **Inventory Percentage Tracking**: Visual representation of ingredient completion percentage
5. **Enhanced User Experience**: Reduce navigation between recipes and inventory pages

## Current State Analysis

### Existing Infrastructure
- ✅ Inventory management with `InventoryItem` type and `InventoryContext`
- ✅ Recipe management with `Recipe` type and ingredient lists
- ✅ Unit conversion system (`convertUnit` function in `constants.tsx`)
- ✅ Shopping list generation logic that already compares inventory to recipe needs
- ✅ Ingredient name normalization (`normalizeIngredientName`)

### Current Recipe Card Display
The existing `RecipeCard` component shows:
- Recipe image
- Recipe name
- Servings count
- Prep/cook time
- Optional ingredient indicator
- Tags
- Edit/delete buttons

## Feature Requirements

### 1. Recipe Inventory Analysis Data Structure

Add new types to `types.ts`:

```typescript
export interface RecipeInventoryAnalysis {
  recipeId: string;
  totalIngredients: number;
  availableIngredients: number;
  missingIngredients: MissingIngredient[];
  completionPercentage: number; // 0-100
  maxPossibleServings: number;
  hasAllIngredients: boolean;
}

export interface MissingIngredient {
  ingredientName: string;
  neededQuantity: number;
  unit: Unit;
  availableQuantity?: number; // If partially available
  availableUnit?: Unit;
}

export interface InventoryMatch {
  ingredient: RecipeIngredient;
  inventoryItem?: InventoryItem;
  availableQuantity: number; // In recipe's unit
  isFullyAvailable: boolean;
  conversionSuccessful: boolean;
}
```

### 2. Core Analysis Logic

Create a new utility function `analyzeRecipeInventory` in `utils/recipeAnalyzer.ts`:

```typescript
import { Recipe, InventoryItem, RecipeInventoryAnalysis, MissingIngredient, InventoryMatch } from '../types';
import { convertUnit } from '../constants';
import { normalizeIngredientName } from '../constants';

export function analyzeRecipeInventory(
  recipe: Recipe,
  inventory: InventoryItem[],
  targetServings: number = recipe.defaultServings
): RecipeInventoryAnalysis {
  // Implementation will:
  // 1. Iterate through recipe ingredients
  // 2. Find matching inventory items by normalized name
  // 3. Convert units and calculate availability
  // 4. Determine max possible servings
  // 5. Calculate completion percentage
  // 6. Identify missing ingredients
}

export function getInventoryMatches(
  recipe: Recipe,
  inventory: InventoryItem[],
  targetServings: number
): InventoryMatch[] {
  // Helper function to get detailed ingredient matching
}

export function calculateMaxServings(
  recipe: Recipe,
  inventory: InventoryItem[]
): number {
  // Calculate maximum possible servings based on most limiting ingredient
}
```

### 3. Enhanced Recipe Card Component

Modify the `RecipeCard` component to include inventory analysis:

#### Visual Design
- **Inventory Status Badge**: Top-right corner showing completion percentage
- **Available Servings Display**: Below the default servings
- **Missing Ingredients Summary**: Expandable section showing what's needed
- **Color-coded Status**: 
  - Green: 100% available (can make full recipe)
  - Yellow: 75-99% available (mostly ready)
  - Orange: 50-74% available (partially ready)
  - Red: <50% available (many ingredients missing)

#### New Props and State
```typescript
interface RecipeCardProps {
  recipe: Recipe;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  showInventoryAnalysis?: boolean; // Optional feature toggle
  inventoryAnalysis?: RecipeInventoryAnalysis;
}
```

### 4. Enhanced Recipes Page

Modify `RecipesPage` to:
1. Calculate inventory analysis for all recipes
2. Add filter/sort options based on inventory status
3. Display summary statistics

#### New Filter Options
- "Can Make Now" (100% ingredients available)
- "Mostly Ready" (75%+ ingredients available)
- "Missing Few Items" (50-74% available)
- "Many Items Needed" (<50% available)

#### Sort Options
- By completion percentage (highest first)
- By possible servings (most first)
- By missing ingredient count (fewest first)

### 5. Recipe Detail Page Enhancements

Add inventory analysis section to `RecipeDetailPage`:

```typescript
// New section in recipe detail
<div className="p-6 border-t border-gray-200">
  <h2 className="text-xl font-semibold text-gray-700 mb-4">Inventory Analysis</h2>
  <InventoryAnalysisDisplay analysis={inventoryAnalysis} recipe={recipe} />
</div>
```

#### InventoryAnalysisDisplay Component
- Progress bar showing completion percentage
- Table of ingredients with availability status
- "What You Need" section for missing items
- Adjustable servings calculator with real-time updates

### 6. Shopping List Integration

Enhance the existing shopping list generation by:
1. Pre-filtering recipes based on inventory analysis
2. Showing inventory completion for each recipe in the generator
3. Suggesting recipes that need only a few items

## Implementation Plan

### Phase 1: Core Analysis Logic (Week 1)
1. Create `utils/recipeAnalyzer.ts` with core functions
2. Add new types to `types.ts`
3. Implement unit tests for analysis functions
4. Add inventory analysis hook: `useRecipeInventoryAnalysis`

### Phase 2: Recipe Card Enhancement (Week 2)
1. Design and implement inventory status badges
2. Add missing ingredients display
3. Implement color-coded status system
4. Add expandable sections for detailed information

### Phase 3: Recipes Page Integration (Week 3)
1. Integrate analysis into `RecipesPage`
2. Add filter and sort options
3. Implement performance optimizations
4. Add summary statistics display

### Phase 4: Recipe Detail Enhancement (Week 4)
1. Create `InventoryAnalysisDisplay` component
2. Add detailed analysis to recipe detail page
3. Implement adjustable servings calculator
4. Add missing ingredients quick-add to shopping list

### Phase 5: Polish and Optimization (Week 5)
1. Performance optimization for large recipe collections
2. Add loading states and error handling
3. Implement caching for analysis results
4. Add user preferences for analysis display

## Technical Considerations

### Performance
- **Memoization**: Cache analysis results to avoid recalculation
- **Lazy Loading**: Only calculate analysis for visible recipe cards
- **Debouncing**: Throttle calculations when inventory changes
- **Background Updates**: Update analysis when inventory is modified

### Edge Cases
1. **Unit Conversion Failures**: Handle cases where units can't be converted
2. **Missing Inventory Items**: Handle ingredients not in inventory
3. **Zero Quantities**: Handle inventory items with zero quantity
4. **Optional Ingredients**: Exclude optional ingredients from core analysis
5. **Recipe Scaling**: Handle non-integer serving calculations

### Data Consistency
- Ensure ingredient name normalization consistency
- Handle inventory updates affecting multiple recipes
- Manage state synchronization between contexts

## User Experience Guidelines

### Visual Hierarchy
1. Most important: Can make now (green status)
2. Secondary: Completion percentage
3. Tertiary: Missing ingredient count
4. Least: Detailed missing ingredients list

### Interaction Patterns
- **Quick Scan**: Users should immediately see which recipes are ready
- **Drill Down**: Click to see detailed ingredient analysis
- **Action-Oriented**: Direct paths to shopping list or inventory management
- **Progressive Disclosure**: Show summary first, details on demand

### Accessibility
- Color-blind friendly status indicators
- Screen reader friendly progress indicators
- Keyboard navigation for all interactive elements
- ARIA labels for status badges and progress bars

## Success Metrics

### User Engagement
- Increased time spent on recipes page
- Higher recipe selection rate
- Reduced bouncing between recipes and inventory pages

### Feature Adoption
- Percentage of users viewing detailed analysis
- Shopping list generation from recipe analysis
- Filter/sort usage patterns

### Efficiency Gains
- Reduced navigation clicks
- Faster recipe selection decisions
- Increased cooking frequency

## Future Enhancements

### Smart Suggestions
- Recommend recipes based on expiring inventory
- Suggest ingredient substitutions
- Seasonal recipe highlighting based on inventory

### Batch Analysis
- "What can I make this week?" view
- Multi-recipe meal planning
- Ingredient utilization optimization

### Integration Features
- Export missing ingredients to external shopping apps
- Calendar integration for meal planning
- Social sharing of "recipes I can make"

### Advanced Analytics
- Track cooking patterns vs inventory
- Predict shopping needs
- Optimize inventory levels based on recipe preferences

## Dependencies

### Required Packages
- No new external dependencies required
- Uses existing React, TypeScript infrastructure

### Internal Dependencies
- Existing inventory context and types
- Recipe context and types
- Unit conversion utilities
- Ingredient normalization functions

## Testing Strategy

### Unit Tests
- Recipe analysis functions
- Unit conversion edge cases
- Ingredient matching logic
- Serving calculation accuracy

### Integration Tests
- Recipe card display with analysis
- Filter and sort functionality
- Shopping list integration
- Real-time inventory updates

### User Acceptance Tests
- Recipe selection workflow
- Detailed analysis viewing
- Filter usage patterns
- Performance with large datasets

## Risk Assessment

### Technical Risks
- **Performance**: Analysis calculation could be expensive for large recipe collections
- **Complexity**: Multiple state dependencies could create synchronization issues
- **Accuracy**: Unit conversion failures could provide incorrect information

### Mitigation Strategies
- Implement comprehensive caching and memoization
- Add extensive unit testing for accuracy
- Provide fallback displays for calculation failures
- Add performance monitoring and optimization

### User Experience Risks
- Information overload on recipe cards
- Complex UI reducing usability
- Feature discovery challenges

### Mitigation Strategies
- Progressive disclosure design pattern
- Clear visual hierarchy
- User preference controls for feature density
- Comprehensive onboarding and tooltips

---

*This specification serves as the foundation for implementing the Recipe Inventory Analysis feature, providing a comprehensive view of ingredient availability and cooking readiness within the Kitchen Pal application.* 