import React, { useState, useMemo } from 'react';
import type { RecipeIngredient } from '../types';
import { parseInstructionsForIngredients, type ParsedInstructions, type InstructionSegment } from '../utils/instructionParser';
import { IngredientTooltip } from './IngredientTooltip';

interface InteractiveInstructionsProps {
  instructions: string;
  ingredients: RecipeIngredient[];
  currentServings: number;
  defaultServings: number;
  className?: string;
}

interface IngredientSegmentProps {
  segment: InstructionSegment;
  isMobile: boolean;
}

const IngredientSegment: React.FC<IngredientSegmentProps> = ({ segment, isMobile }) => {
  const [showMobilePopup, setShowMobilePopup] = useState(false);
  
  if (!segment.isIngredient || !segment.ingredientMention) {
    return <span>{segment.text}</span>;
  }

  const { ingredientMention } = segment;
  const { ingredient, scaledUnit } = ingredientMention;

  const handleMobileClick = () => {
    setShowMobilePopup(true);
  };

  const handleMobileClose = () => {
    setShowMobilePopup(false);
  };

  const ingredientContent = (
    <span 
      className={`
        inline ingredient-mention cursor-pointer
        border-b border-dotted border-blue-500 
        text-blue-600 hover:text-blue-800 
        hover:border-blue-700 hover:bg-blue-50
        transition-colors duration-150
        ${isMobile ? 'py-1 px-1 rounded-sm' : ''}
      `}
      onClick={isMobile ? handleMobileClick : undefined}
      data-ingredient={ingredient.ingredientName}
    >
      {segment.text}
    </span>
  );

  if (isMobile) {
    return (
      <>
        {ingredientContent}
        {showMobilePopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-800">{ingredient.ingredientName}</h3>
                <button
                  onClick={handleMobileClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                <div className="text-lg font-medium text-blue-600">
                  {scaledUnit} {ingredient.unit}
                </div>
                {ingredient.isOptional && (
                  <div className="text-sm text-gray-500 italic">
                    (optional ingredient)
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleMobileClose}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop version with tooltip
  return (
    <IngredientTooltip
      ingredient={ingredient}
      scaledQuantity={ingredientMention.scaledQuantity}
      scaledUnit={scaledUnit}
      isOptional={ingredient.isOptional}
      trigger="hover"
    >
      {ingredientContent}
    </IngredientTooltip>
  );
};

export const InteractiveInstructions: React.FC<InteractiveInstructionsProps> = ({
  instructions,
  ingredients,
  currentServings,
  defaultServings,
  className = ''
}) => {
  // Detect if we're on mobile (simplified detection)
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || 'ontouchstart' in window;
  });

  // Parse instructions with memoization to avoid re-parsing on every render
  const parsedInstructions: ParsedInstructions = useMemo(() => {
    return parseInstructionsForIngredients(
      instructions,
      ingredients,
      currentServings,
      defaultServings
    );
  }, [instructions, ingredients, currentServings, defaultServings]);

  // If no ingredient mentions were found, render as plain text
  if (parsedInstructions.ingredientMentions.length === 0) {
    return (
      <div className={`prose prose-sm max-w-none text-gray-700 whitespace-pre-line ${className}`}>
        {instructions}
      </div>
    );
  }

  return (
    <div className={`prose prose-sm max-w-none text-gray-700 ${className}`}>
      <div className="instruction-content">
        {parsedInstructions.segments.map((segment) => (
          <IngredientSegment 
            key={segment.key} 
            segment={segment} 
            isMobile={isMobile}
          />
        ))}
      </div>
      
      {/* Show a small indicator that there are interactive ingredients */}
      {parsedInstructions.ingredientMentions.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-2">
          💡 {isMobile ? 'Tap' : 'Hover over'} highlighted ingredients to see quantities for {currentServings} serving{currentServings !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}; 