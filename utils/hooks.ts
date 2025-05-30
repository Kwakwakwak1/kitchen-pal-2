import { useMemo } from 'react';
import { Recipe, InventoryItem, RecipeInventoryAnalysis } from '../types';
import { analyzeRecipeInventory } from './recipeAnalyzer';

/**
 * Custom hook to analyze recipe inventory status
 * Memoized to avoid recalculation on every render
 */
export function useRecipeInventoryAnalysis(
  recipe: Recipe,
  inventory: InventoryItem[],
  targetServings?: number
): RecipeInventoryAnalysis {
  return useMemo(() => {
    return analyzeRecipeInventory(recipe, inventory, targetServings);
  }, [recipe, inventory, targetServings]);
}

/**
 * Custom hook to analyze multiple recipes against inventory
 * Returns a map of recipe ID to analysis for efficient lookups
 */
export function useRecipeCollectionAnalysis(
  recipes: Recipe[],
  inventory: InventoryItem[]
): Map<string, RecipeInventoryAnalysis> {
  return useMemo(() => {
    const analysisMap = new Map<string, RecipeInventoryAnalysis>();
    
    recipes.forEach(recipe => {
      const analysis = analyzeRecipeInventory(recipe, inventory);
      analysisMap.set(recipe.id, analysis);
    });
    
    return analysisMap;
  }, [recipes, inventory]);
} 