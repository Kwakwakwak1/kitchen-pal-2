import { Recipe, InventoryItem, RecipeInventoryAnalysis, MissingIngredient, InventoryMatch } from '../types';
import { convertUnit } from '../constants';
import { normalizeIngredientName } from '../constants';

/**
 * Analyzes a recipe against current inventory to determine ingredient availability,
 * completion percentage, and maximum possible servings
 */
export function analyzeRecipeInventory(
  recipe: Recipe,
  inventory: InventoryItem[],
  targetServings: number = recipe.defaultServings
): RecipeInventoryAnalysis {
  // Filter out optional ingredients for core analysis
  const requiredIngredients = recipe.ingredients.filter(ing => !ing.isOptional);
  
  if (requiredIngredients.length === 0) {
    // If no required ingredients, recipe is always makeable
    return {
      recipeId: recipe.id,
      totalIngredients: 0,
      availableIngredients: 0,
      missingIngredients: [],
      completionPercentage: 100,
      maxPossibleServings: Infinity,
      hasAllIngredients: true
    };
  }

  const inventoryMatches = getInventoryMatches(recipe, inventory, targetServings);
  const requiredMatches = inventoryMatches.filter(match => !match.ingredient.isOptional);
  
  const availableIngredients = requiredMatches.filter(match => match.isFullyAvailable).length;
  const completionPercentage = Math.round((availableIngredients / requiredIngredients.length) * 100);
  const hasAllIngredients = availableIngredients === requiredIngredients.length;
  
  // Calculate missing ingredients
  const missingIngredients: MissingIngredient[] = requiredMatches
    .filter(match => !match.isFullyAvailable)
    .map(match => {
      const scaledQuantity = (match.ingredient.quantity / recipe.defaultServings) * targetServings;
      const missing: MissingIngredient = {
        ingredientName: match.ingredient.ingredientName,
        neededQuantity: scaledQuantity,
        unit: match.ingredient.unit
      };
      
      // If partially available, include available quantity
      if (match.inventoryItem && match.availableQuantity > 0) {
        missing.availableQuantity = match.availableQuantity;
        missing.availableUnit = match.ingredient.unit; // Already converted to recipe unit
      }
      
      return missing;
    });

  // Calculate maximum possible servings
  const maxPossibleServings = calculateMaxServings(recipe, inventory);

  return {
    recipeId: recipe.id,
    totalIngredients: requiredIngredients.length,
    availableIngredients,
    missingIngredients,
    completionPercentage,
    maxPossibleServings,
    hasAllIngredients
  };
}

/**
 * Gets detailed inventory matches for each ingredient in a recipe
 */
export function getInventoryMatches(
  recipe: Recipe,
  inventory: InventoryItem[],
  targetServings: number
): InventoryMatch[] {
  return recipe.ingredients.map(ingredient => {
    const normalizedName = normalizeIngredientName(ingredient.ingredientName);
    const inventoryItem = inventory.find(item => 
      normalizeIngredientName(item.ingredientName) === normalizedName
    );

    const scaledQuantity = (ingredient.quantity / recipe.defaultServings) * targetServings;
    
    if (!inventoryItem) {
      return {
        ingredient,
        inventoryItem: undefined,
        availableQuantity: 0,
        isFullyAvailable: false,
        conversionSuccessful: true
      };
    }

    // Try to convert inventory quantity to recipe unit
    const convertedQuantity = convertUnit(
      inventoryItem.quantity,
      inventoryItem.unit,
      ingredient.unit
    );

    if (convertedQuantity === null) {
      // Conversion failed - units are incompatible
      return {
        ingredient,
        inventoryItem,
        availableQuantity: 0,
        isFullyAvailable: false,
        conversionSuccessful: false
      };
    }

    const isFullyAvailable = convertedQuantity >= scaledQuantity;

    return {
      ingredient,
      inventoryItem,
      availableQuantity: convertedQuantity,
      isFullyAvailable,
      conversionSuccessful: true
    };
  });
}

/**
 * Calculates the maximum number of servings that can be made with current inventory
 */
export function calculateMaxServings(
  recipe: Recipe,
  inventory: InventoryItem[]
): number {
  // Filter out optional ingredients for max serving calculation
  const requiredIngredients = recipe.ingredients.filter(ing => !ing.isOptional);
  
  if (requiredIngredients.length === 0) {
    return Infinity; // No required ingredients
  }

  let maxServings = Infinity;

  for (const ingredient of requiredIngredients) {
    const normalizedName = normalizeIngredientName(ingredient.ingredientName);
    const inventoryItem = inventory.find(item => 
      normalizeIngredientName(item.ingredientName) === normalizedName
    );

    if (!inventoryItem) {
      // Missing ingredient means 0 servings possible
      return 0;
    }

    // Convert inventory quantity to recipe unit
    const convertedQuantity = convertUnit(
      inventoryItem.quantity,
      inventoryItem.unit,
      ingredient.unit
    );

    if (convertedQuantity === null) {
      // Can't convert units - assume 0 servings possible
      return 0;
    }

    // Calculate how many servings this ingredient can support
    const servingsFromThisIngredient = Math.floor(
      (convertedQuantity * recipe.defaultServings) / ingredient.quantity
    );

    maxServings = Math.min(maxServings, servingsFromThisIngredient);
  }

  return Math.max(0, maxServings);
}

/**
 * Helper function to get a quick readiness status for a recipe
 */
export function getRecipeReadinessStatus(analysis: RecipeInventoryAnalysis): 'ready' | 'mostly-ready' | 'partially-ready' | 'not-ready' {
  if (analysis.completionPercentage === 100) {
    return 'ready';
  } else if (analysis.completionPercentage >= 75) {
    return 'mostly-ready';
  } else if (analysis.completionPercentage >= 50) {
    return 'partially-ready';
  } else {
    return 'not-ready';
  }
}

/**
 * Helper function to get status color classes for UI components
 */
export function getStatusColorClasses(status: string): { bg: string; text: string; border: string } {
  switch (status) {
    case 'ready':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200'
      };
    case 'mostly-ready':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200'
      };
    case 'partially-ready':
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200'
      };
    case 'not-ready':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200'
      };
    default:
      return {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-200'
      };
  }
} 