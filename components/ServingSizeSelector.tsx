import React, { useState, useEffect } from 'react';
import { validateServingSize } from '../utils/recipeScaling';

interface ServingSizeSelectorProps {
  defaultServings: number;
  currentServings: number;
  onServingsChange: (servings: number) => void;
  maxServings?: number;
  minServings?: number;
  className?: string;
}

export const ServingSizeSelector: React.FC<ServingSizeSelectorProps> = ({
  defaultServings,
  currentServings,
  onServingsChange,
  maxServings = 50,
  minServings = 1,
  className = ''
}) => {
  const [inputValue, setInputValue] = useState(currentServings.toString());
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setInputValue(currentServings.toString());
  }, [currentServings]);

  const handleIncrement = () => {
    const newServings = Math.min(currentServings + 1, maxServings);
    onServingsChange(newServings);
  };

  const handleDecrement = () => {
    const newServings = Math.max(currentServings - 1, minServings);
    onServingsChange(newServings);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputFocus = () => {
    setIsEditing(true);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    commitInputValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setInputValue(currentServings.toString());
      e.currentTarget.blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleIncrement();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleDecrement();
    }
  };

  const commitInputValue = () => {
    const parsedValue = parseInt(inputValue);
    if (!isNaN(parsedValue) && validateServingSize(parsedValue, minServings, maxServings)) {
      onServingsChange(parsedValue);
    } else {
      // Reset to current value if invalid
      setInputValue(currentServings.toString());
    }
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className="text-sm text-gray-600 mr-2">Servings:</span>
      
      {/* Decrement button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={currentServings <= minServings}
        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Decrease servings"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>

      {/* Input field */}
      <div className="relative">
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          min={minServings}
          max={maxServings}
          className="w-12 h-8 text-center text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          aria-label="Number of servings"
        />
        {isEditing && (
          <div className="absolute -bottom-6 left-0 text-xs text-gray-500 whitespace-nowrap">
            Press Enter to confirm, Esc to cancel
          </div>
        )}
      </div>

      {/* Increment button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={currentServings >= maxServings}
        className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        aria-label="Increase servings"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Default indicator */}
      {currentServings !== defaultServings && (
        <span className="text-xs text-gray-500 ml-2">
          (default: {defaultServings})
        </span>
      )}
    </div>
  );
}; 