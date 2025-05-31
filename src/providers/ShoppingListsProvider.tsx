import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ShoppingList, ShoppingListsContextType, ShoppingListStatus } from '../../types';
import { generateId } from '../../constants';
import { useAuth } from './AuthProvider';

const ShoppingListsContext = createContext<ShoppingListsContextType | undefined>(undefined);

interface ShoppingListsProviderProps {
  children: ReactNode;
}

export const ShoppingListsProvider: React.FC<ShoppingListsProviderProps> = ({ children }) => {
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [archivedShoppingLists, setArchivedShoppingLists] = useState<ShoppingList[]>([]);
  const { currentUser } = useAuth();

  const getStorageKey = () => `shoppingLists_${currentUser?.id || 'anonymous'}`;
  const getArchivedStorageKey = () => `archivedShoppingLists_${currentUser?.id || 'anonymous'}`;

  // Load shopping lists from localStorage when user changes
  useEffect(() => {
    if (currentUser) {
      const storageKey = getStorageKey();
      const archivedStorageKey = getArchivedStorageKey();
      
      // Load active shopping lists
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setShoppingLists(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading shopping lists from localStorage:', error);
          setShoppingLists([]);
        }
      } else {
        setShoppingLists([]);
      }

      // Load archived shopping lists
      const archivedStored = localStorage.getItem(archivedStorageKey);
      if (archivedStored) {
        try {
          setArchivedShoppingLists(JSON.parse(archivedStored));
        } catch (error) {
          console.error('Error loading archived shopping lists from localStorage:', error);
          setArchivedShoppingLists([]);
        }
      } else {
        setArchivedShoppingLists([]);
      }
    } else {
      setShoppingLists([]);
      setArchivedShoppingLists([]);
    }
  }, [currentUser]);

  // Save shopping lists to localStorage whenever they change
  useEffect(() => {
    if (currentUser) {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(shoppingLists));
    }
  }, [shoppingLists, currentUser]);

  // Save archived shopping lists to localStorage whenever they change
  useEffect(() => {
    if (currentUser) {
      const archivedStorageKey = getArchivedStorageKey();
      localStorage.setItem(archivedStorageKey, JSON.stringify(archivedShoppingLists));
    }
  }, [archivedShoppingLists, currentUser]);

  const addShoppingList = (list: Omit<ShoppingList, 'id' | 'createdAt' | 'status'>): string => {
    const newList: ShoppingList = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      status: ShoppingListStatus.ACTIVE,
      ...list,
    };
    setShoppingLists(prev => [...prev, newList]);
    return newList.id;
  };

  const updateShoppingList = (list: ShoppingList): void => {
    setShoppingLists(prev => prev.map(l => l.id === list.id ? list : l));
  };

  const deleteShoppingList = (listId: string): void => {
    setShoppingLists(prev => prev.filter(l => l.id !== listId));
  };

  const archiveShoppingList = (listId: string): void => {
    const listToArchive = shoppingLists.find(list => list.id === listId);
    if (listToArchive) {
      const archivedList: ShoppingList = {
        ...listToArchive,
        status: ShoppingListStatus.ARCHIVED,
        archivedAt: new Date().toISOString(),
        completedAt: listToArchive.completedAt || new Date().toISOString(),
      };
      
      setArchivedShoppingLists(prev => [...prev, archivedList]);
      setShoppingLists(prev => prev.filter(l => l.id !== listId));
    }
  };

  const unarchiveShoppingList = (listId: string): void => {
    const listToUnarchive = archivedShoppingLists.find(list => list.id === listId);
    if (listToUnarchive) {
      const unarchivedList: ShoppingList = {
        ...listToUnarchive,
        status: ShoppingListStatus.ACTIVE,
        archivedAt: undefined,
      };
      
      setShoppingLists(prev => [...prev, unarchivedList]);
      setArchivedShoppingLists(prev => prev.filter(l => l.id !== listId));
    }
  };

  const deleteArchivedShoppingList = (listId: string): void => {
    setArchivedShoppingLists(prev => prev.filter(l => l.id !== listId));
  };

  const getShoppingListById = (listId: string): ShoppingList | undefined => {
    return shoppingLists.find(l => l.id === listId) || 
           archivedShoppingLists.find(l => l.id === listId);
  };

  const bulkDeleteShoppingLists = (listIds: string[]): void => {
    setShoppingLists(prev => prev.filter(l => !listIds.includes(l.id)));
  };

  const bulkArchiveShoppingLists = (listIds: string[]): void => {
    const listsToArchive = shoppingLists.filter(list => listIds.includes(list.id));
    const archivedLists = listsToArchive.map(list => ({
      ...list,
      status: ShoppingListStatus.ARCHIVED,
      archivedAt: new Date().toISOString(),
      completedAt: list.completedAt || new Date().toISOString(),
    }));
    
    setArchivedShoppingLists(prev => [...prev, ...archivedLists]);
    setShoppingLists(prev => prev.filter(l => !listIds.includes(l.id)));
  };

  const bulkDeleteArchivedShoppingLists = (listIds: string[]): void => {
    setArchivedShoppingLists(prev => prev.filter(l => !listIds.includes(l.id)));
  };

  const contextValue: ShoppingListsContextType = {
    shoppingLists,
    archivedShoppingLists,
    addShoppingList,
    updateShoppingList,
    deleteShoppingList,
    archiveShoppingList,
    unarchiveShoppingList,
    deleteArchivedShoppingList,
    getShoppingListById,
    bulkDeleteShoppingLists,
    bulkArchiveShoppingLists,
    bulkDeleteArchivedShoppingLists,
  };

  return (
    <ShoppingListsContext.Provider value={contextValue}>
      {children}
    </ShoppingListsContext.Provider>
  );
};

export const useShoppingLists = (): ShoppingListsContextType => {
  const context = useContext(ShoppingListsContext);
  if (context === undefined) {
    throw new Error('useShoppingLists must be used within a ShoppingListsProvider');
  }
  return context;
}; 