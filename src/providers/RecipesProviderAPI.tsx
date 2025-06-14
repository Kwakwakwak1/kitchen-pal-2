import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Recipe, RecipesContextType } from '../../types';
import { recipesService } from '../services';
import { useToast } from './ToastProvider';
import { useAuthAPI } from './AuthProviderAPI';

const RecipesContext = createContext<RecipesContextType | undefined>(undefined);

interface RecipesProviderProps {
  children: ReactNode;
}

export const RecipesProviderAPI: React.FC<RecipesProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { currentUser, isLoadingAuth } = useAuthAPI();

  // Queries - only run when user is authenticated
  const { data: recipes = [] } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => recipesService.getRecipes(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!currentUser && !isLoadingAuth, // Only run when authenticated
  });

  // Mutations
  const addRecipeMutation = useMutation({
    mutationFn: (recipe: Omit<Recipe, 'id' | 'imageUrl'>) => recipesService.createRecipe(recipe),
    onSuccess: (newRecipe) => {
      queryClient.setQueryData(['recipes'], (oldRecipes: Recipe[] = []) => [
        ...oldRecipes,
        newRecipe
      ]);
    },
  });

  const updateRecipeMutation = useMutation({
    mutationFn: (recipe: Recipe) => recipesService.updateRecipe(recipe),
    onMutate: async (newRecipe) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['recipes'] });
      
      // Snapshot previous value
      const previousRecipes = queryClient.getQueryData(['recipes']);
      
      // Optimistically update
      queryClient.setQueryData(['recipes'], (old: Recipe[] = []) =>
        old.map(r => r.id === newRecipe.id ? newRecipe : r)
      );
      
      return { previousRecipes };
    },
    onError: (err, newRecipe, context) => {
      // Roll back to previous value
      if (context?.previousRecipes) {
        queryClient.setQueryData(['recipes'], context.previousRecipes);
      }
      console.error('Failed to update recipe:', newRecipe.name, err);
      console.error('Recipe data that failed:', newRecipe);
      
      // Show more specific error message if available
      const errorMessage = (err as any)?.message || 'Unknown error occurred';
      showToast('error', `Failed to update recipe "${newRecipe.name}": ${errorMessage}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
    onSuccess: (updatedRecipe) => {
      queryClient.setQueryData(['recipes'], (oldRecipes: Recipe[] = []) =>
        oldRecipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r)
      );
      showToast('success', `Recipe "${updatedRecipe.name}" updated successfully!`);
    },
  });

  const deleteRecipeMutation = useMutation({
    mutationFn: (recipeId: string) => recipesService.deleteRecipe(recipeId),
    onSuccess: (_, deletedRecipeId) => {
      queryClient.setQueryData(['recipes'], (oldRecipes: Recipe[] = []) =>
        oldRecipes.filter(r => r.id !== deletedRecipeId)
      );
    },
  });

  // Context methods
  const addRecipe = (recipe: Omit<Recipe, 'id' | 'imageUrl'>): void => {
    addRecipeMutation.mutate(recipe);
  };

  const updateRecipe = (recipe: Recipe): void => {
    updateRecipeMutation.mutate(recipe);
  };

  const deleteRecipe = (recipeId: string): void => {
    deleteRecipeMutation.mutate(recipeId);
  };

  const getRecipeById = (recipeId: string): Recipe | undefined => {
    return recipes.find(r => r.id === recipeId);
  };

  const contextValue: RecipesContextType = {
    recipes,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    getRecipeById,
  };

  return (
    <RecipesContext.Provider value={contextValue}>
      {children}
    </RecipesContext.Provider>
  );
};

export const useRecipes = (): RecipesContextType => {
  const context = useContext(RecipesContext);
  if (context === undefined) {
    throw new Error('useRecipes must be used within a RecipesProviderAPI');
  }
  return context;
};