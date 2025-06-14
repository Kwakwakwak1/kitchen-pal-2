import React, { useState, ChangeEvent, FocusEvent } from 'react';
import { Unit, ShoppingListItem, RecipeIngredient } from '../../../types';
import { useRecipes } from '../../providers/RecipesProviderAPI';
import { useInventory } from '../../providers/InventoryProviderAPI';
import { useShoppingLists } from '../../providers/ShoppingListsProviderAPI';
import { useAppState } from '../../providers/AppStateProvider';
import { normalizeIngredientName, convertUnit, generateId } from '../../../constants';
import { Button, CheckboxField, InputField, EmptyState } from '../../../components';
import { 
  ArrowLeftIcon, BookOpenIcon, PlusIcon, MagnifyingGlassIcon, ShoppingCartIcon 
} from '../../../constants';

interface SelectedOptionalIngredients {
  [recipeId: string]: { [ingredientName: string]: boolean };
}

const ShoppingListGeneratorPage: React.FC = () => {
  const { recipes, getRecipeById } = useRecipes();
  const { getInventoryItemByName } = useInventory();
  const { addShoppingList } = useShoppingLists();
  const { setActiveView, viewParams, searchTerm } = useAppState();
  
  const initialRecipeIds = viewParams.recipeIds ? viewParams.recipeIds.split(',') : [];
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>(initialRecipeIds);
  const [servingsOverrides, setServingsOverrides] = useState<Record<string, number>>({});
  const [selectedOptionalIngs, setSelectedOptionalIngs] = useState<SelectedOptionalIngredients>({});

  const toggleRecipeSelection = (recipeId: string) => {
    setSelectedRecipeIds(prev => 
      prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    );
    if (selectedRecipeIds.includes(recipeId)) {
      setSelectedOptionalIngs(prev => {
        const newState = {...prev};
        delete newState[recipeId];
        return newState;
      });
    }
  };

  const handleOptionalIngredientToggle = (recipeId: string, ingredientName: string, isChecked: boolean) => {
    setSelectedOptionalIngs(prev => ({
      ...prev,
      [recipeId]: {
        ...(prev[recipeId] || {}),
        [ingredientName]: isChecked,
      }
    }));
  };

  const handleServingsChange = (recipeId: string, servings: number) => {
    setServingsOverrides(prev => ({ ...prev, [recipeId]: Math.max(1, servings) }));
  };
  
  const calculateShoppingList = () => {
    const neededIngredients: Record<string, { totalQuantity: number; unit: Unit; sources: Array<{ recipeName: string; quantity: number }>, defaultStoreId?: string }> = {};

    selectedRecipeIds.forEach(recipeId => {
      const recipe = getRecipeById(recipeId);
      if (!recipe) return;

      const servingsMultiplier = (servingsOverrides[recipeId] || recipe.defaultServings) / recipe.defaultServings;

      recipe.ingredients.forEach((ing: RecipeIngredient) => {
        if (ing.isOptional && (!selectedOptionalIngs[recipeId] || !selectedOptionalIngs[recipeId][ing.ingredientName])) {
          return;
        }

        const normalizedName = normalizeIngredientName(ing.ingredientName);
        const scaledQuantity = ing.quantity * servingsMultiplier;
        
        const inventoryItemForDefaultStore = getInventoryItemByName(normalizedName);

        if (!neededIngredients[normalizedName]) {
          neededIngredients[normalizedName] = { totalQuantity: 0, unit: ing.unit, sources: [], defaultStoreId: inventoryItemForDefaultStore?.defaultStoreId };
        }
        
        const existingEntry = neededIngredients[normalizedName];
        const convertedScaledQuantity = convertUnit(scaledQuantity, ing.unit, existingEntry.unit);

        if (convertedScaledQuantity !== null) {
          existingEntry.totalQuantity += convertedScaledQuantity;
        } else { 
          if (existingEntry.totalQuantity === 0) { 
             existingEntry.unit = ing.unit;
             existingEntry.totalQuantity = scaledQuantity;
          } else {
            console.warn(`Could not convert ${ing.unit} to ${existingEntry.unit} for ${normalizedName}. This ingredient might be listed separately.`);
          }
        }
        existingEntry.sources.push({ recipeName: recipe.name, quantity: scaledQuantity });
        if (!existingEntry.defaultStoreId && inventoryItemForDefaultStore?.defaultStoreId) {
          existingEntry.defaultStoreId = inventoryItemForDefaultStore.defaultStoreId;
        }
      });
    });
    
    const shoppingListItems: ShoppingListItem[] = [];
    Object.entries(neededIngredients).forEach(([name, data]) => {
      const inventoryItem = getInventoryItemByName(name);
      let quantityToBuy = data.totalQuantity;

      if (inventoryItem) {
        const inventoryQuantityInNeededUnit = convertUnit(inventoryItem.quantity, inventoryItem.unit, data.unit);
        if (inventoryQuantityInNeededUnit !== null) {
          quantityToBuy -= inventoryQuantityInNeededUnit;
        }
      }
      
      if (quantityToBuy > 0.01) { 
        shoppingListItems.push({
          id: generateId(),
          ingredientName: name,
          neededQuantity: parseFloat(quantityToBuy.toFixed(2)), 
          unit: data.unit,
          recipeSources: data.sources,
          purchased: false,
          storeId: data.defaultStoreId,
        });
      }
    });
    
    if (shoppingListItems.length > 0) {
        const listName = `Shopping List - ${new Date().toLocaleDateString()}`;
        const newListId = addShoppingList({ name: listName, items: shoppingListItems });
        setActiveView('shopping_list_detail', {id: newListId});
    } else {
        alert("Nothing to buy! Your inventory covers all selected recipe needs, or no recipes were selected.");
        setActiveView('recipes');
    }
  };

  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => setActiveView('recipes')} variant="ghost" leftIcon={<ArrowLeftIcon />} className="mb-6">Back to Recipes</Button>
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Generate Shopping List</h2>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-700 mb-2">Select Recipes</h3>
        <p className="text-sm text-blue-600 mb-4">Choose recipes and adjust servings. Optional ingredients can be selected per recipe.</p>
        {filteredRecipes.length === 0 && searchTerm === '' ? (
            <EmptyState
                icon={<BookOpenIcon />}
                title="No Recipes Available"
                message="Add some recipes first to generate a shopping list."
                actionButton={<Button onClick={() => setActiveView('recipes')} leftIcon={<PlusIcon/>}>Go to Recipes</Button>}
            />
        ) : filteredRecipes.length === 0 && searchTerm !== '' ? (
            <EmptyState
                icon={<MagnifyingGlassIcon />}
                title="No Recipes Found"
                message={`Your search for "${searchTerm}" did not match any recipes for list generation.`}
            />
        ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {filteredRecipes.map(recipe => {
                const currentServings = servingsOverrides[recipe.id] || recipe.defaultServings;
                const optionalIngredients = recipe.ingredients.filter(ing => ing.isOptional);
                const isRecipeSelected = selectedRecipeIds.includes(recipe.id);
                return (
                <div key={recipe.id} className="p-3 bg-white rounded shadow">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                        <CheckboxField 
                            id={`recipe-${recipe.id}`}
                            checked={isRecipeSelected}
                            onChange={() => toggleRecipeSelection(recipe.id)}
                            label={<span className="text-gray-700 font-medium">{recipe.name}</span>}
                        />
                        </div>
                        <div className="flex items-center space-x-2">
                        <InputField 
                            type="number" 
                            id={`servings-${recipe.id}`}
                            min="1"
                            max="50"
                            step="1"
                            value={currentServings}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleServingsChange(recipe.id, parseInt(e.target.value) || 1)}
                            onFocus={(e: FocusEvent<HTMLInputElement>) => e.target.select()}
                            className="w-20 p-1.5 text-sm"
                            aria-label={`Servings for ${recipe.name}`}
                        />
                        <label htmlFor={`servings-${recipe.id}`} className="text-sm text-gray-600">servings</label>
                        </div>
                    </div>
                    {isRecipeSelected && optionalIngredients.length > 0 && (
                        <div className="mt-2 pl-6 border-l-2 border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Optional Ingredients:</p>
                            {optionalIngredients.map(optIng => (
                                <CheckboxField
                                    key={optIng.ingredientName}
                                    id={`opt-${recipe.id}-${normalizeIngredientName(optIng.ingredientName)}`}
                                    label={`${optIng.ingredientName} (${optIng.quantity} ${optIng.unit})`}
                                    checked={selectedOptionalIngs[recipe.id]?.[optIng.ingredientName] || false}
                                    onChange={e => handleOptionalIngredientToggle(recipe.id, optIng.ingredientName, e.target.checked)}
                                    containerClassName="text-sm"
                                />
                            ))}
                        </div>
                    )}
                </div>
                );
            })}
            </div>
        )}
      </div>

      <Button 
        onClick={calculateShoppingList} 
        disabled={selectedRecipeIds.length === 0}
        variant="primary"
        size="lg"
        leftIcon={<ShoppingCartIcon />}
        className="w-full sm:w-auto"
      >
        Generate List
      </Button>
    </div>
  );
};

export default ShoppingListGeneratorPage;