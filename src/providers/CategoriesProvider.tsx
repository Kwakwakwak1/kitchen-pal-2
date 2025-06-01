import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ItemCategory, DEFAULT_CATEGORIES } from '../types'; // Adjusted path assuming types/index.ts exports these
import { generateId } from '../constants';
// import { useAuth } from './AuthProvider'; // Assuming AuthProvider exists and provides currentUser

// Dummy useAuth hook for now if AuthProvider is not yet implemented
const useAuth = () => ({ currentUser: { id: 'test-user' } }); // Replace with actual useAuth

export interface CategoriesContextType {
  categories: ItemCategory[];
  addCategory: (categoryData: Omit<ItemCategory, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'isDefault'> & { sortOrder?: number; isDefault?: boolean }) => string; // Returns new ID
  updateCategory: (category: ItemCategory) => void;
  deleteCategory: (categoryId: string, reassignToCategoryId?: string) => void;
  getCategoryById: (categoryId: string) => ItemCategory | undefined;
  getDefaultCategoryId: () => string | undefined;
  getCategoryByName: (name: string) => ItemCategory | undefined;
  reorderCategories: (orderedIds: string[]) => void;
  loading: boolean;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export const CategoriesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = useAuth();
  const storageKey = `categories_${currentUser?.id || 'anonymous'}`;

  useEffect(() => {
    setLoading(true);
    try {
      const storedCategories = localStorage.getItem(storageKey);
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      } else {
        const initialCategories: ItemCategory[] = DEFAULT_CATEGORIES.map((cat, index) => ({
          ...cat,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sortOrder: cat.sortOrder || index + 1, // Ensure sortOrder is set
          isDefault: cat.isDefault !== undefined ? cat.isDefault : false, // Ensure isDefault is set
        }));
        setCategories(initialCategories);
        localStorage.setItem(storageKey, JSON.stringify(initialCategories));
      }
    } catch (error) {
      console.error("Failed to load categories from localStorage", error);
      const initialCategories: ItemCategory[] = DEFAULT_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sortOrder: cat.sortOrder || index + 1,
        isDefault: cat.isDefault !== undefined ? cat.isDefault : false,
      }));
      setCategories(initialCategories);
      localStorage.setItem(storageKey, JSON.stringify(initialCategories));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, storageKey]); // Added storageKey to dependencies

  useEffect(() => {
    if (!loading && currentUser) { // Ensure not loading and user is available
      localStorage.setItem(storageKey, JSON.stringify(categories));
    }
  }, [categories, loading, currentUser, storageKey]); // Added storageKey & currentUser

  const addCategory = (categoryData: Omit<ItemCategory, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'isDefault'> & { sortOrder?: number; isDefault?: boolean }): string => {
    const newId = generateId();
    const now = new Date().toISOString();
    // Determine the next sortOrder
    const maxSortOrder = categories.reduce((max, cat) => Math.max(max, cat.sortOrder), 0);
    const newCategory: ItemCategory = {
      ...categoryData,
      id: newId,
      createdAt: now,
      updatedAt: now,
      sortOrder: categoryData.sortOrder || maxSortOrder + 1,
      isDefault: categoryData.isDefault || false,
    };
    setCategories(prev => [...prev, newCategory].sort((a,b) => a.sortOrder - b.sortOrder));
    return newId;
  };

  const updateCategory = (updatedCategory: ItemCategory) => {
    setCategories(prev =>
      prev.map(cat =>
        cat.id === updatedCategory.id
          ? { ...updatedCategory, updatedAt: new Date().toISOString() }
          : cat
      ).sort((a,b) => a.sortOrder - b.sortOrder)
    );
  };

  const deleteCategory = (categoryId: string, reassignToCategoryId?: string) => {
    // Basic deletion. Reassignment logic will be more complex and handled elsewhere.
    // Prevent deletion of 'Uncategorized' or the last default category.
    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    if (!categoryToDelete) return;

    if (categoryToDelete.name === 'Uncategorized') {
        alert("Cannot delete the 'Uncategorized' category.");
        return;
    }
    if (categoryToDelete.isDefault) {
        const defaultCategories = categories.filter(cat => cat.isDefault);
        if (defaultCategories.length <= 1) {
            alert("Cannot delete the last default category.");
            return;
        }
    }

    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    // TODO: Handle reassignment of items belonging to this category in InventoryProvider or via a callback.
    console.log(`Category ${categoryId} deleted. Items might need reassignment to ${reassignToCategoryId || 'Uncategorized'}`);
  };

  const getCategoryById = (categoryId: string): ItemCategory | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  const getCategoryByName = (name: string): ItemCategory | undefined => {
    return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());
  };

  const getDefaultCategoryId = (): string | undefined => {
    const defaultCategory = categories.find(cat => cat.isDefault === true);
    if (defaultCategory) return defaultCategory.id;
    const uncategorized = categories.find(cat => cat.name === 'Uncategorized');
    return uncategorized?.id;
  };

  const reorderCategories = (orderedIds: string[]) => {
    const reorderedCategories = orderedIds.map((id, index) => {
      const category = categories.find(cat => cat.id === id);
      if (category) {
        return { ...category, sortOrder: index + 1 };
      }
      return null;
    }).filter(Boolean) as ItemCategory[]; // Filter out nulls and assert type

    // Add any categories not in orderedIds back, maintaining their original relative order at the end
    const remainingCategories = categories
        .filter(cat => !orderedIds.includes(cat.id))
        .sort((a,b) => a.sortOrder - b.sortOrder);

    const finalCategories = [...reorderedCategories, ...remainingCategories].map((cat, index) => ({
        ...cat,
        sortOrder: index + 1 // Re-assign sortOrder for consistency
    }));

    setCategories(finalCategories);
  };

  const contextValue: CategoriesContextType = {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoryByName,
    getDefaultCategoryId,
    reorderCategories,
    loading,
  };

  return (
    <CategoriesContext.Provider value={contextValue}>
      {children}
    </CategoriesContext.Provider>
  );
};

export const useCategories = (): CategoriesContextType => {
  const context = useContext(CategoriesContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
};
