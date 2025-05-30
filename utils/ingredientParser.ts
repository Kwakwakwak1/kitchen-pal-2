import { Unit, ParsedIngredient } from '../types';

// Fraction mappings
const FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅓': 1/3,
  '⅔': 2/3,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
  '1/2': 0.5,
  '1/4': 0.25,
  '3/4': 0.75,
  '1/3': 1/3,
  '2/3': 2/3,
  '1/8': 0.125,
  '3/8': 0.375,
  '5/8': 0.625,
  '7/8': 0.875
};

// Unit mappings to normalize different unit variations
const UNIT_MAPPINGS: Record<string, Unit> = {
  // Weight
  'g': Unit.GRAM,
  'gram': Unit.GRAM,
  'grams': Unit.GRAM,
  'kg': Unit.KILOGRAM,
  'kilogram': Unit.KILOGRAM,
  'kilograms': Unit.KILOGRAM,
  'oz': Unit.OUNCE,
  'ounce': Unit.OUNCE,
  'ounces': Unit.OUNCE,
  'lb': Unit.POUND,
  'lbs': Unit.POUND,
  'pound': Unit.POUND,
  'pounds': Unit.POUND,
  
  // Volume
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
  
  // Count
  'piece': Unit.PIECE,
  'pieces': Unit.PIECE,
  'pc': Unit.PIECE,
  'pcs': Unit.PIECE,
  'item': Unit.PIECE,
  'items': Unit.PIECE,
  'whole': Unit.PIECE,
  
  // Pinches
  'pinch': Unit.PINCH,
  'pinches': Unit.PINCH,
  'dash': Unit.DASH,
  'dashes': Unit.DASH,
};

// Words that indicate optional ingredients
const OPTIONAL_INDICATORS = [
  'optional',
  'to taste',
  'if desired',
  'as needed',
  'for serving',
  'for garnish',
  'garnish'
];

/**
 * Extracts quantity from ingredient text, handling fractions and ranges
 */
function extractQuantity(text: string): { quantity: number; remainingText: string } {
  // Remove leading/trailing whitespace
  text = text.trim();
  
  // Look for number patterns at the beginning
  const patterns = [
    // Handle mixed numbers like "1 1/2" or "2½"
    /^(\d+)\s*([½¼¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+)/,
    // Handle simple fractions like "1/2"
    /^([½¼¾⅓⅔⅛⅜⅝⅞]|\d+\/\d+)/,
    // Handle decimal numbers like "1.5"
    /^(\d+\.?\d*)/,
    // Handle ranges like "2-3" or "1 to 2"
    /^(\d+)\s*[-–—to]\s*(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let quantity = 0;
      let matchedText = match[0];
      
      if (match[1] && match[2]) {
        // Mixed number (e.g., "1 1/2")
        const whole = parseInt(match[1]);
        const fraction = FRACTIONS[match[2]] || 0;
        quantity = whole + fraction;
      } else if (match[2] && !match[1]) {
        // Range (e.g., "2-3") - use average
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        quantity = (min + max) / 2;
      } else if (FRACTIONS[match[1]]) {
        // Simple fraction
        quantity = FRACTIONS[match[1]];
      } else {
        // Regular number
        quantity = parseFloat(match[1]);
      }
      
      const remainingText = text.substring(matchedText.length).trim();
      return { quantity, remainingText };
    }
  }
  
  // If no quantity found, default to 1
  return { quantity: 1, remainingText: text };
}

/**
 * Extracts unit from ingredient text
 */
function extractUnit(text: string): { unit: Unit; remainingText: string } {
  // Check each possible unit
  for (const [unitText, unit] of Object.entries(UNIT_MAPPINGS)) {
    const regex = new RegExp(`^${unitText}\\b`, 'i');
    if (regex.test(text)) {
      const remainingText = text.replace(regex, '').trim();
      return { unit, remainingText };
    }
  }
  
  // Default to piece if no unit found
  return { unit: Unit.PIECE, remainingText: text };
}

/**
 * Checks if ingredient text indicates it's optional
 */
function isOptionalIngredient(text: string): boolean {
  const lowerText = text.toLowerCase();
  return OPTIONAL_INDICATORS.some(indicator => lowerText.includes(indicator));
}

/**
 * Extracts preparation notes from ingredient text
 */
function extractNotes(text: string): { name: string; notes?: string } {
  // Common preparation indicators
  const prepPatterns = [
    /,\s*(chopped|diced|sliced|minced|grated|shredded|crushed|ground|fresh|dried|cooked|raw)/i,
    /\((.*?)\)/g, // Text in parentheses
  ];
  
  let notes: string[] = [];
  let cleanName = text;
  
  for (const pattern of prepPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      notes.push(...matches.map(m => m.replace(/[,()]/g, '').trim()));
      cleanName = cleanName.replace(pattern, '').trim();
    }
  }
  
  // Clean up extra commas and spaces
  cleanName = cleanName.replace(/,\s*$/, '').trim();
  
  return {
    name: cleanName,
    notes: notes.length > 0 ? notes.join(', ') : undefined
  };
}

/**
 * Main function to parse an ingredient text into structured components
 */
export function parseIngredient(text: string): ParsedIngredient {
  const originalText = text.trim();
  
  // Extract quantity
  const { quantity, remainingText: afterQuantity } = extractQuantity(originalText);
  
  // Extract unit
  const { unit, remainingText: afterUnit } = extractUnit(afterQuantity);
  
  // Check if optional
  const isOptional = isOptionalIngredient(afterUnit);
  
  // Extract ingredient name and notes
  const { name, notes } = extractNotes(afterUnit);
  
  return {
    originalText,
    quantity,
    unit,
    ingredientName: name,
    isOptional,
    notes
  };
}

/**
 * Parse multiple ingredient texts
 */
export function parseIngredients(ingredientTexts: string[]): ParsedIngredient[] {
  return ingredientTexts.map(parseIngredient);
}

/**
 * Convert parsed ingredients to RecipeIngredient format
 */
export function convertToRecipeIngredients(parsedIngredients: ParsedIngredient[]) {
  return parsedIngredients.map(ing => ({
    ingredientName: ing.ingredientName,
    quantity: ing.quantity,
    unit: ing.unit,
    isOptional: ing.isOptional
  }));
}

// NEW: Common ingredient parsing issues and fixes

/**
 * Detects common parsing issues in ingredient names
 */
export interface IngredientIssue {
  type: 'leading_period' | 'unit_prefix' | 'multiple_spaces';
  description: string;
  suggestedFix: {
    ingredientName: string;
    unit?: Unit;
  };
}

/**
 * Detects common parsing issues in an ingredient
 */
export function detectIngredientIssues(ingredient: { ingredientName: string; unit: Unit }): IngredientIssue[] {
  const issues: IngredientIssue[] = [];
  const name = ingredient.ingredientName.trim();

  // Check for leading period/space pattern
  if (name.startsWith('. ')) {
    issues.push({
      type: 'leading_period',
      description: 'Ingredient name has leading period and space',
      suggestedFix: {
        ingredientName: name.replace(/^\. /, '').trim()
      }
    });
  }

  // Check for unit abbreviations at the start that should be parsed as units
  const unitPrefixPatterns: Array<{ pattern: RegExp; unit: Unit; description: string }> = [
    { pattern: /^c\. /i, unit: Unit.CUP, description: 'C. should be parsed as cup' },
    { pattern: /^tbsp\. /i, unit: Unit.TABLESPOON, description: 'tbsp. should be parsed as tablespoon' },
    { pattern: /^tsp\. /i, unit: Unit.TEASPOON, description: 'tsp. should be parsed as teaspoon' },
    { pattern: /^lb\. /i, unit: Unit.POUND, description: 'lb. should be parsed as pound' },
    { pattern: /^oz\. /i, unit: Unit.OUNCE, description: 'oz. should be parsed as ounce' },
    { pattern: /^g\. /i, unit: Unit.GRAM, description: 'g. should be parsed as gram' },
    { pattern: /^kg\. /i, unit: Unit.KILOGRAM, description: 'kg. should be parsed as kilogram' },
    { pattern: /^ml\. /i, unit: Unit.MILLILITER, description: 'ml. should be parsed as milliliter' },
    { pattern: /^l\. /i, unit: Unit.LITER, description: 'l. should be parsed as liter' }
  ];

  for (const { pattern, unit, description } of unitPrefixPatterns) {
    if (pattern.test(name)) {
      issues.push({
        type: 'unit_prefix',
        description,
        suggestedFix: {
          ingredientName: name.replace(pattern, '').trim(),
          unit
        }
      });
      break; // Only one unit prefix issue per ingredient
    }
  }

  // Check for multiple consecutive spaces
  if (/\s{2,}/.test(name)) {
    issues.push({
      type: 'multiple_spaces',
      description: 'Ingredient name has multiple consecutive spaces',
      suggestedFix: {
        ingredientName: name.replace(/\s+/g, ' ').trim()
      }
    });
  }

  return issues;
}

/**
 * Auto-fixes an ingredient based on detected issues
 */
export function autoFixIngredient(
  ingredient: { ingredientName: string; quantity: number; unit: Unit; isOptional?: boolean },
  issue: IngredientIssue
): { ingredientName: string; quantity: number; unit: Unit; isOptional?: boolean } {
  return {
    ...ingredient,
    ingredientName: issue.suggestedFix.ingredientName,
    unit: issue.suggestedFix.unit || ingredient.unit
  };
}

/**
 * Checks if an ingredient has any detectable issues
 */
export function hasIngredientIssues(ingredient: { ingredientName: string; unit: Unit }): boolean {
  return detectIngredientIssues(ingredient).length > 0;
} 