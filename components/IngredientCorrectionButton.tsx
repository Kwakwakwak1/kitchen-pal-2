import React, { useState } from 'react';
import { RecipeIngredient } from '../types';
import { detectIngredientIssues, autoFixIngredient } from '../utils/ingredientParser';
import { Button } from '../components';
import { WrenchScrewdriverIcon, SparklesIcon } from '../constants';

interface IngredientCorrectionButtonProps {
  ingredient: RecipeIngredient;
  onFix: (fixedIngredient: RecipeIngredient) => void;
}

export const IngredientCorrectionButton: React.FC<IngredientCorrectionButtonProps> = ({ ingredient, onFix }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const issues = detectIngredientIssues(ingredient);
  
  if (issues.length === 0) return null;

  const handleFix = () => {
    // Apply the first issue fix (most common case will be one issue)
    const fixedIngredient = autoFixIngredient(ingredient, issues[0]);
    onFix(fixedIngredient);
  };

  const primaryIssue = issues[0];

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleFix}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="p-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300"
        aria-label={`Fix ingredient: ${primaryIssue.description}`}
      >
        <WrenchScrewdriverIcon className="w-4 h-4" />
      </Button>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-max max-w-xs">
          <div className="px-3 py-2 text-xs text-white bg-gray-800 rounded-lg shadow-xl border border-gray-700">
            <div className="text-center leading-relaxed">
              {primaryIssue.description}
            </div>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};

interface FixAllIngredientsButtonProps {
  ingredients: RecipeIngredient[];
  onFixAll: (fixedIngredients: RecipeIngredient[]) => void;
}

export const FixAllIngredientsButton: React.FC<FixAllIngredientsButtonProps> = ({ ingredients, onFixAll }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Find all ingredients that have issues
  const ingredientsWithIssues = ingredients.filter(ingredient => {
    const issues = detectIngredientIssues(ingredient);
    return issues.length > 0;
  });

  if (ingredientsWithIssues.length === 0) return null;

  const handleFixAll = () => {
    const fixedIngredients = ingredients.map(ingredient => {
      const issues = detectIngredientIssues(ingredient);
      if (issues.length > 0) {
        // Fix the first (most critical) issue
        return autoFixIngredient(ingredient, issues[0]);
      }
      return ingredient;
    });
    
    onFixAll(fixedIngredients);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleFixAll}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300"
        leftIcon={<SparklesIcon className="w-4 h-4" />}
      >
        Fix All ({ingredientsWithIssues.length})
      </Button>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-max max-w-sm">
          <div className="px-3 py-2 text-xs text-white bg-gray-800 rounded-lg shadow-xl border border-gray-700">
            <div className="text-center leading-relaxed">
              Automatically fix all {ingredientsWithIssues.length} ingredient{ingredientsWithIssues.length > 1 ? 's' : ''} with formatting issues
            </div>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}; 