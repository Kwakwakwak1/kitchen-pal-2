import apiService from './apiService';
import { Recipe } from '../../types';

// API interfaces that match backend
interface RecipeAPI {
  id: string;
  name: string;
  description?: string;
  prep_time?: string;
  cook_time?: string;
  servings: number;
  instructions: string;
  tags?: string[];
  source_name?: string;
  source_url?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

interface RecipeIngredientAPI {
  id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  is_optional: boolean;
}

interface CreateRecipeRequest {
  name: string;
  description?: string;
  prep_time?: string;
  cook_time?: string;
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

interface UpdateRecipeRequest extends Partial<CreateRecipeRequest> {}

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
  recipe: RecipeAPI;
  ingredients: RecipeIngredientAPI[];
}

// Transform functions
const transformRecipeFromAPI = (apiRecipe: RecipeAPI, ingredients: RecipeIngredientAPI[] = []): Recipe => ({
  id: apiRecipe.id,
  name: apiRecipe.name,
  sourceName: apiRecipe.source_name,
  sourceUrl: apiRecipe.source_url,
  defaultServings: apiRecipe.servings,
  ingredients: ingredients.map(ing => ({
    ingredientName: ing.ingredient_name,
    quantity: ing.quantity,
    unit: ing.unit as any, // Will need proper Unit enum mapping
    isOptional: ing.is_optional,
  })),
  instructions: apiRecipe.instructions,
  prepTime: apiRecipe.prep_time,
  cookTime: apiRecipe.cook_time,
  tags: apiRecipe.tags,
  imageUrl: apiRecipe.image_url,
});

const transformRecipeToAPI = (recipe: Omit<Recipe, 'id'>): CreateRecipeRequest => ({
  name: recipe.name,
  prep_time: recipe.prepTime,
  cook_time: recipe.cookTime,
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
    return response.recipes.map(recipe => transformRecipeFromAPI(recipe));
  }

  async getRecipeById(id: string): Promise<Recipe> {
    const response = await apiService.get<RecipeDetailResponse>(`/recipes/${id}`);
    return transformRecipeFromAPI(response.recipe, response.ingredients);
  }

  async createRecipe(recipe: Omit<Recipe, 'id' | 'imageUrl'>): Promise<Recipe> {
    const createData = transformRecipeToAPI(recipe);
    const response = await apiService.post<{ recipe: RecipeAPI; ingredients: RecipeIngredientAPI[] }>('/recipes', createData);
    return transformRecipeFromAPI(response.recipe, response.ingredients);
  }

  async updateRecipe(recipe: Recipe): Promise<Recipe> {
    const updateData = transformRecipeToAPI(recipe);
    const response = await apiService.put<{ recipe: RecipeAPI; ingredients: RecipeIngredientAPI[] }>(`/recipes/${recipe.id}`, updateData);
    return transformRecipeFromAPI(response.recipe, response.ingredients);
  }

  async deleteRecipe(id: string): Promise<void> {
    await apiService.delete(`/recipes/${id}`);
  }
}

export const recipesService = new RecipesService();
export default recipesService;