import React, { useState } from 'react';
import { RecipeInventoryAnalysis } from '../../../types';
import { getRecipeReadinessStatus, getStatusColorClasses } from '../../../utils/recipeAnalyzer';
import { ChevronUpIcon, ChevronDownIcon } from '../../../constants';

interface InventoryAnalysisCardProps {
  analysis: RecipeInventoryAnalysis;
}

const InventoryAnalysisCard: React.FC<InventoryAnalysisCardProps> = ({ analysis }) => {
  const [showDetails, setShowDetails] = useState(false);
  const status = getRecipeReadinessStatus(analysis);
  const colors = getStatusColorClasses(status);

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'ready':
        return 'Ready to cook!';
      case 'mostly-ready':
        return 'Almost ready';
      case 'partially-ready':
        return 'Missing some items';
      case 'not-ready':
        return 'Many items needed';
      default:
        return 'Unknown status';
    }
  };

  const getServingsText = (): string => {
    if (analysis.maxPossibleServings === 0) {
      return 'Cannot make any servings';
    } else if (analysis.maxPossibleServings === Infinity) {
      return 'Can make unlimited servings';
    } else {
      return `Can make ${analysis.maxPossibleServings} serving${analysis.maxPossibleServings !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs">
      {/* Status Summary */}
      <div className="flex items-center justify-between mb-1">
        <span className={`font-medium ${colors.text}`}>
          {getStatusText(status)}
        </span>
        <span className="text-gray-600">
          {analysis.availableIngredients}/{analysis.totalIngredients} ingredients
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
        <div 
          className={`h-1.5 rounded-full transition-all duration-300 ${
            status === 'ready' ? 'bg-green-500' :
            status === 'mostly-ready' ? 'bg-yellow-500' :
            status === 'partially-ready' ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ width: `${analysis.completionPercentage}%` }}
        />
      </div>

      {/* Servings Info */}
      <div className="text-gray-600 mb-2">
        {getServingsText()}
      </div>

      {/* Missing Ingredients Toggle */}
      {analysis.missingIngredients.length > 0 && (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            className="flex items-center justify-between w-full text-left text-gray-600 hover:text-gray-800 transition-colors"
          >
            <span>Missing {analysis.missingIngredients.length} item{analysis.missingIngredients.length !== 1 ? 's' : ''}</span>
            {showDetails ? (
              <ChevronUpIcon className="w-3 h-3" />
            ) : (
              <ChevronDownIcon className="w-3 h-3" />
            )}
          </button>

          {/* Missing Ingredients Details */}
          {showDetails && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="space-y-1">
                {analysis.missingIngredients.slice(0, 3).map((missing, index) => (
                  <div key={index} className="text-gray-600">
                    <span className="font-medium">{missing.ingredientName}</span>
                    {missing.availableQuantity !== undefined ? (
                      <span className="ml-1">
                        (need {missing.neededQuantity.toFixed(1)} {missing.unit}, have {missing.availableQuantity.toFixed(1)})
                      </span>
                    ) : (
                      <span className="ml-1">
                        (need {missing.neededQuantity.toFixed(1)} {missing.unit})
                      </span>
                    )}
                  </div>
                ))}
                {analysis.missingIngredients.length > 3 && (
                  <div className="text-gray-500 italic">
                    +{analysis.missingIngredients.length - 3} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryAnalysisCard;