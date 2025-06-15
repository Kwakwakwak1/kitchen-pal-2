import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingList, ShoppingListsContextType, ShoppingListStatus, Unit } from '../../types';
import { shoppingListsService } from '../services';
import { ShoppingListAPI, ShoppingListItemAPI } from '../types/api';
import { useAuthAPI } from './AuthProviderAPI';

const ShoppingListsContext = createContext<ShoppingListsContextType | undefined>(undefined);

interface ShoppingListsProviderProps {
  children: ReactNode;
}

// Transform function from API format to app format
const transformShoppingListFromAPI = (apiList: ShoppingListAPI, items: ShoppingListItemAPI[] = []): ShoppingList => ({
  id: apiList.id,
  name: apiList.name,
  createdAt: apiList.created_at,
  status: apiList.is_active ? ShoppingListStatus.ACTIVE : ShoppingListStatus.ARCHIVED,
  archivedAt: undefined, // API doesn't currently support this field
  completedAt: undefined, // API doesn't currently support this field
  items: items.map(item => ({
    id: item.id,
    ingredientName: item.ingredient_name,
    neededQuantity: item.quantity || 0,
    unit: (item.unit as Unit) || Unit.PIECE,
    purchased: item.is_purchased,
    notes: item.notes || '',
    recipeSources: [], // API doesn't currently support recipe sources
  })),
});

export const ShoppingListsProviderAPI: React.FC<ShoppingListsProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { currentUser, isLoadingAuth } = useAuthAPI();

  // Compute a stable authentication state
  const isAuthenticated = !!currentUser && !isLoadingAuth;

  // Queries
  const { data: activeShoppingLists = [] } = useQuery({
    queryKey: ['shoppingLists', 'active'],
    queryFn: async () => {
      const response = await shoppingListsService.getActiveShoppingLists();
      return Promise.all(
        response.map(async (list) => {
          const itemsResponse = await shoppingListsService.getShoppingListItems(list.id);
          return transformShoppingListFromAPI(list, itemsResponse.items);
        })
      );
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if ((error as any)?.status === 401) return false;
      return failureCount < 3;
    },
    enabled: isAuthenticated, // Use the computed stable state
  });

  const { data: archivedShoppingLists = [] } = useQuery({
    queryKey: ['shoppingLists', 'archived'],
    queryFn: async () => {
      const response = await shoppingListsService.getInactiveShoppingLists();
      return Promise.all(
        response.map(async (list) => {
          const itemsResponse = await shoppingListsService.getShoppingListItems(list.id);
          return transformShoppingListFromAPI(list, itemsResponse.items);
        })
      );
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - archived lists change less frequently
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if ((error as any)?.status === 401) return false;
      return failureCount < 3;
    },
    enabled: isAuthenticated, // Use the computed stable state
  });

  // Log authentication state changes for debugging
  React.useEffect(() => {
    console.log('ShoppingLists Provider - Auth state:', { 
      currentUser: !!currentUser, 
      isLoadingAuth, 
      isAuthenticated 
    });
  }, [currentUser, isLoadingAuth, isAuthenticated]);

  // Mutations
  const addShoppingListMutation = useMutation({
    mutationFn: async (list: Omit<ShoppingList, 'id' | 'createdAt' | 'status'>) => {
      const newList = await shoppingListsService.createShoppingList({
        name: list.name,
        is_active: true,
      });
      
      // Add items if any
      if (list.items && list.items.length > 0) {
        await Promise.all(
          list.items.map(item =>
            shoppingListsService.addShoppingListItem(newList.id, {
              ingredient_name: item.ingredientName,
              quantity: typeof item.neededQuantity === 'string' ? parseFloat(item.neededQuantity) : item.neededQuantity,
              unit: item.unit,
              notes: item.notes,
            })
          )
        );
        // Fetch the complete list with items
        const itemsResponse = await shoppingListsService.getShoppingListItems(newList.id);
        return transformShoppingListFromAPI(newList, itemsResponse.items);
      }
      
      return transformShoppingListFromAPI(newList);
    },
    onSuccess: (newList) => {
      queryClient.setQueryData(['shoppingLists', 'active'], (oldLists: ShoppingList[] = []) => [
        ...oldLists,
        newList
      ]);
    },
  });

  const updateShoppingListMutation = useMutation({
    mutationFn: async (list: ShoppingList) => {
      const updatedList = await shoppingListsService.updateShoppingList(list.id, {
        name: list.name,
        is_active: list.status === ShoppingListStatus.ACTIVE,
      });
      
      // Get current items and update them
      const currentItemsResponse = await shoppingListsService.getShoppingListItems(list.id);
      const currentItems = currentItemsResponse.items;
      
      // Simple approach: delete all items and recreate them
      // In a more sophisticated implementation, we'd diff and update efficiently
      await Promise.all(
        currentItems.map(item => shoppingListsService.deleteShoppingListItem(item.id))
      );
      
      if (list.items && list.items.length > 0) {
        await Promise.all(
          list.items.map(item =>
            shoppingListsService.addShoppingListItem(list.id, {
              ingredient_name: item.ingredientName,
              quantity: typeof item.neededQuantity === 'string' ? parseFloat(item.neededQuantity) : item.neededQuantity,
              unit: item.unit,
              notes: item.notes,
            })
          )
        );
      }
      
      const finalItemsResponse = await shoppingListsService.getShoppingListItems(list.id);
      return transformShoppingListFromAPI(updatedList, finalItemsResponse.items);
    },
    onSuccess: (updatedList, originalList) => {
      const isActiveList = updatedList.status === ShoppingListStatus.ACTIVE;
      const wasActiveList = originalList.status === ShoppingListStatus.ACTIVE;
      
      if (isActiveList && wasActiveList) {
        // Update in active lists
        queryClient.setQueryData(['shoppingLists', 'active'], (oldLists: ShoppingList[] = []) =>
          oldLists.map(l => l.id === updatedList.id ? updatedList : l)
        );
      } else if (!isActiveList && !wasActiveList) {
        // Update in archived lists
        queryClient.setQueryData(['shoppingLists', 'archived'], (oldLists: ShoppingList[] = []) =>
          oldLists.map(l => l.id === updatedList.id ? updatedList : l)
        );
      } else if (isActiveList && !wasActiveList) {
        // Move from archived to active
        queryClient.setQueryData(['shoppingLists', 'archived'], (oldLists: ShoppingList[] = []) =>
          oldLists.filter(l => l.id !== updatedList.id)
        );
        queryClient.setQueryData(['shoppingLists', 'active'], (oldLists: ShoppingList[] = []) =>
          [...oldLists, updatedList]
        );
      } else {
        // Move from active to archived
        queryClient.setQueryData(['shoppingLists', 'active'], (oldLists: ShoppingList[] = []) =>
          oldLists.filter(l => l.id !== updatedList.id)
        );
        queryClient.setQueryData(['shoppingLists', 'archived'], (oldLists: ShoppingList[] = []) =>
          [...oldLists, updatedList]
        );
      }
    },
  });

  const deleteShoppingListMutation = useMutation({
    mutationFn: (listId: string) => shoppingListsService.deleteShoppingList(listId),
    onSuccess: (_, deletedListId) => {
      queryClient.setQueryData(['shoppingLists', 'active'], (oldLists: ShoppingList[] = []) =>
        oldLists.filter(l => l.id !== deletedListId)
      );
      queryClient.setQueryData(['shoppingLists', 'archived'], (oldLists: ShoppingList[] = []) =>
        oldLists.filter(l => l.id !== deletedListId)
      );
    },
  });

  // Context methods
  const addShoppingList = (list: Omit<ShoppingList, 'id' | 'createdAt' | 'status'>): string => {
    const tempId = `temp-${Date.now()}`;
    addShoppingListMutation.mutate(list, {
      onSuccess: (newList) => {
        // Store the real ID mapping for potential navigation
        window.dispatchEvent(new CustomEvent('shoppingListCreated', { 
          detail: { tempId, realId: newList.id } 
        }));
      }
    });
    return tempId; // Note: This returns a temporary ID - real ID available via event
  };

  const updateShoppingList = (list: ShoppingList): void => {
    updateShoppingListMutation.mutate(list);
  };

  const deleteShoppingList = (listId: string): void => {
    deleteShoppingListMutation.mutate(listId);
  };

  const archiveShoppingList = (listId: string): void => {
    const list = [...activeShoppingLists, ...archivedShoppingLists].find(l => l.id === listId);
    if (list) {
      const archivedList: ShoppingList = {
        ...list,
        status: ShoppingListStatus.ARCHIVED,
        archivedAt: new Date().toISOString(),
        completedAt: list.completedAt || new Date().toISOString(),
      };
      updateShoppingList(archivedList);
    }
  };

  const unarchiveShoppingList = (listId: string): void => {
    const list = [...activeShoppingLists, ...archivedShoppingLists].find(l => l.id === listId);
    if (list) {
      const unarchivedList: ShoppingList = {
        ...list,
        status: ShoppingListStatus.ACTIVE,
        archivedAt: undefined,
      };
      updateShoppingList(unarchivedList);
    }
  };

  const deleteArchivedShoppingList = (listId: string): void => {
    deleteShoppingList(listId);
  };

  const getShoppingListById = (listId: string): ShoppingList | undefined => {
    return [...activeShoppingLists, ...archivedShoppingLists].find(l => l.id === listId);
  };

  const bulkDeleteShoppingLists = (listIds: string[]): void => {
    listIds.forEach(id => deleteShoppingList(id));
  };

  const bulkArchiveShoppingLists = (listIds: string[]): void => {
    listIds.forEach(id => archiveShoppingList(id));
  };

  const bulkDeleteArchivedShoppingLists = (listIds: string[]): void => {
    listIds.forEach(id => deleteShoppingList(id));
  };

  const contextValue: ShoppingListsContextType = {
    shoppingLists: activeShoppingLists,
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
    throw new Error('useShoppingLists must be used within a ShoppingListsProviderAPI');
  }
  return context;
};