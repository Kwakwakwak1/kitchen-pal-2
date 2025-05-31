import React, { useState, useMemo } from 'react';
import { useInventory } from '../../providers/InventoryProvider';
import { useRecipes } from '../../providers/RecipesProvider';
import { Button, Card } from '../ui';
import { ShoppingListItem } from '../../../types';
import { 
  generateId, 
  isItemExpiringSoon, 
  isItemExpired,
  isDiscreteUnit,
  normalizeIngredientName 
} from '../../../constants';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface SmartShoppingListGeneratorProps {
  onClose: () => void;
  onGenerate: (items: ShoppingListItem[]) => void;
}

export const SmartShoppingListGenerator: React.FC<SmartShoppingListGeneratorProps> = ({
  onClose,
  onGenerate,
}) => {
  const { inventory } = useInventory();
  const { recipes } = useRecipes();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);

  // Smart analysis of inventory and recipes
  const smartSuggestions = useMemo(() => {
    const suggestions: ShoppingListItem[] = [];

    // 1. Low stock items
    const lowStockItems = inventory.filter(item => 
      item.lowStockThreshold && 
      item.quantity < item.lowStockThreshold && 
      !isItemExpired(item.expirationDate)
    );

    lowStockItems.forEach(item => {
      const restockQuantity = Math.max(
        item.lowStockThreshold! - item.quantity,
        item.lowStockThreshold! * 0.5 // Restock to at least 150% of threshold
      );

      suggestions.push({
        id: generateId(),
        ingredientName: item.ingredientName,
        neededQuantity: restockQuantity,
        unit: item.unit,
        recipeSources: [{ recipeName: 'Low Stock Alert', quantity: restockQuantity }],
        purchased: false,
        storeId: item.defaultStoreId,
      });
    });

    // 2. Items expiring soon but still good
    const expiringSoonItems = inventory.filter(item => 
      isItemExpiringSoon(item.expirationDate, 7) && 
      !isItemExpired(item.expirationDate) &&
      !lowStockItems.find(lsi => lsi.id === item.id)
    );

    // For expiring items, suggest replacement quantities
    expiringSoonItems.forEach(item => {
      const replacementQuantity = Math.max(item.quantity, item.lowStockThreshold || item.quantity);
      
      suggestions.push({
        id: generateId(),
        ingredientName: item.ingredientName,
        neededQuantity: replacementQuantity,
        unit: item.unit,
        recipeSources: [{ recipeName: 'Expiring Soon', quantity: replacementQuantity }],
        purchased: false,
        storeId: item.defaultStoreId,
      });
    });

    // 3. Frequently used items that are getting low (even if not below threshold)
    const frequentlyUsedLowItems = inventory.filter(item => 
      item.frequencyOfUse && 
      ['daily', 'weekly'].includes(item.frequencyOfUse) &&
      item.quantity < (item.lowStockThreshold || 10) * 1.5 &&
      !lowStockItems.find(lsi => lsi.id === item.id) &&
      !expiringSoonItems.find(esi => esi.id === item.id)
    );

    frequentlyUsedLowItems.forEach(item => {
      const suggestionQuantity = (item.lowStockThreshold || 10) * 1.5 - item.quantity;
      
      suggestions.push({
        id: generateId(),
        ingredientName: item.ingredientName,
        neededQuantity: suggestionQuantity,
        unit: item.unit,
        recipeSources: [{ recipeName: 'Frequently Used', quantity: suggestionQuantity }],
        purchased: false,
        storeId: item.defaultStoreId,
      });
    });

    return suggestions;
  }, [inventory]);

  // Recipe-based suggestions
  const recipeSuggestions = useMemo(() => {
    if (selectedRecipes.length === 0) return [];

    const suggestions: ShoppingListItem[] = [];
    const recipeObjects = recipes.filter(r => selectedRecipes.includes(r.id));

    recipeObjects.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        const normalizedName = normalizeIngredientName(ingredient.ingredientName);
        const inventoryItem = inventory.find(item => 
          normalizeIngredientName(item.ingredientName) === normalizedName
        );

        const neededQuantity = ingredient.quantity;
        const availableQuantity = inventoryItem?.quantity || 0;

        if (availableQuantity < neededQuantity) {
          const shortfall = neededQuantity - availableQuantity;
          
          // Check if we already have a suggestion for this ingredient
          const existingSuggestion = suggestions.find(s => 
            normalizeIngredientName(s.ingredientName) === normalizedName
          );

          if (existingSuggestion) {
            // Add to existing suggestion
            existingSuggestion.neededQuantity += shortfall;
            existingSuggestion.recipeSources.push({
              recipeName: recipe.name,
              quantity: shortfall
            });
          } else {
            // Create new suggestion
            suggestions.push({
              id: generateId(),
              ingredientName: ingredient.ingredientName,
              neededQuantity: shortfall,
              unit: ingredient.unit,
              recipeSources: [{ recipeName: recipe.name, quantity: shortfall }],
              purchased: false,
              storeId: inventoryItem?.defaultStoreId,
            });
          }
        }
      });
    });

    return suggestions;
  }, [selectedRecipes, recipes, inventory]);

  // Combine all suggestions
  const allSuggestions = useMemo(() => {
    const combined = [...smartSuggestions, ...recipeSuggestions];
    
    // Merge duplicate ingredients
    const merged: ShoppingListItem[] = [];
    
    combined.forEach(suggestion => {
      const normalizedName = normalizeIngredientName(suggestion.ingredientName);
      const existing = merged.find(item => 
        normalizeIngredientName(item.ingredientName) === normalizedName &&
        item.unit === suggestion.unit
      );

      if (existing) {
        existing.neededQuantity += suggestion.neededQuantity;
        existing.recipeSources = [...existing.recipeSources, ...suggestion.recipeSources];
      } else {
        merged.push({ ...suggestion });
      }
    });

    return merged;
  }, [smartSuggestions, recipeSuggestions]);

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleRecipeToggle = (recipeId: string) => {
    setSelectedRecipes(prev => 
      prev.includes(recipeId) 
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  const handleGenerate = () => {
    const selectedSuggestions = allSuggestions.filter(item => 
      selectedItems.includes(item.id)
    );
    onGenerate(selectedSuggestions);
  };

  const formatQuantity = (quantity: number, unit: string) => {
    if (isDiscreteUnit(unit as any)) {
      return Math.round(quantity).toString();
    }
    return quantity.toFixed(1);
  };

  return (
    <Card className="max-w-4xl">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <SparklesIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Smart Shopping List Generator</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Recipe Selection */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Select Recipes to Cook (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {recipes.map(recipe => (
                <div
                  key={recipe.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRecipes.includes(recipe.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleRecipeToggle(recipe.id)}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRecipes.includes(recipe.id)}
                      onChange={() => handleRecipeToggle(recipe.id)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="font-medium text-gray-800">{recipe.name}</p>
                      <p className="text-sm text-gray-600">
                        {recipe.ingredients.length} ingredients • Serves {recipe.defaultServings}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Smart Suggestions */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Smart Suggestions ({allSuggestions.length} items)
            </h3>
            
            {allSuggestions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  {selectedRecipes.length === 0 
                    ? "Your inventory looks good! Select some recipes above to get ingredient suggestions."
                    : "All ingredients for selected recipes are available in your inventory."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {allSuggestions.map(item => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedItems.includes(item.id)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleItemToggle(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleItemToggle(item.id)}
                          className="text-green-600 focus:ring-green-500"
                        />
                        <div>
                          <p className="font-medium text-gray-800">
                            {item.ingredientName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatQuantity(item.neededQuantity, item.unit)} {item.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          Needed for:
                        </p>
                        <p className="text-xs text-gray-600">
                          {item.recipeSources.map(source => source.recipeName).join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {selectedItems.length} of {allSuggestions.length} items selected
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleGenerate}
                disabled={selectedItems.length === 0}
              >
                Generate Shopping List ({selectedItems.length} items)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}; 