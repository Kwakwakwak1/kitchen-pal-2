import { Recipe, RecipeIngredient, Unit } from '../../types';

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

// Map common unit strings to our Unit enum
const unitMapping: Record<string, Unit> = {
  'g': Unit.GRAM,
  'gram': Unit.GRAM,
  'grams': Unit.GRAM,
  'kg': Unit.KILOGRAM,
  'kilogram': Unit.KILOGRAM,
  'kilograms': Unit.KILOGRAM,
  'ml': Unit.MILLILITER,
  'milliliter': Unit.MILLILITER,
  'milliliters': Unit.MILLILITER,
  'l': Unit.LITER,
  'liter': Unit.LITER,
  'liters': Unit.LITER,
  'tsp': Unit.TEASPOON,
  'teaspoon': Unit.TEASPOON,
  'teaspoons': Unit.TEASPOON,
  'tbsp': Unit.TABLESPOON,
  'tablespoon': Unit.TABLESPOON,
  'tablespoons': Unit.TABLESPOON,
  'cup': Unit.CUP,
  'cups': Unit.CUP,
  'oz': Unit.OUNCE,
  'ounce': Unit.OUNCE,
  'ounces': Unit.OUNCE,
  'lb': Unit.POUND,
  'pound': Unit.POUND,
  'pounds': Unit.POUND,
  'piece': Unit.PIECE,
  'pieces': Unit.PIECE,
  'pcs': Unit.PIECE,
  'pinch': Unit.PINCH,
  'dash': Unit.DASH,
  '': Unit.NONE,
};

function mapUnit(unitString?: string): Unit {
  if (!unitString) return Unit.PIECE;
  
  const normalized = unitString.toLowerCase().trim();
  return unitMapping[normalized] || Unit.PIECE;
}

function parseTimeString(timeStr?: string): string | undefined {
  if (!timeStr) return undefined;
  
  // If it's already in a readable format, return as-is
  if (typeof timeStr === 'string') {
    return timeStr;
  }
  
  return undefined;
}

export function parseRecipeFromJson(jsonString: string): Omit<Recipe, 'id' | 'imageUrl'> {
  try {
    const data: JsonRecipeData = JSON.parse(jsonString);
    
    // Validate required fields
    if (!data.title) {
      throw new Error('Recipe title is required');
    }
    
    if (!data.instructions) {
      throw new Error('Recipe instructions are required');
    }
    
    if (!data.ingredients || !Array.isArray(data.ingredients) || data.ingredients.length === 0) {
      throw new Error('Recipe must have at least one ingredient');
    }

    // Parse ingredients
    const ingredients: RecipeIngredient[] = data.ingredients.map((ingredient, index) => {
      if (!ingredient.ingredient_name) {
        throw new Error(`Ingredient ${index + 1} is missing a name`);
      }

      return {
        ingredientName: ingredient.ingredient_name,
        quantity: ingredient.quantity || 1,
        unit: mapUnit(ingredient.unit),
        isOptional: false
      };
    });

    // Build the recipe object
    const recipe: Omit<Recipe, 'id' | 'imageUrl'> = {
      name: data.title,
      defaultServings: data.servings || 4,
      ingredients,
      instructions: data.instructions,
      sourceName: data.source_name || '',
      sourceUrl: data.source_url || '',
      prepTime: parseTimeString(data.prep_time),
      cookTime: parseTimeString(data.cook_time),
      tags: data.tags || []
    };

    return recipe;
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format. Please check your JSON syntax.');
    }
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to parse recipe data');
  }
} 