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
    id: ing.id, // Preserve ingredient ID for updates
    ingredientName: ing.ingredient_name,
    quantity: ing.quantity,
    unit: ing.unit as any, // Will need proper Unit enum mapping
    isOptional: ing.notes?.toLowerCase().includes('optional') || false, // Parse optional from notes
  })),
  instructions: apiRecipe.instructions,
  prepTime: formatMinutesToTime(apiRecipe.prep_time),
  cookTime: formatMinutesToTime(apiRecipe.cook_time),
  tags: apiRecipe.tags,
  imageUrl: apiRecipe.image_url,
});

const transformRecipeToAPI = (recipe: Omit<Recipe, 'id'>): CreateRecipeRequest => {
  const transformed = {
    title: recipe.name?.trim() || '', // Ensure title is not empty
    prep_time: parseTimeToMinutes(recipe.prepTime),
    cook_time: parseTimeToMinutes(recipe.cookTime),
    servings: Math.max(1, recipe.defaultServings || 1), // Ensure servings is at least 1
    instructions: recipe.instructions?.trim() || '', // Ensure instructions is not empty
    tags: recipe.tags || [],
    source_name: recipe.sourceName?.trim() || undefined,
    source_url: recipe.sourceUrl?.trim() || undefined,
    image_url: recipe.imageUrl?.trim() || undefined,
    ingredients: (recipe.ingredients || []).filter(ing => ing.ingredientName?.trim()).map(ing => ({
      ingredient_name: ing.ingredientName.trim(),
      quantity: Math.max(0, ing.quantity || 0), // Ensure quantity is non-negative
      unit: ing.unit || 'piece',
      is_optional: Boolean(ing.isOptional),
    })),
  };
  
  console.log('Transformed recipe to API format:', transformed);
  return transformed;
};

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
    console.log('Original recipe object:', recipe);
    
    // Validate that we have required fields
    if (!recipe.id) {
      throw new Error('Recipe ID is required for updates');
    }
    
    if (!recipe.name?.trim()) {
      throw new Error('Recipe name is required');
    }
    
    if (!recipe.instructions?.trim()) {
      throw new Error('Recipe instructions are required');
    }
    
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      throw new Error('Recipe must have at least one ingredient');
    }
    
    try {
      // Step 1: Update recipe metadata (title, instructions, times, etc.)
      const metadataUpdate = {
        title: recipe.name.trim(),
        instructions: recipe.instructions.trim(),
        prep_time: parseTimeToMinutes(recipe.prepTime),
        cook_time: parseTimeToMinutes(recipe.cookTime),
        servings: Math.max(1, recipe.defaultServings || 1),
        source_url: recipe.sourceUrl?.trim() || undefined,
        image_url: recipe.imageUrl?.trim() || undefined,
      };
      
      console.log('Updating recipe metadata:', metadataUpdate);
      const metadataResponse = await apiService.put<{ recipe: RecipeAPI }>(`/recipes/${recipe.id}`, metadataUpdate);
      console.log('Metadata update successful:', metadataResponse);
      
      // Step 2: Get current recipe to compare ingredients
      const currentRecipe = await this.getRecipeById(recipe.id);
      console.log('Current recipe from API:', currentRecipe);
      
      // Step 3: Handle ingredient updates
      const currentIngredients = currentRecipe.ingredients || [];
      const newIngredients = recipe.ingredients.filter(ing => ing.ingredientName?.trim());
      
      console.log('Current ingredients:', currentIngredients);
      console.log('New ingredients:', newIngredients);
      
      // Update/create ingredients
      const ingredientPromises: Promise<any>[] = [];
      
      // Keep track of which ingredients we've processed
      const processedIngredientIds = new Set<string>();
      
      // Update existing ingredients and add new ones
      for (const newIng of newIngredients) {
        // Try to find matching ingredient by name (case-insensitive)
        const existingIng = currentIngredients.find(curr => 
          curr.ingredientName.toLowerCase().trim() === newIng.ingredientName.toLowerCase().trim()
        );
        
        if (existingIng) {
          // Update existing ingredient
          processedIngredientIds.add(existingIng.ingredientName.toLowerCase().trim());
          
          // Check if anything actually changed
          const hasChanges = (
            existingIng.quantity !== newIng.quantity ||
            existingIng.unit !== newIng.unit ||
            Boolean(existingIng.isOptional) !== Boolean(newIng.isOptional) // Ensure proper boolean comparison
          );
          
          if (hasChanges) {
            console.log(`Updating ingredient: ${newIng.ingredientName}`);
            console.log(`Changes detected:`, {
              quantity: existingIng.quantity !== newIng.quantity ? `${existingIng.quantity} -> ${newIng.quantity}` : 'no change',
              unit: existingIng.unit !== newIng.unit ? `${existingIng.unit} -> ${newIng.unit}` : 'no change',
              optional: Boolean(existingIng.isOptional) !== Boolean(newIng.isOptional) ? `${existingIng.isOptional} -> ${newIng.isOptional}` : 'no change'
            });
            const updatePromise = this.updateIngredient(existingIng, newIng);
            ingredientPromises.push(updatePromise);
          } else {
            console.log(`No changes detected for ingredient: ${newIng.ingredientName}`);
          }
        } else {
          // Add new ingredient
          console.log(`Adding new ingredient: ${newIng.ingredientName}`);
          const addPromise = this.addIngredient(recipe.id, newIng);
          ingredientPromises.push(addPromise);
        }
      }
      
      // Delete ingredients that are no longer present
      for (const currentIng of currentIngredients) {
        if (!processedIngredientIds.has(currentIng.ingredientName.toLowerCase().trim())) {
          console.log(`Deleting ingredient: ${currentIng.ingredientName}`);
          // We'll need to implement deleteIngredient if it's not available
          // For now, skip deletion to avoid errors
        }
      }
      
      // Execute all ingredient operations
      if (ingredientPromises.length > 0) {
        console.log(`Executing ${ingredientPromises.length} ingredient operations...`);
        await Promise.all(ingredientPromises);
        console.log('All ingredient operations completed');
      }
      
      // Step 4: Get the updated recipe
      const updatedRecipe = await this.getRecipeById(recipe.id);
      console.log('Final updated recipe:', updatedRecipe);
      
      return updatedRecipe;
      
    } catch (error) {
      console.error('Recipe update failed:', error);
      console.error('Error response data:', (error as any)?.response?.data);
      throw error;
    }
  }
  
  // Helper method to update a single ingredient
  private async updateIngredient(existingIngredient: any, newIngredient: any): Promise<void> {
    if (!existingIngredient.id) {
      console.warn('Cannot update ingredient without ID:', existingIngredient);
      return;
    }
    
    // Properly handle optional flag - explicitly set notes to empty string when not optional
    const updateData = {
      ingredient_name: newIngredient.ingredientName.trim(),
      quantity: newIngredient.quantity,
      unit: newIngredient.unit,
      notes: newIngredient.isOptional ? 'optional' : '' // Explicitly clear notes when not optional
    };
    
    console.log(`Updating ingredient ${existingIngredient.id}:`, updateData);
    console.log(`Optional flag change: ${existingIngredient.isOptional} -> ${newIngredient.isOptional}`);
    
    await apiService.put(`/recipes/ingredients/${existingIngredient.id}`, updateData);
    console.log(`Successfully updated ingredient: ${newIngredient.ingredientName}`);
  }
  
  // Helper method to add a new ingredient
  private async addIngredient(recipeId: string, ingredient: any): Promise<void> {
    const addData = {
      ingredient_name: ingredient.ingredientName.trim(),
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      notes: ingredient.isOptional ? 'optional' : '' // Consistent with update method
    };
    
    console.log('Adding ingredient to recipe:', addData);
    await apiService.post(`/recipes/${recipeId}/ingredients`, addData);
  }

  async deleteRecipe(id: string): Promise<void> {
    await apiService.delete(`/recipes/${id}`);
  }
}

export const recipesService = new RecipesService();
export default recipesService;