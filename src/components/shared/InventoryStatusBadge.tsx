import React from 'react';
import { RecipeInventoryAnalysis } from '../../../types';
import { getRecipeReadinessStatus, getStatusColorClasses } from '../../../utils/recipeAnalyzer';

interface InventoryStatusBadgeProps {
  analysis: RecipeInventoryAnalysis;
}

const InventoryStatusBadge: React.FC<InventoryStatusBadgeProps> = ({ analysis }) => {
  const status = getRecipeReadinessStatus(analysis);
  const colors = getStatusColorClasses(status);
  
  return (
    <div 
      className={`px-2 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} ${colors.border} border shadow-sm`}
    >
      {analysis.completionPercentage}%
    </div>
  );
};

export default InventoryStatusBadge;