import React, { useState } from 'react';
import { Recipe, ShoppingListItem, Unit } from '../../../types';
import { useRecipes, useInventory, useShoppingLists, useAppState } from '../../../App';
import { generateId, normalizeIngredientName, convertUnit } from '../../../constants';
import { useRecipeCollectionAnalysis } from '../../../utils/hooks';
import { Modal, Button, InputField, EmptyState, AddItemButton, Alert } from '../../../components';
import { BookOpenIcon, MagnifyingGlassIcon, PlusIcon, ShoppingCartIcon } from '../../../constants';
import RecipeCard from './RecipeCard';
import RecipeForm from './RecipeForm';

const RecipesPage: React.FC = () => {
  const { recipes, addRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const { inventory, getInventoryItemByName } = useInventory();
  const { addShoppingList } = useShoppingLists();
  const { setActiveView, searchTerm } = useAppState();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);
  const [showInventoryAnalysis, setShowInventoryAnalysis] = useState(true);
  const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // New state for servings prompt modal
  const [showServingsModal, setShowServingsModal] = useState(false);
  const [selectedRecipeForShoppingList, setSelectedRecipeForShoppingList] = useState<Recipe | null>(null);
  const [selectedServings, setSelectedServings] = useState(1);

  // Get inventory analysis for all recipes
  const recipeAnalysisMap = useRecipeCollectionAnalysis(recipes, inventory);

  const handleSaveRecipe = (recipeData: Omit<Recipe, 'id' | 'imageUrl'> | Recipe) => {
    if ('id' in recipeData) { 
      updateRecipe(recipeData as Recipe);
    } else { 
      addRecipe(recipeData as Omit<Recipe, 'id' | 'imageUrl'>);
    }
    setShowAddModal(false);
    setEditingRecipe(undefined);
  };
  
  const openEditModal = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowAddModal(true);
  };

  // Function to show servings prompt modal
  const promptForServingsAndAddToShoppingList = (recipe: Recipe) => {
    setSelectedRecipeForShoppingList(recipe);
    setSelectedServings(recipe.defaultServings);
    setShowServingsModal(true);
  };

  // Modified direct recipe to shopping list function that takes servings as parameter
  const createShoppingListWithServings = (recipe: Recipe, servings: number) => {
    const servingsMultiplier = servings / recipe.defaultServings;
    const neededIngredients: Record<string, { totalQuantity: number; unit: Unit; defaultStoreId?: string }> = {};

    recipe.ingredients.forEach(ing => {
      // Skip optional ingredients by default
      if (ing.isOptional) return;

      const normalizedName = normalizeIngredientName(ing.ingredientName);
      const scaledQuantity = ing.quantity * servingsMultiplier;
      
      const inventoryItemForDefaultStore = getInventoryItemByName(normalizedName);

      if (!neededIngredients[normalizedName]) {
        neededIngredients[normalizedName] = { 
          totalQuantity: 0, 
          unit: ing.unit, 
          defaultStoreId: inventoryItemForDefaultStore?.defaultStoreId 
        };
      }
      
      const existingEntry = neededIngredients[normalizedName];
      const convertedScaledQuantity = convertUnit(scaledQuantity, ing.unit, existingEntry.unit);

      if (convertedScaledQuantity !== null) {
        existingEntry.totalQuantity += convertedScaledQuantity;
      } else { 
        if (existingEntry.totalQuantity === 0) { 
           existingEntry.unit = ing.unit;
           existingEntry.totalQuantity = scaledQuantity;
        }
      }
      
      if (!existingEntry.defaultStoreId && inventoryItemForDefaultStore?.defaultStoreId) {
        existingEntry.defaultStoreId = inventoryItemForDefaultStore.defaultStoreId;
      }
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
          recipeSources: [{ recipeName: recipe.name, quantity: data.totalQuantity }],
          purchased: false,
          storeId: data.defaultStoreId,
        });
      }
    });
    
    if (shoppingListItems.length === 0) {
      setAlertMessage({
        type: 'success', 
        message: `You have all ingredients for "${recipe.name}" (${servings} serving${servings !== 1 ? 's' : ''})! No shopping needed.`
      });
      setTimeout(() => setAlertMessage(null), 5000);
      return;
    }
    
    // Create new shopping list
    const listName = `Shopping List - ${recipe.name} (${servings} serving${servings !== 1 ? 's' : ''}) - ${new Date().toLocaleDateString()}`;
    const newListId = addShoppingList({
      name: listName,
      items: shoppingListItems
    });
    
    // Show success notification
    setAlertMessage({
      type: 'success', 
      message: `Shopping list "${listName}" created with ${shoppingListItems.length} items! Click here to view it.`
    });
    setTimeout(() => setAlertMessage(null), 5000);
    
    // Close the modal
    setShowServingsModal(false);
    setSelectedRecipeForShoppingList(null);
    
    // Optional: Navigate to the new shopping list after a brief delay
    setTimeout(() => {
      setActiveView('shopping_list_detail', { id: newListId });
    }, 1000);
  };

  const handleConfirmServings = () => {
    if (selectedRecipeForShoppingList) {
      createShoppingListWithServings(selectedRecipeForShoppingList, selectedServings);
    }
  };

  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.ingredients.some(ing => ing.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  ).sort((a,b) => a.name.localeCompare(b.name));

  // Get summary statistics
  const readyRecipes = Array.from(recipeAnalysisMap.values()).filter(analysis => analysis.hasAllIngredients).length;
  const totalRecipes = recipes.length;

  return (
    <div className="container mx-auto p-4">
      {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />}
      {/* Header with summary and toggle */}
      {totalRecipes > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 p-4 rounded-lg">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-semibold text-gray-800">Your Recipes</h2>
            <p className="text-sm text-gray-600">
              {readyRecipes} of {totalRecipes} recipes ready to cook with current inventory
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="inventoryToggle" className="text-sm text-gray-700">
              Show inventory status
            </label>
            <input
              id="inventoryToggle"
              type="checkbox"
              checked={showInventoryAnalysis}
              onChange={(e) => setShowInventoryAnalysis(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {filteredRecipes.length === 0 && searchTerm === '' ? (
        <EmptyState 
          icon={<BookOpenIcon />}
          title="No Recipes Yet"
          message="Start by adding your favorite recipes to your collection."
          actionButton={<Button onClick={() => setShowAddModal(true)} leftIcon={<PlusIcon/>}>Add New Recipe</Button>}
        />
      ) : filteredRecipes.length === 0 && searchTerm !== '' ? (
         <EmptyState 
          icon={<MagnifyingGlassIcon />}
          title="No Recipes Found"
          message={`Your search for "${searchTerm}" did not match any recipes.`}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecipes.map(recipe => {
            const analysis = recipeAnalysisMap.get(recipe.id);
            return (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onSelect={() => setActiveView('recipe_detail', { id: recipe.id })}
                onDelete={() => deleteRecipe(recipe.id)}
                onEdit={() => openEditModal(recipe)}
                onAddToShoppingList={() => promptForServingsAndAddToShoppingList(recipe)}
                showInventoryAnalysis={showInventoryAnalysis}
                inventoryAnalysis={analysis}
              />
            );
          })}
        </div>
      )}
      <AddItemButton onClick={() => { setEditingRecipe(undefined); setShowAddModal(true); }} text="Add Recipe" />
      
      {/* Recipe Form Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingRecipe(undefined); }} title={editingRecipe ? "Edit Recipe" : "Add New Recipe"} size="2xl">
        <RecipeForm 
          initialRecipe={editingRecipe}
          onSave={handleSaveRecipe} 
          onClose={() => { setShowAddModal(false); setEditingRecipe(undefined); }} 
        />
      </Modal>

      {/* Servings Selection Modal */}
      <Modal 
        isOpen={showServingsModal} 
        onClose={() => { setShowServingsModal(false); setSelectedRecipeForShoppingList(null); }} 
        title="Add to Shopping List"
      >
        {selectedRecipeForShoppingList && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {selectedRecipeForShoppingList.name}
              </h3>
              <p className="text-sm text-gray-600">
                How many servings would you like to add to your shopping list?
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-4">
              <label htmlFor="servingsInput" className="text-sm font-medium text-gray-700">
                Servings:
              </label>
              <InputField
                id="servingsInput"
                type="number"
                value={selectedServings}
                onChange={(e) => setSelectedServings(Math.max(1, parseInt(e.target.value) || 1))}
                onFocus={(e) => e.target.select()}
                min="1"
                max="50"
                step="1"
                className="w-20 text-center"
                aria-label="Number of servings"
              />
              <span className="text-sm text-gray-500">
                (default: {selectedRecipeForShoppingList.defaultServings})
              </span>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                This will calculate ingredients needed for {selectedServings} serving{selectedServings !== 1 ? 's' : ''} and 
                subtract what you already have in your inventory.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                variant="ghost" 
                onClick={() => { setShowServingsModal(false); setSelectedRecipeForShoppingList(null); }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleConfirmServings}
                leftIcon={<ShoppingCartIcon className="w-4 h-4" />}
              >
                Add to Shopping List
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RecipesPage;