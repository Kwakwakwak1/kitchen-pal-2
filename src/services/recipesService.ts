import apiService from './apiService';
import { Recipe } from '../../types';

// API interfaces that match backend
interface RecipeAPI {
  id: string;
  title: string;
  description?: string;
  prep_time?: number;
  cook_time?: number;
  servings: number;
  instructions: string;
  tags?: string[];
  source_name?: string;
  source_url?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  recipe_ingredients?: RecipeIngredientAPI[]; // API includes ingredients in the recipe object
}

interface RecipeIngredientAPI {
  id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  notes?: string;
  // Note: API doesn't have is_optional field, so we'll default to false
}

interface CreateRecipeRequest {
  title: string;
  description?: string;
  prep_time?: number;
  cook_time?: number;
  servings: number;
  instructions: string;
  tags?: string[];
  source_name?: string;
  source_url?: string;
  image_url?: string;
  ingredients: Array<{
    ingredient_name: string;
    quantity: number;
    unit: string;
    is_optional?: boolean;
  }>;
}


interface RecipesResponse {
  recipes: RecipeAPI[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface RecipeDetailResponse {
  recipe: RecipeAPI; // recipe_ingredients is included in the recipe object
}

interface CreateRecipeResponse {
  message: string;
  recipe: RecipeAPI; // recipe_ingredients is included in the recipe object
}

// Helper function to parse time strings like "25 minutes" or "1 hour 30 minutes" to integer minutes
const parseTimeToMinutes = (timeStr?: string): number | undefined => {
  if (!timeStr) return undefined;
  
  // Handle empty or whitespace-only strings
  const cleaned = timeStr.trim().toLowerCase();
  if (!cleaned) return undefined;
  
  let totalMinutes = 0;
  
  // Match patterns like "1 hour", "30 minutes", "1 hr 30 min", etc.
  const hourMatch = cleaned.match(/(\d+)\s*(?:hours?|hrs?|h)\b/);
  const minuteMatch = cleaned.match(/(\d+)\s*(?:minutes?|mins?|m)\b/);
  
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1], 10) * 60;
  }
  
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1], 10);
  }
  
  // If no hour/minute patterns found, try to extract just a number and assume it's minutes
  if (!hourMatch && !minuteMatch) {
    const numberMatch = cleaned.match(/(\d+)/);
    if (numberMatch) {
      totalMinutes = parseInt(numberMatch[1], 10);
    }
  }
  
  return totalMinutes > 0 ? totalMinutes : undefined;
};

// Helper function to convert minutes back to readable format
const formatMinutesToTime = (minutes?: number): string | undefined => {
  if (!minutes) return undefined;
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
};

// Transform functions
const transformRecipeFromAPI = (apiRecipe: RecipeAPI, ingredients: RecipeIngredientAPI[] = []): Recipe => ({
  id: apiRecipe.id,
  name: apiRecipe.title,
  sourceName: apiRecipe.source_name,
  sourceUrl: apiRecipe.source_url,
  defaultServings: apiRecipe.servings,
  ingredients: ingredients.map(ing => ({
    ingredientName: ing.ingredient_name,
    quantity: ing.quantity,
    unit: ing.unit as any, // Will need proper Unit enum mapping
    isOptional: false,
  })),
  instructions: apiRecipe.instructions,
  prepTime: formatMinutesToTime(apiRecipe.prep_time),
  cookTime: formatMinutesToTime(apiRecipe.cook_time),
  tags: apiRecipe.tags,
  imageUrl: apiRecipe.image_url,
});

const transformRecipeToAPI = (recipe: Omit<Recipe, 'id'>): CreateRecipeRequest => ({
  title: recipe.name,
  prep_time: parseTimeToMinutes(recipe.prepTime),
  cook_time: parseTimeToMinutes(recipe.cookTime),
  servings: recipe.defaultServings,
  instructions: recipe.instructions,
  tags: recipe.tags,
  source_name: recipe.sourceName,
  source_url: recipe.sourceUrl,
  image_url: recipe.imageUrl,
  ingredients: recipe.ingredients.map(ing => ({
    ingredient_name: ing.ingredientName,
    quantity: ing.quantity,
    unit: ing.unit,
    is_optional: ing.isOptional || false,
  })),
});

class RecipesService {
  async getRecipes(): Promise<Recipe[]> {
    const response = await apiService.get<RecipesResponse>('/recipes');
    const transformed = response.recipes.map(recipe => {
      return transformRecipeFromAPI(recipe, recipe.recipe_ingredients || []);
    });
    return transformed;
  }

  async getRecipeById(id: string): Promise<Recipe> {
    const response = await apiService.get<RecipeDetailResponse>(`/recipes/${id}`);
    const transformed = transformRecipeFromAPI(response.recipe, response.recipe.recipe_ingredients || []);
    return transformed;
  }

  async createRecipe(recipe: Omit<Recipe, 'id' | 'imageUrl'>): Promise<Recipe> {
    const createData = transformRecipeToAPI(recipe);
    const response = await apiService.post<CreateRecipeResponse>('/recipes', createData);
    return transformRecipeFromAPI(response.recipe, response.recipe.recipe_ingredients || []);
  }

  async updateRecipe(recipe: Recipe): Promise<Recipe> {
    const updateData = transformRecipeToAPI(recipe);
    const response = await apiService.put<{ recipe: RecipeAPI; recipe_ingredients: RecipeIngredientAPI[] }>(`/recipes/${recipe.id}`, updateData);
    return transformRecipeFromAPI(response.recipe, response.recipe_ingredients);
  }

  async deleteRecipe(id: string): Promise<void> {
    await apiService.delete(`/recipes/${id}`);
  }
}

export const recipesService = new RecipesService();
export default recipesService;