import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryItem, InventoryContextType, Recipe, Unit, FrequencyOfUse } from '../../types';
import { inventoryService } from '../services/inventoryService';
import { normalizeIngredientName, convertUnit } from '../../constants';
import { useToast } from './ToastProvider';
import { useAuthAPI } from './AuthProviderAPI';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

interface InventoryProviderProps {
  children: ReactNode;
}

// Helper function to create inventory item request, filtering undefined values
const createInventoryItemRequest = (data: {
  ingredient_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold?: number;
  expiry_date?: string;
  frequency_of_use?: string;
  default_store_id?: string;
}) => {
  const request: any = {
    ingredient_name: data.ingredient_name,
    quantity: data.quantity,
    unit: data.unit,
  };
  
  if (data.low_stock_threshold !== undefined) request.low_stock_threshold = data.low_stock_threshold;
  if (data.expiry_date !== undefined) request.expiry_date = data.expiry_date;
  if (data.frequency_of_use !== undefined) request.frequency_of_use = data.frequency_of_use;
  if (data.default_store_id !== undefined) request.default_store_id = data.default_store_id;
  
  return request;
};

// Transform function from API format to app format
const transformInventoryItemFromAPI = (apiItem: any): InventoryItem => {
  console.log('Transforming API item:', apiItem);
  const transformed = {
    id: apiItem.id,
    ingredientName: apiItem.ingredient_name,
    quantity: apiItem.quantity,
    unit: apiItem.unit as Unit,
    lowStockThreshold: apiItem.low_stock_threshold || undefined,
    expirationDate: apiItem.expiry_date || undefined,
    frequencyOfUse: apiItem.frequency_of_use as FrequencyOfUse || undefined,
    defaultStoreId: apiItem.default_store_id || undefined,
  };
  console.log('Transformed to:', transformed);
  return transformed;
};

export const InventoryProviderAPI: React.FC<InventoryProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { currentUser, isLoadingAuth } = useAuthAPI();

  // Compute a stable authentication state
  const isAuthenticated = !!currentUser && !isLoadingAuth;

  // Queries
  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      console.log('Fetching inventory...');
      const response = await inventoryService.getInventory();
      console.log('Raw inventory API response:', response);
      const transformed = response.inventory.map(transformInventoryItemFromAPI);
      console.log('Transformed inventory items:', transformed);
      return transformed;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if ((error as any)?.status === 401) return false;
      return failureCount < 3;
    },
    enabled: isAuthenticated, // Use the computed stable state
  });

  // Log authentication state changes for debugging
  React.useEffect(() => {
    console.log('Inventory Provider - Auth state:', { 
      currentUser: !!currentUser, 
      isLoadingAuth, 
      isAuthenticated,
      inventoryCount: inventory.length
    });
  }, [currentUser, isLoadingAuth, isAuthenticated, inventory.length]);

  // Additional debugging for inventory data changes
  React.useEffect(() => {
    console.log('Inventory data changed:', { 
      count: inventory.length, 
      items: inventory.slice(0, 3).map(item => ({ id: item.id, name: item.ingredientName })) // First 3 items
    });
  }, [inventory]);

  // Mutations
  const addInventoryItemMutation = useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id'>) => {
      const normalizedName = normalizeIngredientName(item.ingredientName);
      
      // Check if item with same name and unit already exists
      const existingItem = inventory.find(
        invItem => normalizeIngredientName(invItem.ingredientName) === normalizedName && invItem.unit === item.unit
      );

      if (existingItem) {
        // Update existing item quantity
        const updatedItem = await inventoryService.updateInventoryItem(existingItem.id, 
          createInventoryItemRequest({
            ingredient_name: normalizeIngredientName(existingItem.ingredientName),
            quantity: existingItem.quantity + item.quantity,
            unit: existingItem.unit,
            low_stock_threshold: item.lowStockThreshold !== undefined ? item.lowStockThreshold : existingItem.lowStockThreshold,
            expiry_date: item.expirationDate || existingItem.expirationDate,
            frequency_of_use: item.frequencyOfUse || existingItem.frequencyOfUse,
            default_store_id: item.defaultStoreId || existingItem.defaultStoreId,
          })
        );
        return { item: transformInventoryItemFromAPI(updatedItem), isUpdate: true };
      } else {
        // Add new item
        const newItem = await inventoryService.createInventoryItem(
          createInventoryItemRequest({
            ingredient_name: normalizedName,
            quantity: item.quantity,
            unit: item.unit,
            low_stock_threshold: item.lowStockThreshold,
            expiry_date: item.expirationDate,
            frequency_of_use: item.frequencyOfUse,
            default_store_id: item.defaultStoreId,
          })
        );
        return { item: transformInventoryItemFromAPI(newItem), isUpdate: false };
      }
    },
    onSuccess: ({ item, isUpdate }) => {
      if (isUpdate) {
        queryClient.setQueryData(['inventory'], (oldInventory: InventoryItem[] = []) =>
          oldInventory.map(invItem => invItem.id === item.id ? item : invItem)
        );
      } else {
        queryClient.setQueryData(['inventory'], (oldInventory: InventoryItem[] = []) => [
          ...oldInventory,
          item
        ]);
      }
    },
  });

  const updateInventoryItemMutation = useMutation({
    mutationFn: async (item: InventoryItem) => {
      const updateData = createInventoryItemRequest({
        ingredient_name: normalizeIngredientName(item.ingredientName),
        quantity: item.quantity,
        unit: item.unit,
        low_stock_threshold: item.lowStockThreshold,
        expiry_date: item.expirationDate,
        frequency_of_use: item.frequencyOfUse,
        default_store_id: item.defaultStoreId,
      });
      console.log('Sending update data to API:', updateData);
      const updatedItem = await inventoryService.updateInventoryItem(item.id, updateData);
      console.log('Received updated item from API:', updatedItem);
      return transformInventoryItemFromAPI(updatedItem);
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['inventory'] });
      const previousInventory = queryClient.getQueryData(['inventory']);
      
      queryClient.setQueryData(['inventory'], (old: InventoryItem[] = []) =>
        old.map(item => item.id === newItem.id ? newItem : item)
      );
      
      return { previousInventory };
    },
    onError: (err, newItem, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(['inventory'], context.previousInventory);
      }
      console.error('Failed to update inventory item:', newItem.ingredientName, err);
      showToast('error', `Failed to update "${newItem.ingredientName}". Please try again.`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData(['inventory'], (oldInventory: InventoryItem[] = []) =>
        oldInventory.map(invItem => invItem.id === updatedItem.id ? updatedItem : invItem)
      );
      showToast('success', `"${updatedItem.ingredientName}" updated successfully!`);
    },
  });

  const deleteInventoryItemMutation = useMutation({
    mutationFn: (itemId: string) => inventoryService.deleteInventoryItem(itemId),
    onSuccess: (_, deletedItemId) => {
      queryClient.setQueryData(['inventory'], (oldInventory: InventoryItem[] = []) =>
        oldInventory.filter(item => item.id !== deletedItemId)
      );
    },
  });

  // Context methods
  const addInventoryItem = (item: Omit<InventoryItem, 'id'>): void => {
    addInventoryItemMutation.mutate(item);
  };

  const updateInventoryItem = (item: InventoryItem): void => {
    updateInventoryItemMutation.mutate(item);
  };

  const deleteInventoryItem = (itemId: string): void => {
    deleteInventoryItemMutation.mutate(itemId);
  };

  const getInventoryItemByName = (name: string): InventoryItem | undefined => {
    const normalizedName = normalizeIngredientName(name);
    return inventory.find(item => normalizeIngredientName(item.ingredientName) === normalizedName);
  };

  const deductFromInventory = (ingredientName: string, quantity: number, unit: Unit): boolean => {
    const normalizedName = normalizeIngredientName(ingredientName);
    const item = inventory.find(item => 
      normalizeIngredientName(item.ingredientName) === normalizedName
    );

    if (!item) return false;

    let deductableQuantity = quantity;

    // Try to convert units if they don't match
    if (item.unit !== unit) {
      const converted = convertUnit(quantity, unit, item.unit);
      if (converted === null) return false; // Cannot convert units
      deductableQuantity = converted;
    }

    if (item.quantity < deductableQuantity) return false;

    // Perform deduction by updating the item
    const newQuantity = Math.max(0, item.quantity - deductableQuantity);
    updateInventoryItem({
      ...item,
      quantity: newQuantity
    });

    return true;
  };

  const validateRecipePreparation = (recipe: Recipe, requestedServings: number) => {
    const missingIngredients: Array<{
      name: string;
      needed: number;
      available: number;
      unit: string;
    }> = [];
    const warnings: string[] = [];

    // Calculate scaling factor
    const scalingFactor = requestedServings / recipe.defaultServings;

    for (const ingredient of recipe.ingredients) {
      const neededQuantity = ingredient.quantity * scalingFactor;
      const normalizedName = normalizeIngredientName(ingredient.ingredientName);
      const inventoryItem = inventory.find(item => 
        normalizeIngredientName(item.ingredientName) === normalizedName
      );

      if (!inventoryItem) {
        missingIngredients.push({
          name: ingredient.ingredientName,
          needed: neededQuantity,
          available: 0,
          unit: ingredient.unit,
        });
        continue;
      }

      let availableQuantity = inventoryItem.quantity;
      
      // Try to convert units if they don't match
      if (inventoryItem.unit !== ingredient.unit) {
        const converted = convertUnit(inventoryItem.quantity, inventoryItem.unit, ingredient.unit);
        if (converted === null) {
          warnings.push(`Cannot convert ${inventoryItem.unit} to ${ingredient.unit} for ${ingredient.ingredientName}`);
          availableQuantity = 0;
        } else {
          availableQuantity = converted;
        }
      }

      if (availableQuantity < neededQuantity) {
        missingIngredients.push({
          name: ingredient.ingredientName,
          needed: neededQuantity,
          available: availableQuantity,
          unit: ingredient.unit,
        });
      }
    }

    return {
      canPrepare: missingIngredients.length === 0,
      missingIngredients,
      warnings,
    };
  };

  const deductIngredientsForPreparation = (recipe: Recipe, preparedServings: number) => {
    const scalingFactor = preparedServings / recipe.defaultServings;
    const deductedIngredients: Array<{
      name: string;
      amountDeducted: number;
      unit: string;
      remainingInInventory: number;
    }> = [];
    const errors: string[] = [];

    // First validate that we can prepare the recipe
    const validation = validateRecipePreparation(recipe, preparedServings);
    if (!validation.canPrepare) {
      return {
        success: false,
        deductedIngredients: [],
        errors: [`Cannot prepare recipe: missing ingredients - ${validation.missingIngredients.map(mi => mi.name).join(', ')}`],
      };
    }

    // Perform deductions
    for (const ingredient of recipe.ingredients) {
      const neededQuantity = ingredient.quantity * scalingFactor;
      const normalizedName = normalizeIngredientName(ingredient.ingredientName);
      const item = inventory.find(item => 
        normalizeIngredientName(item.ingredientName) === normalizedName
      );

      if (!item) {
        errors.push(`Ingredient not found in inventory: ${ingredient.ingredientName}`);
        continue;
      }

      let deductableQuantity = neededQuantity;

      // Try to convert units if they don't match
      if (item.unit !== ingredient.unit) {
        const converted = convertUnit(neededQuantity, ingredient.unit, item.unit);
        if (converted === null) {
          errors.push(`Cannot convert units for ${ingredient.ingredientName}`);
          continue;
        }
        deductableQuantity = converted;
      }

      if (item.quantity < deductableQuantity) {
        errors.push(`Insufficient quantity for ${ingredient.ingredientName}`);
        continue;
      }

      // Perform deduction
      const newQuantity = Math.max(0, item.quantity - deductableQuantity);
      
      updateInventoryItem({
        ...item,
        quantity: newQuantity
      });

      deductedIngredients.push({
        name: ingredient.ingredientName,
        amountDeducted: neededQuantity,
        unit: ingredient.unit,
        remainingInInventory: newQuantity,
      });
    }

    return {
      success: errors.length === 0,
      deductedIngredients,
      errors,
    };
  };

  const contextValue: InventoryContextType = {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getInventoryItemByName,
    deductFromInventory,
    validateRecipePreparation,
    deductIngredientsForPreparation,
  };

  return (
    <InventoryContext.Provider value={contextValue}>
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProviderAPI');
  }
  return context;
};