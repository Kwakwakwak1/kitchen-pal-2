import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Recipe, RecipesContextType } from '../../types';
import { generateId } from '../../constants';
import { useAuth } from './AuthProvider';

const RecipesContext = createContext<RecipesContextType | undefined>(undefined);

interface RecipesProviderProps {
  children: ReactNode;
}

export const RecipesProvider: React.FC<RecipesProviderProps> = ({ children }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const { currentUser } = useAuth();

  const getStorageKey = () => `recipes_${currentUser?.id || 'anonymous'}`;

  // Load recipes from localStorage when user changes
  useEffect(() => {
    if (currentUser) {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setRecipes(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading recipes from localStorage:', error);
          setRecipes([]);
        }
      } else {
        setRecipes([]);
      }
    } else {
      setRecipes([]);
    }
  }, [currentUser]);

  // Save recipes to localStorage whenever they change
  useEffect(() => {
    if (currentUser) {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(recipes));
    }
  }, [recipes, currentUser]);

  const addRecipe = (recipe: Omit<Recipe, 'id' | 'imageUrl'>): void => {
    const newRecipe: Recipe = {
      id: generateId(),
      imageUrl: undefined,
      ...recipe,
    };
    setRecipes(prev => [...prev, newRecipe]);
  };

  const updateRecipe = (recipe: Recipe): void => {
    setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r));
  };

  const deleteRecipe = (recipeId: string): void => {
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
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
    throw new Error('useRecipes must be used within a RecipesProvider');
  }
  return context;
}; 