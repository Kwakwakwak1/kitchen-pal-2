import React, { useState } from 'react';
import { RecipeIngredient } from '../types';
import { detectIngredientIssues, autoFixIngredient } from '../utils/ingredientParser';
import { Button } from '../components';
import { WrenchScrewdriverIcon } from '../constants';

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
        <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-800 rounded-lg shadow-lg whitespace-nowrap">
          {primaryIssue.description}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}; 