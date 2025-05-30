import type { RecipeIngredient } from '../types';
import { normalizeIngredientName } from '../constants';
import { formatQuantityForDisplay, getScalingFactor } from './recipeScaling';

export interface IngredientMention {
  ingredient: RecipeIngredient;
  startIndex: number;
  endIndex: number;
  matchedText: string;
  scaledQuantity: number;
  scaledUnit: string;
}

export interface InstructionSegment {
  text: string;
  isIngredient: boolean;
  ingredientMention?: IngredientMention;
  key: string; // For React rendering
}

export interface ParsedInstructions {
  originalText: string;
  segments: InstructionSegment[];
  ingredientMentions: IngredientMention[];
}

/**
 * Cache for parsed instructions to avoid re-parsing on every render
 */
const instructionParseCache = new Map<string, ParsedInstructions>();

/**
 * Generates a cache key for instruction parsing
 */
function generateCacheKey(instructions: string, ingredients: RecipeIngredient[]): string {
  const ingredientHash = ingredients.map(ing => 
    `${normalizeIngredientName(ing.ingredientName)}-${ing.quantity}-${ing.unit}`
  ).join('|');
  return `${instructions.length}-${ingredientHash}`;
}

/**
 * Creates variations of an ingredient name for better matching
 */
function generateIngredientVariations(ingredientName: string): string[] {
  const normalized = normalizeIngredientName(ingredientName).toLowerCase();
  const variations = new Set<string>();
  
  // Add the normalized name
  variations.add(normalized);
  
  // Add original name
  variations.add(ingredientName.toLowerCase());
  
  // Add plural/singular variations
  if (normalized.endsWith('s') && normalized.length > 3) {
    variations.add(normalized.slice(0, -1)); // Remove 's'
  } else {
    variations.add(normalized + 's'); // Add 's'
  }
  
  // Add variations without common words
  const withoutCommon = normalized
    .replace(/\b(fresh|dried|ground|chopped|sliced|diced|minced|whole|large|medium|small|extra)\b/gi, '')
    .trim();
  if (withoutCommon && withoutCommon !== normalized) {
    variations.add(withoutCommon);
  }
  
  // Handle compound words (e.g., "red onion" -> "onion")
  const words = normalized.split(' ');
  if (words.length > 1) {
    words.forEach(word => {
      if (word.length > 2) {
        variations.add(word);
      }
    });
  }
  
  return Array.from(variations).filter(v => v.length > 2);
}

/**
 * Finds all mentions of ingredients in the instruction text
 */
function findIngredientMentions(
  instructions: string,
  ingredients: RecipeIngredient[],
  currentServings: number,
  defaultServings: number
): IngredientMention[] {
  const mentions: IngredientMention[] = [];
  const scalingFactor = getScalingFactor(currentServings, defaultServings);
  
  // Create a map of normalized names to ingredients for quick lookup
  const ingredientMap = new Map<string, RecipeIngredient>();
  const variationMap = new Map<string, RecipeIngredient>();
  
  ingredients.forEach(ingredient => {
    const normalized = normalizeIngredientName(ingredient.ingredientName);
    ingredientMap.set(normalized, ingredient);
    
    // Generate variations and map them back to the ingredient
    const variations = generateIngredientVariations(ingredient.ingredientName);
    variations.forEach(variation => {
      variationMap.set(variation, ingredient);
    });
  });
  
  // Sort variations by length (longer first) to match more specific terms first
  const allVariations = Array.from(variationMap.keys()).sort((a, b) => b.length - a.length);
  
  // Keep track of already matched positions to avoid overlaps
  const matchedRanges: Array<{ start: number; end: number }> = [];
  
  allVariations.forEach(variation => {
    const ingredient = variationMap.get(variation)!;
    
    // Use word boundary regex for better matching
    const regex = new RegExp(`\\b${escapeRegex(variation)}\\b`, 'gi');
    let match;
    
    while ((match = regex.exec(instructions)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      
      // Check if this range overlaps with existing matches
      const overlaps = matchedRanges.some(range => 
        (start >= range.start && start < range.end) ||
        (end > range.start && end <= range.end) ||
        (start <= range.start && end >= range.end)
      );
      
      if (!overlaps) {
        const scaledQuantity = ingredient.quantity * scalingFactor;
        
        mentions.push({
          ingredient,
          startIndex: start,
          endIndex: end,
          matchedText: match[0],
          scaledQuantity,
          scaledUnit: formatQuantityForDisplay(scaledQuantity, ingredient.unit)
        });
        
        matchedRanges.push({ start, end });
      }
    }
  });
  
  // Sort mentions by position in text
  return mentions.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Converts instruction text with ingredient mentions into segments for rendering
 */
function createInstructionSegments(
  instructions: string,
  mentions: IngredientMention[]
): InstructionSegment[] {
  if (mentions.length === 0) {
    return [{
      text: instructions,
      isIngredient: false,
      key: 'instruction-0'
    }];
  }
  
  const segments: InstructionSegment[] = [];
  let currentIndex = 0;
  let segmentCounter = 0;
  
  mentions.forEach((mention, mentionIndex) => {
    // Add text before this mention
    if (currentIndex < mention.startIndex) {
      const textBefore = instructions.slice(currentIndex, mention.startIndex);
      if (textBefore) {
        segments.push({
          text: textBefore,
          isIngredient: false,
          key: `text-${segmentCounter++}`
        });
      }
    }
    
    // Add the ingredient mention as an interactive segment
    segments.push({
      text: mention.matchedText,
      isIngredient: true,
      ingredientMention: mention,
      key: `ingredient-${mentionIndex}`
    });
    
    currentIndex = mention.endIndex;
  });
  
  // Add remaining text after the last mention
  if (currentIndex < instructions.length) {
    const textAfter = instructions.slice(currentIndex);
    if (textAfter) {
      segments.push({
        text: textAfter,
        isIngredient: false,
        key: `text-${segmentCounter++}`
      });
    }
  }
  
  return segments;
}

/**
 * Main function to parse instructions for ingredients with caching
 */
export function parseInstructionsForIngredients(
  instructions: string,
  ingredients: RecipeIngredient[],
  currentServings: number,
  defaultServings: number
): ParsedInstructions {
  // Check cache first (without serving-specific data since mentions don't change with servings)
  const baseCacheKey = generateCacheKey(instructions, ingredients);
  
  let cachedResult = instructionParseCache.get(baseCacheKey);
  
  if (!cachedResult) {
    // Parse for the first time
    const mentions = findIngredientMentions(instructions, ingredients, defaultServings, defaultServings);
    const segments = createInstructionSegments(instructions, mentions);
    
    cachedResult = {
      originalText: instructions,
      segments,
      ingredientMentions: mentions
    };
    
    instructionParseCache.set(baseCacheKey, cachedResult);
  }
  
  // Update scaled quantities for current servings
  const scalingFactor = getScalingFactor(currentServings, defaultServings);
  const updatedMentions = cachedResult.ingredientMentions.map(mention => ({
    ...mention,
    scaledQuantity: mention.ingredient.quantity * scalingFactor,
    scaledUnit: formatQuantityForDisplay(mention.ingredient.quantity * scalingFactor, mention.ingredient.unit)
  }));
  
  // Update segments with new scaled quantities
  const updatedSegments = cachedResult.segments.map(segment => {
    if (segment.isIngredient && segment.ingredientMention) {
      const updatedMention = updatedMentions.find(m => 
        m.startIndex === segment.ingredientMention!.startIndex
      );
      return {
        ...segment,
        ingredientMention: updatedMention || segment.ingredientMention
      };
    }
    return segment;
  });
  
  return {
    originalText: instructions,
    segments: updatedSegments,
    ingredientMentions: updatedMentions
  };
}

/**
 * Clears the instruction parse cache (useful for testing or memory management)
 */
export function clearInstructionParseCache(): void {
  instructionParseCache.clear();
} 