import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingList, ShoppingListsContextType, ShoppingListStatus, Unit, ShoppingListItem } from '../../types';
import { shoppingListsService } from '../services';
import { ShoppingListAPI, ShoppingListItemAPI } from '../types/api';

const ShoppingListsContext = createContext<ShoppingListsContextType | undefined>(undefined);

interface ShoppingListsProviderProps {
  children: ReactNode;
}

// Transform functions
const transformShoppingListFromAPI = (apiList: ShoppingListAPI, items: ShoppingListItemAPI[] = []): ShoppingList => {
  const transformedItems = items.map(item => ({
    id: item.id,
    ingredientName: item.ingredient_name,
    neededQuantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity || 0,
    unit: (item.unit as Unit) || Unit.PIECE,
    recipeSources: [], // Not supported in current API
    purchased: item.is_purchased,
    notes: item.notes,
  }));

  // Determine status based on is_active and completion state
  let status: ShoppingListStatus;
  if (!apiList.is_active) {
    status = ShoppingListStatus.ARCHIVED;
  } else {
    // Check if all items are purchased to determine if list is completed
    const isCompleted = transformedItems.length > 0 && transformedItems.every(item => item.purchased);
    status = isCompleted ? ShoppingListStatus.COMPLETED : ShoppingListStatus.ACTIVE;
  }

  return {
    id: apiList.id,
    name: apiList.name,
    createdAt: apiList.created_at,
    status,
    completedAt: status === ShoppingListStatus.COMPLETED ? apiList.updated_at : undefined,
    archivedAt: !apiList.is_active ? apiList.updated_at : undefined,
    items: transformedItems,
  };
};

export const ShoppingListsProviderAPI: React.FC<ShoppingListsProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();

  // Queries
  const { data: activeShoppingLists = [], error: activeListsError } = useQuery({
    queryKey: ['shoppingLists', 'active'],
    queryFn: async () => {
      console.log('ShoppingListsProvider: Fetching active shopping lists...');
      try {
        const response = await shoppingListsService.getActiveShoppingLists();
        console.log('ShoppingListsProvider: Got active lists:', response.length);
        
        const transformedLists = await Promise.all(
          response.map(async (list) => {
            console.log(`ShoppingListsProvider: Fetching items for list: ${list.name}`);
            const itemsResponse = await shoppingListsService.getShoppingListItems(list.id);
            console.log(`ShoppingListsProvider: Got ${itemsResponse.items.length} items for ${list.name}`);
            return transformShoppingListFromAPI(list, itemsResponse.items);
          })
        );
        
        console.log('ShoppingListsProvider: Successfully transformed', transformedLists.length, 'lists');
        return transformedLists;
      } catch (error) {
        console.error('ShoppingListsProvider: Error fetching active lists:', error);
        throw error;
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Log any query errors
  React.useEffect(() => {
    if (activeListsError) {
      console.error('ShoppingListsProvider: Active lists query error:', activeListsError);
    }
  }, [activeListsError]);

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
  });

  // Mutations
  const addShoppingListMutation = useMutation({
    mutationFn: async (list: Omit<ShoppingList, 'id' | 'createdAt' | 'status'>) => {
      console.log('Creating shopping list:', list.name);
      
      // Create the shopping list first
      const newList = await shoppingListsService.createShoppingList({
        name: list.name,
        is_active: true,
      });
      
      console.log('Shopping list created successfully:', newList.id);
      
      // Add items using bulk create to avoid rate limiting
      if (list.items && list.items.length > 0) {
        console.log(`Adding ${list.items.length} items using bulk create...`);
        
        try {
          const itemsToCreate = list.items.map(item => ({
            ingredient_name: item.ingredientName,
            quantity: item.neededQuantity,
            unit: item.unit,
            notes: item.notes,
          }));

          const createdItems = await shoppingListsService.bulkCreateItems(newList.id, itemsToCreate);
          console.log(`✅ Successfully added ${createdItems.length}/${list.items.length} items`);
          
          if (createdItems.length < list.items.length) {
            console.warn(`Some items may have been skipped due to duplicates`);
          }
        } catch (error) {
          console.error('❌ Failed to bulk create items:', error);
          // If bulk creation fails, fall back to individual creation with better error handling
          console.log('Falling back to individual item creation...');
          
          let successCount = 0;
          const errors = [];
          
          for (const item of list.items) {
            try {
              await shoppingListsService.addShoppingListItem(newList.id, {
                ingredient_name: item.ingredientName,
                quantity: item.neededQuantity,
                unit: item.unit,
                notes: item.notes,
              });
              successCount++;
              
              // Small delay to avoid overwhelming the server
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (itemError) {
              console.error(`Failed to add ${item.ingredientName}:`, itemError);
              errors.push({ item: item.ingredientName, error: itemError });
            }
          }
          
          console.log(`Fallback completed: ${successCount}/${list.items.length} items added`);
          if (errors.length > 0) {
            console.warn(`Failed to add ${errors.length} items`);
          }
        }
      }
      
      // Get the final shopping list with all items
      const finalItemsResponse = await shoppingListsService.getShoppingListItems(newList.id);
      const finalList = transformShoppingListFromAPI(newList, finalItemsResponse.items);
      
      return finalList;
    },
    onSuccess: (newList) => {
      queryClient.setQueryData(['shoppingLists', 'active'], (oldLists: ShoppingList[] = []) => [
        ...oldLists,
        newList
      ]);
      
      // Cross-provider cache invalidation: invalidate inventory and recipes when shopping lists change
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const updateShoppingListMutation = useMutation({
    mutationFn: async (list: ShoppingList) => {
      // Only update the shopping list metadata (name and active status)
      const updatedList = await shoppingListsService.updateShoppingList(list.id, {
        name: list.name,
        is_active: list.status === ShoppingListStatus.ACTIVE || list.status === ShoppingListStatus.COMPLETED,
      });
      
      // Get current items to check what needs to be updated
      const currentItemsResponse = await shoppingListsService.getShoppingListItems(list.id);
      const currentItems = currentItemsResponse.items;
      
      // Create a map of current items by ID for efficient lookup
      const currentItemsMap = new Map(currentItems.map(item => [item.id, item]));
      
      // Handle items that need to be added, updated, or removed
      const itemsToAdd: ShoppingListItem[] = [];
      const itemsToUpdate: { id: string; data: any }[] = [];
      const itemsToRemove: string[] = [];
      
      // Check which items from the updated list need to be processed
      for (const newItem of list.items) {
        const existingItem = currentItemsMap.get(newItem.id);
        
        if (!existingItem) {
          // This is a new item that needs to be added
          itemsToAdd.push(newItem);
        } else {
          // Check if the item needs updating
          const needsUpdate = 
            existingItem.ingredient_name !== newItem.ingredientName ||
            existingItem.quantity !== newItem.neededQuantity ||
            existingItem.unit !== newItem.unit ||
            existingItem.is_purchased !== newItem.purchased ||
            existingItem.notes !== newItem.notes;
            
          if (needsUpdate) {
            itemsToUpdate.push({
              id: newItem.id,
              data: {
                ingredient_name: newItem.ingredientName,
                quantity: newItem.neededQuantity,
                unit: newItem.unit,
                is_purchased: newItem.purchased,
                notes: newItem.notes,
              }
            });
          }
          
          // Remove from current items map to track what's left
          currentItemsMap.delete(newItem.id);
        }
      }
      
      // Any remaining items in the map need to be removed
      itemsToRemove.push(...currentItemsMap.keys());
      
      // Execute all updates
      const updatePromises: Promise<any>[] = [];
      
      // Add new items
      itemsToAdd.forEach(item => {
        updatePromises.push(
          shoppingListsService.addShoppingListItem(list.id, {
            ingredient_name: item.ingredientName,
            quantity: item.neededQuantity,
            unit: item.unit,
            notes: item.notes,
          })
        );
      });
      
      // Update existing items
      itemsToUpdate.forEach(({ id, data }) => {
        updatePromises.push(
          shoppingListsService.updateShoppingListItem(id, data)
        );
      });
      
      // Remove obsolete items
      itemsToRemove.forEach(itemId => {
        updatePromises.push(
          shoppingListsService.deleteShoppingListItem(itemId)
        );
      });
      
      // Wait for all updates to complete
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }
      
      // Get the final state
      const finalItemsResponse = await shoppingListsService.getShoppingListItems(list.id);
      return transformShoppingListFromAPI(updatedList, finalItemsResponse.items);
    },
    onSuccess: (updatedList, originalList) => {
      const isActiveOrCompleted = updatedList.status === ShoppingListStatus.ACTIVE || updatedList.status === ShoppingListStatus.COMPLETED;
      const wasActiveOrCompleted = originalList.status === ShoppingListStatus.ACTIVE || originalList.status === ShoppingListStatus.COMPLETED;
      
      if (isActiveOrCompleted && wasActiveOrCompleted) {
        // Update in active lists
        queryClient.setQueryData(['shoppingLists', 'active'], (oldLists: ShoppingList[] = []) =>
          oldLists.map(l => l.id === updatedList.id ? updatedList : l)
        );
      } else if (!isActiveOrCompleted && !wasActiveOrCompleted) {
        // Update in archived lists
        queryClient.setQueryData(['shoppingLists', 'archived'], (oldLists: ShoppingList[] = []) =>
          oldLists.map(l => l.id === updatedList.id ? updatedList : l)
        );
      } else if (isActiveOrCompleted && !wasActiveOrCompleted) {
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
    
    // Add a unique timestamp to prevent naming conflicts
    const uniqueName = list.name.includes(' - ') && list.name.includes('AM') || list.name.includes('PM') 
      ? list.name // Already has timestamp
      : `${list.name} - ${new Date().toLocaleString()}`;
    
    const listWithUniqueName = {
      ...list,
      name: uniqueName
    };
    
    addShoppingListMutation.mutate(listWithUniqueName, {
      onSuccess: (newList) => {
        console.log('Shopping list created successfully:', newList.id);
        // Store the real ID mapping for potential navigation
        try {
          window.dispatchEvent(new CustomEvent('shoppingListCreated', { 
            detail: { tempId, realId: newList.id } 
          }));
        } catch (error) {
          console.error('Error dispatching shoppingListCreated event:', error);
        }
      },
      onError: (error) => {
        console.error('Error creating shopping list:', error);
        // Dispatch error event so listening components can handle it
        try {
          window.dispatchEvent(new CustomEvent('shoppingListError', { 
            detail: { tempId, error } 
          }));
        } catch (eventError) {
          console.error('Error dispatching shoppingListError event:', eventError);
        }
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

  const markAllItemsAsPurchased = async (listId: string): Promise<void> => {
    const list = getShoppingListById(listId);
    if (!list) return;
    
    const unpurchasedItems = list.items.filter(item => !item.purchased);
    if (unpurchasedItems.length === 0) return;
    
    const purchaseData = unpurchasedItems.map(item => ({
      item_id: item.id,
      quantity: item.neededQuantity
    }));

    try {
      await shoppingListsService.purchaseAndComplete(listId, purchaseData);
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['shoppingLists'] });
    } catch (error) {
      console.error('Error marking all items as purchased:', error);
      throw error;
    }
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
      // Determine if it should be ACTIVE or COMPLETED based on items' purchased state
      const isCompleted = list.items.length > 0 && list.items.every(item => item.purchased);
      const unarchivedList: ShoppingList = {
        ...list,
        status: isCompleted ? ShoppingListStatus.COMPLETED : ShoppingListStatus.ACTIVE,
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
    markAllItemsAsPurchased,
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