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

// Fixed to match backend API schema
interface CreateRecipeRequest {
  title: string;
  description?: string;
  instructions: string;
  prep_time?: number;
  cook_time?: number;
  servings: number;
  source_name?: string;
  source_url?: string;
  image_url?: string;
  tags?: string[];
  ingredients?: {
    ingredient_name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }[];
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

interface ImportRecipeRequest {
  title: string;
  description?: string;
  instructions: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  source_name?: string;
  source_url?: string;
  image_url?: string;
  tags?: string[];
  ingredients: {
    ingredient_name: string;
    quantity?: number;
    unit?: string;
    notes?: string;
  }[];
}

// Helper function to parse time strings to minutes
const parseTimeToMinutes = (timeStr?: string): number | undefined => {
  if (!timeStr) return undefined;
  
  const timePattern = /(\d+)\s*(hour|hr|minute|min)s?/gi;
  let totalMinutes = 0;
  let match;
  
  while ((match = timePattern.exec(timeStr)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      totalMinutes += value * 60;
    } else if (unit.startsWith('minute') || unit.startsWith('min')) {
      totalMinutes += value;
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

// Fixed to match backend API schema for creating recipes
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
    // Note: Backend doesn't support is_optional yet
  })),
});

// Transformation for updates - only includes fields supported by backend
const transformRecipeToUpdateAPI = (recipe: Recipe) => ({
  title: recipe.name,
  description: undefined, // Recipe interface doesn't have description field, but backend supports it
  prep_time: parseTimeToMinutes(recipe.prepTime),
  cook_time: parseTimeToMinutes(recipe.cookTime),
  servings: recipe.defaultServings,
  instructions: recipe.instructions,
  source_url: recipe.sourceUrl,
  image_url: recipe.imageUrl,
  // Note: source_name, tags, and ingredients are not supported in updates
  // Ingredients should be updated separately via ingredient endpoints
});

// Transform Recipe to Import API format
const transformRecipeToImportAPI = (recipe: Omit<Recipe, 'id' | 'imageUrl'>): ImportRecipeRequest => ({
  title: recipe.name,
  instructions: recipe.instructions,
  prep_time: parseTimeToMinutes(recipe.prepTime),
  cook_time: parseTimeToMinutes(recipe.cookTime),
  servings: recipe.defaultServings,
  source_name: recipe.sourceName,
  source_url: recipe.sourceUrl,
  tags: recipe.tags,
  ingredients: recipe.ingredients.map(ing => ({
    ingredient_name: ing.ingredientName,
    quantity: ing.quantity,
    unit: ing.unit,
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
    const updateData = transformRecipeToUpdateAPI(recipe);
    const response = await apiService.put<{ recipe: RecipeAPI; }>(`/recipes/${recipe.id}`, updateData);
    return transformRecipeFromAPI(response.recipe, response.recipe.recipe_ingredients || []);
  }

  async deleteRecipe(id: string): Promise<void> {
    await apiService.delete(`/recipes/${id}`);
  }

  async importRecipe(recipe: Omit<Recipe, 'id' | 'imageUrl'>): Promise<Recipe> {
    const importData = transformRecipeToImportAPI(recipe);
    const response = await apiService.post<CreateRecipeResponse>('/recipes/import', importData);
    return transformRecipeFromAPI(response.recipe, response.recipe.recipe_ingredients || []);
  }
}

export const recipesService = new RecipesService();
export default recipesService;