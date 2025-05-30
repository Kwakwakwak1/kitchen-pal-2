import React from 'react';
import type { ScaledIngredient } from '../utils/recipeScaling';
import { toMixedNumber } from '../utils/recipeScaling';

interface ScaledIngredientsListProps {
  ingredients: ScaledIngredient[];
  showMixedNumbers?: boolean;
  className?: string;
}

export const ScaledIngredientsList: React.FC<ScaledIngredientsListProps> = ({
  ingredients,
  showMixedNumbers = false,
  className = ''
}) => {
  const formatQuantity = (ingredient: ScaledIngredient): string => {
    if (showMixedNumbers) {
      return toMixedNumber(ingredient.scaledQuantity);
    }
    return ingredient.displayQuantity;
  };

  return (
    <ul className={`list-disc list-inside space-y-1 text-gray-700 ${className}`}>
      {ingredients.map((ingredient, index) => (
        <li 
          key={index} 
          className={`${ingredient.isOptional ? 'text-gray-500 italic' : ''} transition-colors duration-200`}
        >
          <span className="font-medium">
            {formatQuantity(ingredient)}
          </span>
          {ingredient.unit && (
            <span className="mx-1">
              {ingredient.unit}
            </span>
          )}
          <span className="ingredient-name" data-ingredient={ingredient.ingredientName}>
            {ingredient.ingredientName}
          </span>
          {ingredient.isOptional && (
            <span className="text-gray-400 ml-1">(optional)</span>
          )}
        </li>
      ))}
    </ul>
  );
}; 