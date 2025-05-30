import React, { useState } from 'react';
import { scrapeRecipeFromUrl, validateRecipeUrl } from '../services/recipeScrapingService';
import { normalizeScrapedRecipe, validateNormalizedRecipe } from '../utils/recipeNormalizer';
import type { ScrapedRecipeData, Recipe } from '../types';

// We'll need these icons - assuming they exist in the parent file or can be imported
interface IconProps {
  className?: string;
}

// These components should exist in the parent application
declare const Button: React.FC<{
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}>;

declare const InputField: React.FC<{
  label?: string;
  id?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}>;

declare const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
}>;

interface RecipeUrlImportProps {
  onImport: (recipe: Omit<Recipe, 'id' | 'imageUrl'>) => void;
  onCancel: () => void;
}

interface ImportState {
  status: 'idle' | 'loading' | 'success' | 'error' | 'preview';
  data?: ScrapedRecipeData;
  normalizedData?: Omit<Recipe, 'id' | 'imageUrl'>;
  error?: string;
  warnings?: string[];
}

export const RecipeUrlImport: React.FC<RecipeUrlImportProps> = ({ onImport, onCancel }) => {
  const [url, setUrl] = useState('');
  const [importState, setImportState] = useState<ImportState>({ status: 'idle' });

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    // Reset state when URL changes
    if (importState.status !== 'idle') {
      setImportState({ status: 'idle' });
    }
  };

  const handleImport = async () => {
    if (!url.trim()) return;

    // Validate URL format first
    const validation = validateRecipeUrl(url.trim());
    if (!validation.isValid) {
      setImportState({
        status: 'error',
        error: validation.error
      });
      return;
    }

    setImportState({ status: 'loading' });

    try {
      const result = await scrapeRecipeFromUrl(url.trim());
      
      if (!result.success) {
        setImportState({
          status: 'error',
          error: result.error,
          warnings: result.warnings
        });
        return;
      }

      // Normalize the scraped data
      const normalizedData = normalizeScrapedRecipe(result.data!);
      
      // Validate the normalized data
      const validation = validateNormalizedRecipe(normalizedData);
      if (!validation.isValid) {
        setImportState({
          status: 'error',
          error: `Recipe validation failed: ${validation.errors.join(', ')}`,
          data: result.data
        });
        return;
      }

      setImportState({
        status: 'preview',
        data: result.data,
        normalizedData,
        warnings: result.warnings
      });

    } catch (error) {
      setImportState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  };

  const handleConfirmImport = () => {
    if (importState.normalizedData) {
      onImport(importState.normalizedData);
    }
  };

  const handleRetry = () => {
    setImportState({ status: 'idle' });
  };

  return (
    <div className="space-y-4">
      {/* URL Input Section */}
      <div>
        <InputField
          label="Recipe URL"
          id="recipeUrl"
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://example.com/recipe"
          required
          disabled={importState.status === 'loading'}
          error={importState.status === 'error' ? importState.error : undefined}
        />
        <p className="text-sm text-gray-500 mt-1">
          Enter the URL of a recipe page from any cooking website
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="primary"
          onClick={handleImport}
          disabled={!url.trim() || importState.status === 'loading'}
        >
          {importState.status === 'loading' ? 'Importing...' : 'Import Recipe'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={importState.status === 'loading'}
        >
          Cancel
        </Button>
        {importState.status === 'error' && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleRetry}
          >
            Try Again
          </Button>
        )}
      </div>

      {/* Loading State */}
      {importState.status === 'loading' && (
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div>
              <p className="font-medium">Importing recipe...</p>
              <p className="text-sm text-gray-500">This may take a few seconds</p>
            </div>
          </div>
        </Card>
      )}

      {/* Error State */}
      {importState.status === 'error' && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="w-5 h-5 text-red-400">⚠️</div>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Import Failed</h3>
              <p className="text-sm text-red-700 mt-1">{importState.error}</p>
              {importState.warnings && importState.warnings.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-800">Warnings:</p>
                  <ul className="text-sm text-red-700 list-disc list-inside">
                    {importState.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Preview State */}
      {importState.status === 'preview' && importState.normalizedData && (
        <Card className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-green-800">Recipe Found!</h3>
              <span className="text-sm text-green-600">✓ Ready to import</span>
            </div>
            
            {/* Recipe Preview */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div>
                <h4 className="font-semibold text-lg">{importState.normalizedData.name}</h4>
                {importState.normalizedData.sourceName && (
                  <p className="text-sm text-gray-600">From: {importState.normalizedData.sourceName}</p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Servings:</span> {importState.normalizedData.defaultServings}
                </div>
                {importState.normalizedData.prepTime && (
                  <div>
                    <span className="font-medium">Prep Time:</span> {importState.normalizedData.prepTime}
                  </div>
                )}
                {importState.normalizedData.cookTime && (
                  <div>
                    <span className="font-medium">Cook Time:</span> {importState.normalizedData.cookTime}
                  </div>
                )}
                <div>
                  <span className="font-medium">Ingredients:</span> {importState.normalizedData.ingredients.length}
                </div>
              </div>

              {importState.normalizedData.tags && importState.normalizedData.tags.length > 0 && (
                <div>
                  <span className="font-medium text-sm">Tags: </span>
                  {importState.normalizedData.tags.map(tag => (
                    <span key={tag} className="inline-block bg-gray-200 rounded px-2 py-0.5 text-xs mr-1">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Warnings */}
            {importState.warnings && importState.warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                <p className="text-sm font-medium text-yellow-800">Note:</p>
                <ul className="text-sm text-yellow-700 list-disc list-inside mt-1">
                  {importState.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmImport}
              >
                Import This Recipe
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleRetry}
              >
                Try Different URL
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}; 