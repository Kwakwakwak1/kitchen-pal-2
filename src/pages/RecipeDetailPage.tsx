import React, { useState, useMemo } from 'react';
import { useAppState } from '../providers/AppStateProvider';
import { useRecipes } from '../providers/RecipesProvider';
import { useInventory } from '../providers/InventoryProvider';
import { Button, Card, InputField, TextAreaField, SelectField, Alert, IngredientTooltip } from '../components/ui';
import { RecipeUrlImport } from './recipes/RecipeUrlImport';
import { RecipePreparationMode } from '../components/recipe/RecipePreparationMode';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon, 
  PlusIcon, 
  MinusIcon,
  ClockIcon,
  UsersIcon,
  TagIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { Recipe, RecipeIngredient, Unit } from '../../types';
import { recipeFormSchema, RecipeFormData } from '../forms/RecipeFormSchema';

export const RecipeDetailPage: React.FC = () => {
  const { viewParams, setActiveView } = useAppState();
  const { updateRecipe, addRecipe, deleteRecipe, getRecipeById } = useRecipes();
  const { inventory } = useInventory();
  
  const recipeId = viewParams.id;
  const mode = viewParams.mode as 'view' | 'edit' | 'add' | 'cooking';
  
  const recipe = recipeId ? getRecipeById(recipeId) : undefined;
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'add');
  const [isCooking, setIsCooking] = useState(mode === 'cooking');
  const [currentServings, setCurrentServings] = useState(recipe?.defaultServings || 4);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Form state for editing
  const [formData, setFormData] = useState<RecipeFormData>(() => {
    if (recipe) {
      return {
        name: recipe.name,
        defaultServings: recipe.defaultServings,
        ingredients: recipe.ingredients.map(ing => ({ ...ing, isOptional: ing.isOptional || false })),
        instructions: recipe.instructions,
        sourceName: recipe.sourceName || '',
        sourceUrl: recipe.sourceUrl || '',
        prepTime: recipe.prepTime || '',
        cookTime: recipe.cookTime || '',
        tags: recipe.tags || []
      };
    }
    return {
      name: '',
      defaultServings: 4,
      ingredients: [],
      instructions: '',
      sourceName: '',
      sourceUrl: '',
      prepTime: '',
      cookTime: '',
      tags: []
    };
  });

  // Calculate scaled ingredients based on current servings
  const scaledIngredients = useMemo(() => {
    if (!recipe) return [];
    const scaleFactor = currentServings / recipe.defaultServings;
    return recipe.ingredients.map(ingredient => ({
      ...ingredient,
      scaledQuantity: ingredient.quantity * scaleFactor
    }));
  }, [recipe, currentServings]);

  // Basic inventory analysis
  const inventoryAnalysis = useMemo(() => {
    if (!recipe) return null;
    
    const analysis = {
      totalIngredients: scaledIngredients.length,
      availableIngredients: 0,
      missingIngredients: [] as Array<{name: string, needed: number, unit: string}>,
      hasAllIngredients: true
    };

    scaledIngredients.forEach(ingredient => {
      const inventoryItem = inventory.find(item => 
        item.ingredientName.toLowerCase() === ingredient.ingredientName.toLowerCase()
      );
      
      if (inventoryItem && inventoryItem.quantity >= ingredient.scaledQuantity) {
        analysis.availableIngredients++;
      } else {
        analysis.hasAllIngredients = false;
        analysis.missingIngredients.push({
          name: ingredient.ingredientName,
          needed: ingredient.scaledQuantity,
          unit: ingredient.unit
        });
      }
    });

    return analysis;
  }, [scaledIngredients, inventory]);

  const handleBack = () => {
    setActiveView('recipes');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleStartCooking = () => {
    setIsCooking(true);
  };

  const handleExitCooking = () => {
    setIsCooking(false);
  };

  const handleCookingComplete = () => {
    setIsCooking(false);
    setAlertMessage({ type: 'success', message: `Successfully completed cooking ${recipe?.name}!` });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  const handleCancelEdit = () => {
    if (mode === 'add') {
      handleBack();
    } else {
      setIsEditing(false);
      // Reset form data
      if (recipe) {
        setFormData({
          name: recipe.name,
          defaultServings: recipe.defaultServings,
          ingredients: recipe.ingredients.map(ing => ({ ...ing, isOptional: ing.isOptional || false })),
          instructions: recipe.instructions,
          sourceName: recipe.sourceName || '',
          sourceUrl: recipe.sourceUrl || '',
          prepTime: recipe.prepTime || '',
          cookTime: recipe.cookTime || '',
          tags: recipe.tags || []
        });
      }
    }
  };

  const handleSave = () => {
    try {
      const validatedData = recipeFormSchema.parse(formData);
      
      if (mode === 'add') {
        addRecipe(validatedData);
        setAlertMessage({ type: 'success', message: 'Recipe created successfully!' });
        setTimeout(() => setActiveView('recipes'), 1500);
      } else if (recipe) {
        updateRecipe({ ...recipe, ...validatedData });
        setAlertMessage({ type: 'success', message: 'Recipe updated successfully!' });
        setIsEditing(false);
      }
    } catch (error) {
      setAlertMessage({ 
        type: 'error', 
        message: 'Please check all required fields and try again.' 
      });
    }
  };

  const handleDelete = () => {
    if (recipe) {
      deleteRecipe(recipe.id);
      setAlertMessage({ type: 'success', message: 'Recipe deleted successfully!' });
      setTimeout(() => setActiveView('recipes'), 1500);
    }
  };

  const handleUrlImport = (importedRecipe: Omit<Recipe, 'id' | 'imageUrl'>) => {
    const normalizedRecipe = {
      ...importedRecipe,
      ingredients: importedRecipe.ingredients.map(ing => ({ ...ing, isOptional: ing.isOptional || false }))
    };
    setFormData(normalizedRecipe);
    setShowUrlImport(false);
    setAlertMessage({ type: 'success', message: 'Recipe imported successfully!' });
  };

  const addIngredient = () => {
    setFormData((prev: RecipeFormData) => ({
      ...prev,
      ingredients: [...prev.ingredients, { ingredientName: '', quantity: 1, unit: Unit.PIECE, isOptional: false }]
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData((prev: RecipeFormData) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_: RecipeIngredient, i: number) => i !== index)
    }));
  };

  const updateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    setFormData((prev: RecipeFormData) => ({
      ...prev,
      ingredients: prev.ingredients.map((ingredient: RecipeIngredient, i: number) => 
        i === index ? { ...ingredient, [field]: value } : ingredient
      )
    }));
  };

  if (mode === 'add' && !isEditing) {
    setIsEditing(true);
  }

  if (!recipe && mode !== 'add') {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Recipe Not Found</h2>
          <Button onClick={handleBack} variant="primary">
            Back to Recipes
          </Button>
        </div>
      </div>
    );
  }

  // Render cooking mode
  if (isCooking && recipe) {
    return (
      <RecipePreparationMode
        recipe={recipe}
        servings={currentServings}
        onExit={handleExitCooking}
        onComplete={handleCookingComplete}
      />
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {alertMessage && (
        <Alert 
          type={alertMessage.type} 
          message={alertMessage.message} 
          onClose={() => setAlertMessage(null)} 
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={handleBack}
            variant="outline"
            leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
          >
            Back to Recipes
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">
            {mode === 'add' ? 'Add New Recipe' : isEditing ? 'Edit Recipe' : recipe?.name}
          </h1>
        </div>

        {!isEditing && recipe && (
          <div className="flex gap-2">
            <Button
              onClick={handleStartCooking}
              variant="primary"
              leftIcon={<PlayIcon className="w-4 h-4" />}
            >
              Start Cooking
            </Button>
            <Button
              onClick={handleEdit}
              variant="outline"
              leftIcon={<PencilIcon className="w-4 h-4" />}
            >
              Edit
            </Button>
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="outline"
              leftIcon={<TrashIcon className="w-4 h-4" />}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        )}
      </div>

      {isEditing ? (
        /* Edit Mode */
        <div className="space-y-6">
          {/* URL Import Option */}
          {mode === 'add' && !showUrlImport && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-blue-800">Import from URL</h3>
                  <p className="text-sm text-blue-600">Have a recipe URL? Import it automatically!</p>
                </div>
                <Button
                  onClick={() => setShowUrlImport(true)}
                  variant="primary"
                  size="sm"
                >
                  Import URL
                </Button>
              </div>
            </Card>
          )}

          {showUrlImport && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Import Recipe from URL</h3>
              <RecipeUrlImport
                onImport={handleUrlImport}
                onCancel={() => setShowUrlImport(false)}
              />
            </Card>
          )}

          {/* Basic Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Recipe Name"
                value={formData.name}
                onChange={(value: string) => setFormData((prev: RecipeFormData) => ({ ...prev, name: value }))}
                placeholder="Enter recipe name"
                required
              />
              <InputField
                label="Default Servings"
                type="number"
                value={formData.defaultServings}
                onChange={(value: string) => setFormData((prev: RecipeFormData) => ({ ...prev, defaultServings: parseInt(value) || 1 }))}
                min="1"
                max="50"
                required
              />
              <InputField
                label="Prep Time"
                value={formData.prepTime}
                onChange={(value: string) => setFormData((prev: RecipeFormData) => ({ ...prev, prepTime: value }))}
                placeholder="e.g., 30 minutes"
              />
              <InputField
                label="Cook Time"
                value={formData.cookTime}
                onChange={(value: string) => setFormData((prev: RecipeFormData) => ({ ...prev, cookTime: value }))}
                placeholder="e.g., 1 hour"
              />
              <InputField
                label="Source Name"
                value={formData.sourceName}
                onChange={(value: string) => setFormData((prev: RecipeFormData) => ({ ...prev, sourceName: value }))}
                placeholder="e.g., Food Network"
              />
              <InputField
                label="Source URL"
                value={formData.sourceUrl}
                onChange={(value: string) => setFormData((prev: RecipeFormData) => ({ ...prev, sourceUrl: value }))}
                placeholder="https://..."
              />
            </div>
          </Card>

          {/* Ingredients */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Ingredients</h3>
              <Button
                onClick={addIngredient}
                variant="outline"
                size="sm"
                leftIcon={<PlusIcon className="w-4 h-4" />}
              >
                Add Ingredient
              </Button>
            </div>
            <div className="space-y-3">
              {formData.ingredients.map((ingredient: RecipeIngredient, index: number) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <InputField
                      label={index === 0 ? "Ingredient" : ""}
                      value={ingredient.ingredientName}
                      onChange={(value: string) => updateIngredient(index, 'ingredientName', value)}
                      placeholder="Ingredient name"
                    />
                  </div>
                  <div className="col-span-2">
                    <InputField
                      label={index === 0 ? "Quantity" : ""}
                      type="number"
                      value={ingredient.quantity}
                      onChange={(value: string) => updateIngredient(index, 'quantity', parseFloat(value) || 0)}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div className="col-span-2">
                    <SelectField
                      label={index === 0 ? "Unit" : ""}
                      value={ingredient.unit}
                      onChange={(value: string) => updateIngredient(index, 'unit', value as Unit)}
                      options={Object.values(Unit).map(unit => ({ value: unit, label: unit || 'none' }))}
                    />
                  </div>
                  <div className="col-span-2 flex items-center">
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={ingredient.isOptional || false}
                        onChange={(e) => updateIngredient(index, 'isOptional', e.target.checked)}
                        className="mr-1"
                      />
                      Optional
                    </label>
                  </div>
                  <div className="col-span-1">
                    <Button
                      onClick={() => removeIngredient(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <MinusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Instructions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Instructions</h3>
            <TextAreaField
              value={formData.instructions}
              onChange={(value: string) => setFormData((prev: RecipeFormData) => ({ ...prev, instructions: value }))}
              placeholder="Enter cooking instructions... (Each line will become a step in cooking mode)"
              rows={8}
              required
            />
            <p className="text-sm text-gray-500 mt-2">
              💡 Tip: Write each instruction step on a new line. Include time estimates like "Cook for 15 minutes" for automatic timer suggestions.
            </p>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button onClick={handleCancelEdit} variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSave} variant="primary">
              {mode === 'add' ? 'Create Recipe' : 'Save Changes'}
            </Button>
          </div>
        </div>
      ) : (
        /* View Mode */
        recipe && (
          <div className="space-y-6">
            {/* Recipe Header */}
            <Card className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">{recipe.name}</h2>
                  {recipe.sourceName && (
                    <p className="text-gray-600">
                      Source: {recipe.sourceUrl ? (
                        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {recipe.sourceName}
                        </a>
                      ) : recipe.sourceName}
                    </p>
                  )}
                  
                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
                    {recipe.prepTime && (
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        Prep: {recipe.prepTime}
                      </div>
                    )}
                    {recipe.cookTime && (
                      <div className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        Cook: {recipe.cookTime}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <UsersIcon className="w-4 h-4" />
                      Serves: {recipe.defaultServings}
                    </div>
                  </div>

                  {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {recipe.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
                          <TagIcon className="w-3 h-3" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Serving Size Adjuster */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-3">Adjust Servings</h4>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => setCurrentServings(Math.max(1, currentServings - 1))}
                      variant="outline"
                      size="sm"
                    >
                      <MinusIcon className="w-4 h-4" />
                    </Button>
                    <span className="text-lg font-semibold min-w-[3rem] text-center">
                      {currentServings}
                    </span>
                    <Button
                      onClick={() => setCurrentServings(currentServings + 1)}
                      variant="outline"
                      size="sm"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Original: {recipe.defaultServings} servings
                  </p>
                  
                  {/* Quick Start Cooking Button */}
                  <Button
                    onClick={handleStartCooking}
                    variant="primary"
                    size="sm"
                    leftIcon={<PlayIcon className="w-3 h-3" />}
                    className="w-full mt-3"
                  >
                    Start Cooking
                  </Button>
                </div>
              </div>
            </Card>

            {/* Inventory Analysis */}
            {inventoryAnalysis && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Inventory Check</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {inventoryAnalysis.availableIngredients}
                    </div>
                    <div className="text-sm text-gray-600">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {inventoryAnalysis.missingIngredients.length}
                    </div>
                    <div className="text-sm text-gray-600">Missing</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${inventoryAnalysis.hasAllIngredients ? 'text-green-600' : 'text-yellow-600'}`}>
                      {inventoryAnalysis.hasAllIngredients ? '✓' : '⚠'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {inventoryAnalysis.hasAllIngredients ? 'Ready to Cook' : 'Need Shopping'}
                    </div>
                  </div>
                </div>
                
                {inventoryAnalysis.missingIngredients.length > 0 && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-medium text-yellow-800 mb-2">Missing Ingredients:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      {inventoryAnalysis.missingIngredients.map((item, index) => (
                        <li key={index}>
                          {item.needed} {item.unit} {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            )}

            {/* Ingredients */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Ingredients {currentServings !== recipe.defaultServings && `(for ${currentServings} servings)`}
              </h3>
              <ul className="space-y-2">
                {scaledIngredients.map((ingredient, index) => (
                  <li key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <IngredientTooltip
                      ingredient={ingredient}
                      scaledQuantity={ingredient.scaledQuantity}
                      scaledUnit={ingredient.unit}
                      isOptional={ingredient.isOptional || false}
                      trigger="hover"
                    >
                      <span className={ingredient.isOptional ? 'text-gray-600 italic cursor-help' : 'text-gray-800 cursor-help'}>
                        {ingredient.ingredientName}
                        {ingredient.isOptional && ' (optional)'}
                      </span>
                    </IngredientTooltip>
                    <span className="font-medium text-gray-700">
                      {ingredient.scaledQuantity} {ingredient.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Instructions */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Instructions</h3>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {recipe.instructions}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button
                  onClick={handleStartCooking}
                  variant="primary"
                  leftIcon={<PlayIcon className="w-4 h-4" />}
                >
                  Start Step-by-Step Cooking Mode
                </Button>
              </div>
            </Card>
          </div>
        )
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Delete Recipe</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{recipe?.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setShowDeleteModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                variant="primary"
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetailPage; 