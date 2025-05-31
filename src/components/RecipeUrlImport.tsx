import React from 'react';
import { Recipe } from '../../types';

interface RecipeUrlImportProps {
  onImport: (recipe: Omit<Recipe, 'id' | 'imageUrl'>) => void;
  onCancel: () => void;
}

export const RecipeUrlImport: React.FC<RecipeUrlImportProps> = ({ onImport, onCancel }) => {
  return (
    <div>
      <p>RecipeUrlImport component - TODO: Implement URL import functionality</p>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
}; 