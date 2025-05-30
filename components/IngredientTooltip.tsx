import React, { useState, useRef, useEffect } from 'react';
import type { RecipeIngredient } from '../types';

interface IngredientTooltipProps {
  ingredient: RecipeIngredient;
  scaledQuantity: number;
  scaledUnit: string;
  isOptional: boolean;
  trigger: 'hover' | 'click';
  children: React.ReactNode;
}

export const IngredientTooltip: React.FC<IngredientTooltipProps> = ({
  ingredient,
  scaledQuantity,
  scaledUnit,
  isOptional,
  trigger,
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = triggerRect.top - tooltipRect.height - 8; // 8px gap
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);

    // Adjust if tooltip goes off screen
    if (left < 8) {
      left = 8;
    } else if (left + tooltipRect.width > viewportWidth - 8) {
      left = viewportWidth - tooltipRect.width - 8;
    }

    // If tooltip would go above viewport, show below instead
    if (top < 8) {
      top = triggerRect.bottom + 8;
    }

    setPosition({ top: top + window.scrollY, left });
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(calculatePosition, 10);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  useEffect(() => {
    const handleScroll = () => {
      if (isVisible && trigger === 'hover') {
        setIsVisible(false);
      }
    };

    const handleResize = () => {
      if (isVisible) {
        calculatePosition();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (trigger === 'click' && 
          tooltipRef.current && 
          !tooltipRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, trigger]);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="relative"
      >
        {children}
      </span>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-lg pointer-events-none max-w-xs"
          style={{
            top: position.top,
            left: position.left,
            opacity: 0,
            animation: 'fadeIn 0.15s ease-out forwards'
          }}
        >
          {/* Tooltip content */}
          <div className="space-y-1">
            <div className="font-semibold text-white">
              {ingredient.ingredientName}
            </div>
            <div className="text-blue-200 font-medium">
              {scaledUnit} {ingredient.unit}
            </div>
            {isOptional && (
              <div className="text-gray-300 text-xs italic">
                (optional ingredient)
              </div>
            )}
          </div>
          
          {/* Tooltip arrow */}
          <div 
            className="absolute w-2 h-2 bg-gray-800 transform rotate-45"
            style={{
              bottom: '-4px',
              left: '50%',
              marginLeft: '-4px'
            }}
          />
        </div>
      )}
      
      {/* Add CSS animation via style tag */}
      {isVisible && (
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}
    </>
  );
}; 