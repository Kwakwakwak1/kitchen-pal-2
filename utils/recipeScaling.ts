import type { RecipeIngredient } from '../types';

export interface ScaledIngredient extends RecipeIngredient {
  scaledQuantity: number;
  displayQuantity: string;
}

/**
 * Calculates scaled ingredient quantities based on current and default servings
 */
export function scaleIngredients(
  ingredients: RecipeIngredient[],
  currentServings: number,
  defaultServings: number
): ScaledIngredient[] {
  const scalingFactor = currentServings / defaultServings;
  
  return ingredients.map(ingredient => {
    const scaledQuantity = ingredient.quantity * scalingFactor;
    const displayQuantity = formatQuantityForDisplay(scaledQuantity, ingredient.unit);
    
    return {
      ...ingredient,
      scaledQuantity,
      displayQuantity
    };
  });
}

/**
 * Formats a quantity for display based on the unit type and value
 */
export function formatQuantityForDisplay(quantity: number, unit?: string): string {
  // Handle very small quantities
  if (quantity < 0.001) {
    return '0';
  }
  
  // For discrete units like pieces, show whole numbers
  const discreteUnits = ['piece', 'pieces', 'none', ''];
  const isDiscreteUnit = discreteUnits.includes(unit?.toLowerCase() || '');
  
  if (isDiscreteUnit) {
    return Math.round(quantity).toString();
  }
  
  // For continuous quantities, show appropriate precision
  if (quantity < 0.1) {
    return quantity.toFixed(3).replace(/\.?0+$/, '');
  } else if (quantity < 1) {
    return quantity.toFixed(2).replace(/\.?0+$/, '');
  } else if (quantity < 10) {
    return quantity.toFixed(1).replace(/\.?0+$/, '');
  } else {
    return Math.round(quantity * 100) / 100 + '';
  }
}

/**
 * Converts a fractional number to a mixed number string for better readability
 */
export function toMixedNumber(quantity: number): string {
  if (quantity < 0.125) return formatQuantityForDisplay(quantity);
  
  const wholeNumber = Math.floor(quantity);
  const fraction = quantity - wholeNumber;
  
  // Common fractions for cooking
  const fractions = [
    { decimal: 0.125, display: '1/8' },
    { decimal: 0.25, display: '1/4' },
    { decimal: 0.333, display: '1/3' },
    { decimal: 0.375, display: '3/8' },
    { decimal: 0.5, display: '1/2' },
    { decimal: 0.625, display: '5/8' },
    { decimal: 0.667, display: '2/3' },
    { decimal: 0.75, display: '3/4' },
    { decimal: 0.875, display: '7/8' }
  ];
  
  // Find the closest fraction
  const closest = fractions.reduce((prev, curr) => 
    Math.abs(curr.decimal - fraction) < Math.abs(prev.decimal - fraction) ? curr : prev
  );
  
  // Only use fraction if it's close enough (within 0.05)
  if (Math.abs(closest.decimal - fraction) < 0.05) {
    if (wholeNumber === 0) {
      return closest.display;
    } else {
      return `${wholeNumber} ${closest.display}`;
    }
  }
  
  return formatQuantityForDisplay(quantity);
}

/**
 * Validates that a serving size is within reasonable bounds
 */
export function validateServingSize(servings: number, min: number = 1, max: number = 50): boolean {
  return Number.isInteger(servings) && servings >= min && servings <= max;
}

/**
 * Calculates the scaling factor between two serving sizes
 */
export function getScalingFactor(currentServings: number, defaultServings: number): number {
  return currentServings / defaultServings;
} 