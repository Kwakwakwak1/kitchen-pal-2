import React from 'react';
import { Recipe, RecipeInventoryAnalysis } from '../../../types';
import { DEFAULT_RECIPE_IMAGE, ShoppingCartIcon, PencilIcon, TrashIcon } from '../../../constants';
import { Card, Button } from '../../../components';
import InventoryStatusBadge from '../../components/shared/InventoryStatusBadge';
import InventoryAnalysisCard from '../../components/shared/InventoryAnalysisCard';

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onAddToShoppingList: () => void;
  showInventoryAnalysis?: boolean;
  inventoryAnalysis?: RecipeInventoryAnalysis;
}

const RecipeCard: React.FC<RecipeCardProps> = ({ 
  recipe, 
  onSelect, 
  onDelete, 
  onEdit, 
  onAddToShoppingList, 
  showInventoryAnalysis = false, 
  inventoryAnalysis 
}) => {
  const hasOptional = recipe.ingredients.some(ing => ing.isOptional);
  
  return (
    <Card className="flex flex-col justify-between h-full relative">
      {/* Inventory Status Badge */}
      {showInventoryAnalysis && inventoryAnalysis && (
        <div className="absolute top-2 right-2 z-10">
          <InventoryStatusBadge analysis={inventoryAnalysis} />
        </div>
      )}
      
      <div>
        <img 
          src={recipe.imageUrl || DEFAULT_RECIPE_IMAGE} 
          alt={recipe.name} 
          className="w-full h-40 object-cover rounded-t-lg mb-4 cursor-pointer"
          onClick={onSelect}
          onError={(e) => (e.currentTarget.src = DEFAULT_RECIPE_IMAGE)}
        />
        <h3 className="text-xl font-semibold text-blue-600 hover:text-blue-800 mb-2 cursor-pointer" onClick={onSelect}>
          {recipe.name}
        </h3>
        
        {/* Basic Recipe Info */}
        <p className="text-sm text-gray-500 mb-1">Servings: {recipe.defaultServings}</p>
        {recipe.prepTime && <p className="text-sm text-gray-500 mb-1">Prep: {recipe.prepTime}</p>}
        {recipe.cookTime && <p className="text-sm text-gray-500 mb-1">Cook: {recipe.cookTime}</p>}
        {hasOptional && <p className="text-xs text-purple-600 mb-1">Has optional ingredients</p>}
        
        {/* Inventory Analysis Info */}
        {showInventoryAnalysis && inventoryAnalysis && (
          <InventoryAnalysisCard analysis={inventoryAnalysis} />
        )}
        
        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="mt-2">
            {recipe.tags.map(tag => (
              <span key={tag} className="inline-block bg-gray-200 rounded px-2 py-0.5 text-xs mr-1">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-end space-x-2 pt-2 border-t border-gray-200">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={(e) => { 
            e.stopPropagation(); 
            onAddToShoppingList(); 
          }} 
          aria-label={`Add ${recipe.name} to shopping list`}
          title="Add to Shopping List"
        >
          <ShoppingCartIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${recipe.name}`}>
          <PencilIcon />
        </Button>
        <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label={`Delete ${recipe.name}`}>
          <TrashIcon />
        </Button>
      </div>
    </Card>
  );
};

export default RecipeCard;