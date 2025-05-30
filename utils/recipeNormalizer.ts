import type { ScrapedRecipeData, Recipe, RecipeIngredient } from '../types';
import { parseIngredients, convertToRecipeIngredients } from './ingredientParser';

/**
 * Converts scraped recipe data to the application's Recipe format
 */
export function normalizeScrapedRecipe(scrapedData: ScrapedRecipeData): Omit<Recipe, 'id' | 'imageUrl'> {
  // Parse ingredients
  const ingredientTexts = scrapedData.ingredients.map(ing => ing.text);
  const parsedIngredients = parseIngredients(ingredientTexts);
  const ingredients: RecipeIngredient[] = convertToRecipeIngredients(parsedIngredients);

  // Normalize instructions
  let instructions = '';
  if (Array.isArray(scrapedData.instructions)) {
    instructions = scrapedData.instructions.join('\n\n');
  } else {
    instructions = scrapedData.instructions;
  }

  // Clean up instructions - remove excessive whitespace and normalize line breaks
  instructions = instructions
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Replace multiple line breaks with double
    .replace(/^\s+|\s+$/g, '') // Trim start and end
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space

  // Determine default servings
  let defaultServings = scrapedData.servings || 4;
  if (defaultServings < 1) defaultServings = 4;
  if (defaultServings > 100) defaultServings = 4; // Sanity check

  // Clean up times - ensure they're in a readable format
  const prepTime = normalizeTimeString(scrapedData.prepTime);
  const cookTime = normalizeTimeString(scrapedData.cookTime);

  // Process tags
  const tags = scrapedData.tags?.filter(tag => tag && tag.trim()) || [];

  // Determine source name - prefer explicit sourceName, fall back to author or hostname
  let sourceName = scrapedData.sourceName;
  if (!sourceName && scrapedData.author) {
    sourceName = scrapedData.author;
  }
  if (!sourceName) {
    try {
      sourceName = new URL(scrapedData.sourceUrl).hostname.replace('www.', '');
    } catch {
      sourceName = undefined;
    }
  }

  return {
    name: scrapedData.name.trim(),
    sourceName,
    sourceUrl: scrapedData.sourceUrl,
    defaultServings,
    ingredients,
    instructions,
    prepTime,
    cookTime,
    tags: tags.length > 0 ? tags : undefined
  };
}

/**
 * Normalizes time strings to a consistent format
 */
function normalizeTimeString(timeStr?: string): string | undefined {
  if (!timeStr) return undefined;

  const cleaned = timeStr.trim().toLowerCase();
  
  // If it's already in a good format, return as is
  if (/^\d+\s*(minutes?|mins?|hours?|hrs?)(\s+\d+\s*(minutes?|mins?))?$/i.test(cleaned)) {
    return timeStr.trim();
  }

  // Try to extract numbers and units
  const timePatterns = [
    /(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:utes?)?)?/i, // "1h 30m" or "1 hour 30 minutes"
    /(\d+)\s*h(?:ours?)?/i, // "2h" or "2 hours"
    /(\d+)\s*m(?:in(?:utes?)?)?/i, // "30m" or "30 minutes"
    /(\d+)\s*minutes?/i,
    /(\d+)\s*mins?/i
  ];

  for (const pattern of timePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      if (pattern.source.includes('h') && match[2]) {
        // Has both hours and minutes
        const hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minutes`;
      } else if (pattern.source.includes('h')) {
        // Hours only
        const hours = parseInt(match[1]);
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      } else {
        // Minutes only
        const minutes = parseInt(match[1]);
        return `${minutes} minutes`;
      }
    }
  }

  // If no pattern matches, return the original string
  return timeStr.trim();
}

/**
 * Validates that the normalized recipe has minimum required data
 */
export function validateNormalizedRecipe(recipe: Omit<Recipe, 'id' | 'imageUrl'>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!recipe.name || recipe.name.trim().length === 0) {
    errors.push('Recipe name is required');
  }

  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    errors.push('At least one ingredient is required');
  } else {
    // Check for valid ingredients
    const validIngredients = recipe.ingredients.filter(ing => 
      ing.ingredientName && ing.ingredientName.trim().length > 0 && ing.quantity > 0
    );
    if (validIngredients.length === 0) {
      errors.push('At least one valid ingredient with name and quantity is required');
    }
  }

  if (!recipe.instructions || recipe.instructions.trim().length === 0) {
    errors.push('Instructions are required');
  }

  if (recipe.defaultServings < 1) {
    errors.push('Default servings must be at least 1');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 