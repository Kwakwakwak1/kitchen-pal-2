import React from 'react';
import { Recipe } from '../../../types';

interface RecipePreparationModeProps {
  recipe: Recipe;
  servings: number;
  onExit: () => void;
  onComplete: () => void;
}

export const RecipePreparationMode: React.FC<RecipePreparationModeProps> = ({
  recipe,
  servings,
  onExit,
  onComplete
}) => {
  return (
    <div>
      <h1>Cooking: {recipe.name} (for {servings} servings)</h1>
      <p>RecipePreparationMode - TODO: Implement step-by-step cooking</p>
      <button onClick={onExit}>Exit</button>
      <button onClick={onComplete}>Complete</button>
    </div>
  );
}; 