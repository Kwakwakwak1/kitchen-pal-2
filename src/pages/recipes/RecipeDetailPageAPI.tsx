import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, ShoppingListItem, Unit } from '../../../types';
import { type ScaledIngredient } from '../../../utils/recipeScaling';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecipes } from '../../providers/RecipesProviderAPI';
import { useInventory } from '../../providers/InventoryProviderAPI';
import { useShoppingLists } from '../../providers/ShoppingListsProviderAPI';
import { generateId, normalizeIngredientName, convertUnit, DEFAULT_RECIPE_IMAGE } from '../../../constants';
import { BookOpenIcon, ArrowLeftIcon, PencilIcon, SparklesIcon, ShoppingCartIcon } from '../../../constants';
import { Modal, Button, InputField, Card, Alert, EmptyState } from '../../../components';
import { ServingSizeSelector } from '../../../components/ServingSizeSelector';
import { ScaledIngredientsList } from '../../../components/ScaledIngredientsList';
import { scaleIngredients } from '../../../utils/recipeScaling';
import { InteractiveInstructions } from '../../../components/InteractiveInstructions';
import { analyzeRecipeInventory } from '../../../utils/recipeAnalyzer';
import RecipeForm from './RecipeForm';

const RecipeDetailPageAPI: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { getRecipeById, updateRecipe } = useRecipes();
  const { validateRecipePreparation, deductIngredientsForPreparation, inventory, getInventoryItemByName } = useInventory();
  const { addShoppingList } = useShoppingLists();
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [prepareServings, setPrepareServings] = useState(1);
  const [preparationValidation, setPreparationValidation] = useState<any>(null);
  const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // New state for dynamic serving size
  const [currentServings, setCurrentServings] = useState(1);
  const [scaledIngredients, setScaledIngredients] = useState<ScaledIngredient[]>([]);

  const recipe = getRecipeById(id || '');

  // Add inventory analysis for current serving size
  const inventoryAnalysis = useMemo(() => {
    if (!recipe) return null;
    return analyzeRecipeInventory(recipe, inventory, currentServings);
  }, [recipe, inventory, currentServings]);

  // Check if we can prepare the current serving size
  const canPrepareCurrentServings = useMemo(() => {
    if (!recipe || !inventoryAnalysis) return false;
    return currentServings <= inventoryAnalysis.maxPossibleServings;
  }, [recipe, inventoryAnalysis, currentServings]);

  useEffect(() => {
    if (recipe) {
      setPrepareServings(recipe.defaultServings);
      setCurrentServings(recipe.defaultServings);
      // Initialize scaled ingredients
      const scaled = scaleIngredients(recipe.ingredients, recipe.defaultServings, recipe.defaultServings);
      setScaledIngredients(scaled);
    }
  }, [recipe]);

  // Update scaled ingredients when serving size changes
  useEffect(() => {
    if (recipe) {
      const scaled = scaleIngredients(recipe.ingredients, currentServings, recipe.defaultServings);
      setScaledIngredients(scaled);
    }
  }, [recipe, currentServings]);

  const handleServingsChange = (newServings: number) => {
    setCurrentServings(newServings);
  };

  // Direct shopping list creation for current serving size
  const [isCreatingShoppingList, setIsCreatingShoppingList] = useState(false);
  
  const handleAddToShoppingList = () => {
    if (!recipe || isCreatingShoppingList) return;

    setIsCreatingShoppingList(true);
    const servingsMultiplier = currentServings / recipe.defaultServings;
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
        message: `You have all ingredients for "${recipe.name}" (${currentServings} serving${currentServings !== 1 ? 's' : ''})! No shopping needed.`
      });
      setTimeout(() => setAlertMessage(null), 5000);
      return;
    }
    
    // Create new shopping list
    const now = new Date();
    const listName = `Shopping List - ${recipe.name} (${currentServings} serving${currentServings !== 1 ? 's' : ''}) - ${now.toLocaleDateString()} ${now.toLocaleTimeString()}.${now.getMilliseconds()}`;
    const tempId = addShoppingList({
      name: listName,
      items: shoppingListItems
    });
    
    // Show success notification
    setAlertMessage({
      type: 'success', 
      message: `Shopping list "${listName}" created with ${shoppingListItems.length} items!`
    });
    setTimeout(() => setAlertMessage(null), 3000);
    
    // Listen for the real ID and navigate to the shopping list
    const handleShoppingListCreated = (event: CustomEvent) => {
      if (event.detail.tempId === tempId) {
        setIsCreatingShoppingList(false);
        navigate(`/shopping_list_detail/${event.detail.realId}`);
        window.removeEventListener('shoppingListCreated', handleShoppingListCreated as EventListener);
        window.removeEventListener('shoppingListError', handleShoppingListError as EventListener);
      }
    };
    
    const handleShoppingListError = (event: CustomEvent) => {
      if (event.detail.tempId === tempId) {
        setIsCreatingShoppingList(false);
        setAlertMessage({
          type: 'error',
          message: 'Failed to create shopping list. Please try again.'
        });
        setTimeout(() => setAlertMessage(null), 5000);
        window.removeEventListener('shoppingListCreated', handleShoppingListCreated as EventListener);
        window.removeEventListener('shoppingListError', handleShoppingListError as EventListener);
      }
    };
    
    window.addEventListener('shoppingListCreated', handleShoppingListCreated as EventListener);
    window.addEventListener('shoppingListError', handleShoppingListError as EventListener);
    
    // Fallback navigation in case the event doesn't fire (shouldn't happen, but safety net)
    setTimeout(() => {
      window.removeEventListener('shoppingListCreated', handleShoppingListCreated as EventListener);
      window.removeEventListener('shoppingListError', handleShoppingListError as EventListener);
      // If we still haven't navigated by now, go back to shopping lists page
      navigate('/shopping_lists');
    }, 5000);
  };

  const handlePrepareClick = () => {
    if (!recipe) return;
    const validation = validateRecipePreparation(recipe, prepareServings);
    setPreparationValidation(validation);
    
    if (!validation.canPrepare) {
      setAlertMessage({
        type: 'error', 
        message: `Cannot prepare recipe: Missing ${validation.missingIngredients.length} ingredient${validation.missingIngredients.length !== 1 ? 's' : ''}`
      });
      setTimeout(() => setAlertMessage(null), 5000);
      return;
    }
    
    setShowPrepareModal(false);
    setShowConfirmationModal(true);
  };

  const handleConfirmPreparation = () => {
    if (!recipe) return;
    const result = deductIngredientsForPreparation(recipe, prepareServings);
    
    // Always close the modal first to ensure UI responsiveness
    setShowConfirmationModal(false);
    setPreparationValidation(null);
    
    if (result.success) {
      setAlertMessage({
        type: 'success', 
        message: `${recipe.name} prepared for ${prepareServings} servings! Ingredients deducted from inventory.`
      });
      
      // Navigate to dashboard after brief delay to show updated inventory
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } else {
      setAlertMessage({
        type: 'error', 
        message: `Preparation failed. ${result.errors.length} ingredient(s) could not be deducted: ${result.errors.join(', ')}`
      });
    }
    
    // Clear the alert message after 5 seconds
    setTimeout(() => setAlertMessage(null), 5000);
  };

  const handleEditRecipe = (updatedRecipe: Recipe) => {
    updateRecipe(updatedRecipe);
    setShowEditModal(false);
    setAlertMessage({
      type: 'success',
      message: 'Recipe updated successfully!'
    });
    setTimeout(() => setAlertMessage(null), 3000);
  };

  if (!recipe) {
    return ( 
      <div className="container mx-auto p-4 text-center">
        <EmptyState
            icon={<BookOpenIcon />}
            title="Recipe Not Found"
            message="The recipe you are looking for does not exist or may have been removed."
            actionButton={<Button onClick={() => navigate('/recipes')} variant="primary">Back to Recipes</Button>}
        />
      </div> 
    );
  }

  const { name, defaultServings, ingredients, instructions, sourceName, sourceUrl, prepTime, cookTime, tags, imageUrl } = recipe;

  return (
    <div className="container mx-auto p-4 lg:p-8">
      <Button onClick={() => navigate('/recipes')} variant="ghost" leftIcon={<ArrowLeftIcon />} className="mb-6">Back to Recipes</Button>
      {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />}
      <Card className="overflow-hidden">
        <div className="md:flex">
          <div className="md:flex-shrink-0">
            <img className="h-64 w-full object-cover md:w-64 md:h-auto" src={imageUrl || DEFAULT_RECIPE_IMAGE} alt={name} onError={(e) => (e.currentTarget.src = DEFAULT_RECIPE_IMAGE)}/>
          </div>
          <div className="p-6 md:p-8 flex-grow">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-3">{name}</h1>
            <div className="flex flex-wrap items-center text-sm text-gray-600 mb-4">
              {/* Replace static servings display with interactive selector */}
              <div className="mr-4">
                <ServingSizeSelector
                  defaultServings={defaultServings}
                  currentServings={currentServings}
                  onServingsChange={handleServingsChange}
                />
              </div>
              {prepTime && <span className="mr-4">Prep: {prepTime}</span>}
              {cookTime && <span className="mr-4">Cook: {cookTime}</span>}
            </div>

            {/* Inventory status indicator */}
            {inventoryAnalysis && (
              <div className="mb-4">
                {inventoryAnalysis.maxPossibleServings === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833-.23 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-red-700 font-medium">Missing ingredients</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      You don't have the required ingredients to make this recipe.
                    </p>
                  </div>
                ) : inventoryAnalysis.maxPossibleServings === Infinity ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">
                        Can make unlimited servings
                      </span>
                    </div>
                  </div>
                ) : !canPrepareCurrentServings ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833-.23 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-orange-700 font-medium">
                        Not enough ingredients for {currentServings} serving{currentServings !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-orange-600 mt-1">
                      You can make up to {inventoryAnalysis.maxPossibleServings} serving{inventoryAnalysis.maxPossibleServings !== 1 ? 's' : ''} with your current inventory.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">
                        Ready to cook {currentServings} serving{currentServings !== 1 ? 's' : ''}!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tags && tags.length > 0 && (
                <div className="mb-4">
                    {tags.map(tag => (
                    <span key={tag} className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 mr-2 mb-2">{tag}</span>
                    ))}
                </div>
            )}
            {sourceName && (
                 <p className="text-sm text-gray-500">
                 Source: {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{sourceName}</a> : sourceName}
               </p>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">Ingredients</h2>
              {/* Replace static ingredients list with scaled ingredients list */}
              <ScaledIngredientsList 
                ingredients={scaledIngredients}
                showMixedNumbers={true}
              />
            </div>
            <div className="md:col-span-2">
               <h2 className="text-xl font-semibold text-gray-700 mb-3">Instructions</h2>
              {/* Replace static instructions with interactive instructions */}
              <InteractiveInstructions
                instructions={instructions || "No instructions provided."}
                ingredients={ingredients}
                currentServings={currentServings}
                defaultServings={defaultServings}
              />
            </div>
          </div>
        </div>
         <div className="p-6 md:p-8 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowEditModal(true)}
                leftIcon={<PencilIcon className="w-4 h-4" />}
              >
                Edit Recipe
              </Button>
              <Button 
                variant="success" 
                onClick={() => { setPrepareServings(currentServings); setShowPrepareModal(true); }}
                leftIcon={<SparklesIcon />}
                disabled={!canPrepareCurrentServings}
                title={!canPrepareCurrentServings ? `Not enough ingredients for ${currentServings} serving${currentServings !== 1 ? 's' : ''}` : undefined}
              >
                Prepare this Recipe
              </Button>
              <Button 
                onClick={handleAddToShoppingList} 
                variant="secondary" 
                leftIcon={<ShoppingCartIcon className="w-5 h-5" />}
                className="flex-1"
                disabled={isCreatingShoppingList}
              >
                {isCreatingShoppingList ? 'Creating...' : 'Add to Shopping List'}
              </Button>
            </div>
          </div>
      </Card>
      <Modal isOpen={showPrepareModal} onClose={() => setShowPrepareModal(false)} title={`Prepare ${recipe.name}`}>
        <div className="space-y-4">
            <p>How many servings are you preparing?</p>
            <InputField 
                id="prepareServings"
                type="number"
                label="Servings"
                value={prepareServings}
                onChange={e => setPrepareServings(Math.max(1, parseInt(e.target.value)))}
                min="1"
            />
            <p className="text-sm text-gray-600">This will deduct the required ingredients from your inventory based on the selected servings.</p>
            <div className="flex justify-end space-x-2 pt-2">
                <Button variant="ghost" onClick={() => setShowPrepareModal(false)}>Cancel</Button>
                <Button variant="success" onClick={handlePrepareClick}>Confirm & Deduct</Button>
            </div>
        </div>
      </Modal>
      <Modal isOpen={showConfirmationModal} onClose={() => setShowConfirmationModal(false)} title={`Confirm Preparation`}>
        <div className="space-y-4">
          <p className="font-semibold">Preparing "{recipe.name}" for {prepareServings} serving{prepareServings !== 1 ? 's' : ''}</p>
          <p className="text-sm text-gray-600">The following ingredients will be deducted from your inventory:</p>
          
          {preparationValidation && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-gray-700">Ingredient Deductions:</h4>
              <ul className="space-y-2">
                {recipe.ingredients
                  .filter(ing => !ing.isOptional)
                  .map((ing, index) => {
                    const neededQuantity = (ing.quantity / recipe.defaultServings) * prepareServings;
                    return (
                      <li key={index} className="text-sm">
                        <span className="font-medium">{ing.ingredientName}:</span>{' '}
                        <span className="text-red-600">-{neededQuantity.toFixed(2)} {ing.unit}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="ghost" onClick={() => setShowConfirmationModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmPreparation}>Confirm Preparation</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Recipe Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Recipe" size="2xl">
        {recipe && (
          <RecipeForm 
            initialRecipe={recipe}
            onSave={(recipeData) => handleEditRecipe(recipeData as Recipe)} 
            onClose={() => setShowEditModal(false)} 
          />
        )}
      </Modal>
    </div>
  );
};

export default RecipeDetailPageAPI; 