import { Recipe } from '../../types';
import { parseRecipeFromJson } from '../utils/recipeJsonParser';
import { recipesService } from './recipesService';

interface JsonRecipeData {
  title: string;
  servings?: number;
  instructions: string;
  ingredients: {
    ingredient_name: string;
    quantity?: number;
    unit?: string;
  }[];
  tags?: string[];
  source_name?: string;
  source_url?: string;
  prep_time?: string;
  cook_time?: string;
  description?: string;
}

class RecipeImportService {
  /**
   * Import a recipe from JSON data via the API
   */
  async importFromJson(jsonString: string): Promise<Recipe> {
    try {
      // Parse the JSON data to our Recipe format
      const recipe = parseRecipeFromJson(jsonString);
      
      // Use the recipes service to import via the API
      return await recipesService.importRecipe(recipe);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to import recipe from JSON');
    }
  }

  /**
   * Import multiple recipes from JSON array
   */
  async importMultipleFromJson(jsonString: string): Promise<Recipe[]> {
    try {
      const data = JSON.parse(jsonString);
      
      if (!Array.isArray(data)) {
        throw new Error('JSON must contain an array of recipes for bulk import');
      }

      const results: Recipe[] = [];
      const errors: string[] = [];

      for (let i = 0; i < data.length; i++) {
        try {
          const recipeJson = JSON.stringify(data[i]);
          const recipe = await this.importFromJson(recipeJson);
          results.push(recipe);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Recipe ${i + 1}: ${errorMsg}`);
        }
      }

      if (errors.length > 0) {
        console.warn('Some recipes failed to import:', errors);
      }

      return results;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format for bulk import');
      }
      throw error;
    }
  }

  /**
   * Validate JSON recipe data without importing
   */
  validateRecipeJson(jsonString: string): { valid: boolean; errors: string[] } {
    try {
      parseRecipeFromJson(jsonString);
      return { valid: true, errors: [] };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
      return { valid: false, errors: [errorMsg] };
    }
  }
}

export const recipeImportService = new RecipeImportService();
export default recipeImportService; 