import { RecipeIngredient } from '../../types';

export interface RecipeFormData {
  name: string;
  defaultServings: number;
  ingredients: RecipeIngredient[];
  instructions: string;
  sourceName?: string;
  sourceUrl?: string;
  prepTime?: string;
  cookTime?: string;
  tags?: string[];
}

export const recipeFormSchema = {
  parse: (data: RecipeFormData) => {
    // TODO: Add proper validation using zod or similar
    if (!data.name || !data.instructions) {
      throw new Error('Name and instructions are required');
    }
    return data;
  }
}; 