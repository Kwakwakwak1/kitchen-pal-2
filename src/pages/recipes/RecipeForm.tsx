import React, { useState, FormEvent } from 'react';
import { Recipe, RecipeIngredient, Unit } from '../../../types';
import { UNITS_ARRAY, PlusIcon, TrashIcon } from '../../../constants';
import { Button, InputField, TextAreaField, SelectField, CheckboxField } from '../../../components';
import { IngredientCorrectionButton, FixAllIngredientsButton } from '../../../components/IngredientCorrectionButton';
import { RecipeUrlImport } from './RecipeUrlImport';

// Recipe Form
interface RecipeFormProps {
  initialRecipe?: Recipe;
  onSave: (recipe: Omit<Recipe, 'id' | 'imageUrl'> | Recipe) => void;
  onClose: () => void;
}

const RecipeForm: React.FC<RecipeFormProps> = ({ initialRecipe, onSave, onClose }) => {
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [name, setName] = useState(initialRecipe?.name || '');
  const [defaultServings, setDefaultServings] = useState(initialRecipe?.defaultServings || 4);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(initialRecipe?.ingredients || [{ ingredientName: '', quantity: 1, unit: Unit.PIECE, isOptional: false }]);
  const [instructions, setInstructions] = useState(initialRecipe?.instructions || '');
  const [sourceName, setSourceName] = useState(initialRecipe?.sourceName || '');
  const [sourceUrl, setSourceUrl] = useState(initialRecipe?.sourceUrl || '');
  const [prepTime, setPrepTime] = useState(initialRecipe?.prepTime || '');
  const [cookTime, setCookTime] = useState(initialRecipe?.cookTime || '');
  const [tags, setTags] = useState(initialRecipe?.tags?.join(', ') || '');

  const handleIngredientChange = <K extends keyof RecipeIngredient>(index: number, field: K, value: RecipeIngredient[K]) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const handleIngredientFix = (index: number, fixedIngredient: RecipeIngredient) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = fixedIngredient;
    setIngredients(newIngredients);
  };

  const handleFixAll = (fixedIngredients: RecipeIngredient[]) => {
    setIngredients(fixedIngredients);
  };

  const addIngredientField = () => setIngredients([...ingredients, { ingredientName: '', quantity: 1, unit: Unit.PIECE, isOptional: false }]);
  const removeIngredientField = (index: number) => setIngredients(ingredients.filter((_, i) => i !== index));

  const handleUrlImport = (importedRecipe: Omit<Recipe, 'id' | 'imageUrl'>) => {
    // Populate form fields with imported data
    setName(importedRecipe.name);
    setDefaultServings(importedRecipe.defaultServings);
    setIngredients(importedRecipe.ingredients);
    setInstructions(importedRecipe.instructions);
    setSourceName(importedRecipe.sourceName || '');
    setSourceUrl(importedRecipe.sourceUrl || '');
    setPrepTime(importedRecipe.prepTime || '');
    setCookTime(importedRecipe.cookTime || '');
    setTags(importedRecipe.tags?.join(', ') || '');
    
    // Hide URL import section
    setShowUrlImport(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const recipeData = {
      name,
      defaultServings: Number(defaultServings),
      ingredients: ingredients.filter(ing => ing.ingredientName.trim() !== ''),
      instructions,
      sourceName,
      sourceUrl,
      prepTime,
      cookTime,
      tags: tags.split(',').map(t => t.trim()).filter(t => t !== ''),
    };
    if (initialRecipe) {
      onSave({ ...initialRecipe, ...recipeData });
    } else {
      onSave(recipeData);
    }
    onClose();
  };

  // Don't show URL import for editing existing recipes
  const canShowUrlImport = !initialRecipe;

  return (
    <div className="space-y-4">
      {/* URL Import Toggle - only show for new recipes */}
      {canShowUrlImport && (
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium">Add Recipe</h3>
            <p className="text-sm text-gray-500">Create manually or import from a URL</p>
          </div>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant={!showUrlImport ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowUrlImport(false)}
            >
              Manual Entry
            </Button>
            <Button
              type="button"
              variant={showUrlImport ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowUrlImport(true)}
            >
              Import from URL
            </Button>
          </div>
        </div>
      )}

      {/* URL Import Component */}
      {showUrlImport && canShowUrlImport && (
        <RecipeUrlImport
          onImport={handleUrlImport}
          onCancel={() => setShowUrlImport(false)}
        />
      )}

      {/* Manual Recipe Form */}
      {!showUrlImport && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Recipe Name" id="recipeName" value={name} onChange={e => setName(e.target.value)} required />
          <InputField label="Default Servings" id="defaultServings" type="number" value={defaultServings} onChange={e => setDefaultServings(Number(e.target.value))} min="1" required />
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Ingredients</label>
              <FixAllIngredientsButton
                ingredients={ingredients}
                onFixAll={handleFixAll}
              />
            </div>
            {ingredients.map((ing, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                <div className="col-span-1 flex items-end pb-2.5">
                  <IngredientCorrectionButton
                    ingredient={ing}
                    onFix={(fixedIngredient) => handleIngredientFix(index, fixedIngredient)}
                  />
                </div>
                <InputField containerClassName="col-span-4" placeholder="Ingredient Name" value={ing.ingredientName} onChange={e => handleIngredientChange(index, 'ingredientName', e.target.value)} aria-label={`Ingredient name ${index + 1}`} />
                <InputField containerClassName="col-span-2" type="number" placeholder="Qty" value={ing.quantity} onChange={e => handleIngredientChange(index, 'quantity', Number(e.target.value))} min="0" step="any" aria-label={`Ingredient quantity ${index + 1}`} />
                <SelectField containerClassName="col-span-2" options={UNITS_ARRAY.map(u => ({value: u, label: u}))} value={ing.unit} onChange={e => handleIngredientChange(index, 'unit', e.target.value as Unit)} aria-label={`Ingredient unit ${index + 1}`} />
                <CheckboxField containerClassName="col-span-2 justify-self-start self-end pb-2.5" id={`optional-${index}`} label="Optional" checked={ing.isOptional || false} onChange={e => handleIngredientChange(index, 'isOptional', e.target.checked)} />
                <div className="col-span-1 flex items-end pb-2.5">
                  <Button type="button" variant="danger" size="sm" onClick={() => removeIngredientField(index)} className="p-1.5" aria-label={`Remove ingredient ${index + 1}`}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addIngredientField} leftIcon={<PlusIcon className="w-4 h-4"/>}>Add Ingredient</Button>
          </div>

          <TextAreaField label="Instructions" id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} />
          <InputField label="Source Name (Optional)" id="sourceName" value={sourceName} onChange={e => setSourceName(e.target.value)} />
          <InputField label="Source URL (Optional)" id="sourceUrl" type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} />
          <InputField label="Prep Time (e.g., 30 mins)" id="prepTime" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
          <InputField label="Cook/Total Time (e.g., 1 hour)" id="cookTime" value={cookTime} onChange={e => setCookTime(e.target.value)} />
          <InputField label="Tags (comma-separated)" id="tags" value={tags} onChange={e => setTags(e.target.value)} />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">Save Recipe</Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default RecipeForm;