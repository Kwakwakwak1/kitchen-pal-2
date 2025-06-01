import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  EnhancedInventoryItem,
  // InventoryContextType, // This will be defined below
  Recipe,
  Unit,
  ItemTemplate,
  FrequencyOfUse
} from '../../types'; // Assuming EnhancedInventoryItem etc. are exported from types/index.ts
import { generateId, convertUnit, normalizeIngredientName } from '../../constants';
import { useAuth } from './AuthProvider';
// import { useCategories } from './CategoriesProvider'; // Potentially needed for default category logic if not handled by caller

// Define updated InventoryContextType locally or ensure it's correctly imported if defined in types/index.ts
export interface InventoryContextType {
  inventory: EnhancedInventoryItem[];
  addInventoryItem: (item: Omit<EnhancedInventoryItem, 'id' | 'addedDate' | 'lastUpdated' | 'isArchived' | 'archivedDate' | 'originalQuantity' | 'timesRestocked' | 'totalConsumed' | 'averageConsumptionRate' | 'lastUsedDate'>) => void;
  updateInventoryItem: (item: EnhancedInventoryItem) => void;
  deleteInventoryItem: (itemId: string) => void; // This will now archive
  archiveItem: (itemId: string) => void;
  unarchiveItem: (itemId: string, quantity?: number) => void;
  createTemplateFromItem: (itemId: string) => ItemTemplate | undefined;
  getInventoryItemByName: (name: string) => EnhancedInventoryItem | undefined;
  getArchivedItems: () => EnhancedInventoryItem[]; // Added helper
  getActiveItems: () => EnhancedInventoryItem[]; // Added helper
  deductFromInventory: (ingredientName: string, quantity: number, unit: Unit) => boolean;
  validateRecipePreparation: (recipe: Recipe, requestedServings: number) => {
    canPrepare: boolean;
    missingIngredients: Array<{ name: string; needed: number; available: number; unit: string }>;
    warnings: string[];
  };
  deductIngredientsForPreparation: (recipe: Recipe, preparedServings: number) => {
    success: boolean;
    deductedIngredients: Array<{ name: string; amountDeducted: number; unit: string; remainingInInventory: number }>;
    errors: string[];
  };
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

interface InventoryProviderProps {
  children: ReactNode;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  const [inventory, setInventory] = useState<EnhancedInventoryItem[]>([]);
  const { currentUser } = useAuth();
  // const { getDefaultCategoryId } = useCategories(); // Example if needed

  const getStorageKey = () => `enhanced_inventory_${currentUser?.id || 'anonymous'}`; // Updated key

  // Load inventory from localStorage when user changes
  useEffect(() => {
    if (currentUser) {
      const storageKey = getStorageK        console.error('Error loading inventory from localStorage:', error);
          setInventory([]);
        }
      } else {
        // If nothing in enhanced_inventory, potentially check for old 'inventory_' key
        // This assumes migration script `runMigrationIfNeeded` has already run at app startup.
        // If not, that script should handle moving data from 'inventory_*' to 'enhanced_inventory_*'.
        setInventory([]);
      }
    } else {
      setInventory([]);
    }
  }, [currentUser]);

  // Save inventory to localStorage whenever it changes
  useEffect(() => {
    if (currentUser) {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(inventory));
    }
  }, [inventory, currentUser]);

  const addInventoryItem = (itemData: Omit<EnhancedInventoryItem, 'id' | 'addedDate' | 'lastUpdated' | 'isArchived' | 'archivedDate' | 'originalQuantity' | 'timesRestocked' | 'totalConsumed' | 'averageConsumptionRate' | 'lastUsedDate'>): void => {
    const normalizedName = normalizeIngredientName(itemData.ingredientName);
    const now = new Date().toISOString();

    const existingItemIndex = inventory.findIndex(
      invItem => normalizeIngredientName(invItem.ingredientName) === normalizedName && invItem.unit === itemData.unit
    );

    if (existingItemIndex >= 0) {
      setInventory(prev => prev.map((invItem, index) => {
        if (index === existingItemIndex) {
          const updatedQty = invItem.quantity + itemData.quantity;
          const itemToUpdate = {
            ...invItem,
            ...itemData, // Apply new data like categoryId, notes, brand, etc.
            quantity: updatedQty,
            lastUpdated: now,
            // If it was archived, unarchive it by adding quantity
            isArchived: false,
            archivedDate: undefined,
            originalQuantity: undefined,
            timesRestocked: invItem.isArchived ? (invItem.timesRestocked || 0) + 1 : invItem.timesRestocked,
          };
          if (updatedQty <= 0 && !itemToUpdate.isArchived) { // Should not happen if adding positive quantity
             // This case might be redundant if itemData.quantity is always positive
             archiveItem(itemToUpdate.id, true); // internal call to prevent double state update
             return inventory.find(i => i.id === itemToUpdate.id)!; // get the archived version
          }
          return itemToUpdate;
        }
        return invItem;
      }));
    } else {
      const newItem: EnhancedInventoryItem = {
        id: generateId(),
        ...itemData,
        ingredientName: normalizedName,
        addedDate: now,
        lastUpdated: now,
        isArchived: false,
        archivedDate: undefined,
        originalQuantity: undefined,
        timesRestocked: 0,
        totalConsumed: 0,
        averageConsumptionRate: undefined,
        lastUsedDate: undefined,
        // Ensure required fields like categoryId are present from itemData
      };
      if (newItem.quantity <= 0) {
        newItem.isArchived = true;
        newItem.archivedDate = now;
        newItem.originalQuantity = newItem.quantity; // Store the intended (possibly zero/negative) quantity
        newItem.quantity = 0;
      }
      setInventory(prev => [...prev, newItem]);
    }
  };

  const updateInventoryItem = (item: EnhancedInventoryItem): void => {
    const now = new Date().toISOString();
    setInventory(prev => prev.map(invItem => {
      if (invItem.id === item.id) {
        const updatedItem = {
          ...item,
          ingredientName: normalizeIngredientName(item.ingredientName),
          lastUpdated: now
        };
        // If quantity is set to 0 or less, and it's not already archived, archive it.
        if (updatedItem.quantity <= 0 && !updatedItem.isArchived) {
          return {
            ...updatedItem,
            quantity: 0,
            isArchived: true,
            archivedDate: now,
            originalQuantity: invItem.quantity, // Store last positive quantity
          };
        }
        return updatedItem;
      }
      return invItem;
    }));
  };

  const archiveItem = (itemId: string, internalCall: boolean = false): void => {
    const now = new Date().toISOString();
    const updateFn = (prev: EnhancedInventoryItem[]) => prev.map(item => {
      if (item.id === itemId && !item.isArchived) {
        return {
          ...item,
          quantity: 0,
          isArchived: true,
          archivedDate: now,
          originalQuantity: item.quantity > 0 ? item.quantity : item.originalQuantity || 0, // Store last known positive quantity
          lastUpdated: now,
        };
      }
      return item;
    });

    if (internalCall) {
        setInventory(currentInventory => updateFn(currentInventory));
    } else {
        setInventory(updateFn);
    }
  };

  const unarchiveItem = (itemId: string, quantity?: number): void => {
    const now = new Date().toISOString();
    setInventory(prev => prev.map(item => {
      if (item.id === itemId && item.isArchived) {
        return {
          ...item,
          isArchived: false,
          archivedDate: undefined,
          quantity: quantity !== undefined && quantity > 0 ? quantity : item.originalQuantity || 1,
          originalQuantity: undefined,
          timesRestocked: (item.timesRestocked || 0) + 1,
          lastUpdated: now,
        };
      }
      return item;
    }));
  };

  // deleteInventoryItem now archives the item
  const deleteInventoryItem = (itemId: string): void => {
    archiveItem(itemId);
  };

  const createTemplateFromItem = (itemId: string): ItemTemplate | undefined => {
    const item = inventory.find(invItem => invItem.id === itemId);
    if (!item) return undefined;

    const template: ItemTemplate = {
      id: generateId(), // New ID for the template
      ingredientName: item.ingredientName,
      unit: item.unit,
      categoryId: item.categoryId,
      defaultStoreId: item.defaultStoreId,
      brand: item.brand,
      notes: item.notes,
      // Use originalQuantity if archived and quantity is 0, else current quantity. Default to 1 if both are 0.
      averageQuantity: item.isArchived && item.quantity === 0
                       ? (item.originalQuantity || 1)
                       : (item.quantity > 0 ? item.quantity : 1),
      typicalLowStockThreshold: item.lowStockThreshold,
      frequencyOfUse: item.frequencyOfUse,
      timesUsed: 0,
      lastUsedDate: new Date().toISOString(),
      createdFrom: item.isArchived ? 'archive' : 'manual', // Or determine based on context
      sourceItemId: item.id,
    };
    return template;
    // Note: Template management (saving/storing templates) is not part of this provider for now.
  };

  const getInventoryItemByName = (name: string): EnhancedInventoryItem | undefined => {
    const normalizedName = normalizeIngredientName(name);
    // Return active item first, then archived if no active one matches
    return inventory.find(item => normalizeIngredientName(item.ingredientName) === normalizedName && !item.isArchived) ||
           inventory.find(item => normalizeIngredientName(item.ingredientName) === normalizedName && item.isArchived);
  };

  const getActiveItems = (): EnhancedInventoryItem[] => {
    return inventory.filter(item => !item.isArchived);
  };

  const getArchivedItems = (): EnhancedInventoryItem[] => {
    return inventory.filter(item => item.isArchived);
  };

  const deductFromInventory = (ingredientName: string, quantity: number, unit: Unit): boolean => {
    const normalizedName = normalizeIngredientName(ingredientName);
    const activeInventory = getActiveItems();
    const itemIndex = activeInventory.findIndex(item =>
      normalizeIngredientName(item.ingredientName) === normalizedName
    );

    if (itemIndex === -1) return false; // Only deduct from active items

    const item = activeInventory[itemIndex];
    let deductableQuantity = quantity;

    if (item.unit !== unit) {
      const converted = convertUnit(quantity, unit, item.unit);
      if (converted === null) return false;
      deductableQuantity = converted;
    }

    if (item.quantity < deductableQuantity) return false;

    const newQuantity = item.quantity - deductableQuantity;

    setInventory(prev => prev.map(invItem => {
      if (invItem.id === item.id) {
        const updatedInvItem = {
          ...invItem,
          quantity: Math.max(0, newQuantity),
          lastUpdated: new Date().toISOString(),
          totalConsumed: (invItem.totalConsumed || 0) + deductableQuantity, // Assuming deductableQuantity is in item's unit
          lastUsedDate: new Date().toISOString(),
        };
        if (updatedInvItem.quantity <= 0) {
          // archiveItem(updatedInvItem.id, true) // internal call, but need to return the archived item
           return {
            ...updatedInvItem,
            quantity: 0,
            isArchived: true,
            archivedDate: new Date().toISOString(),
            originalQuantity: item.quantity, // Store last positive quantity
          };
        }
        return updatedInvItem;
      }
      return invItem;
    }));
    return true;
  };

  const validateRecipePreparation = (recipe: Recipe, requestedServings: number) => {
    const missingIngredients: Array<{ name: string; needed: number; available: number; unit: string; }> = [];
    const warnings: string[] = [];
    const scalingFactor = requestedServings / recipe.defaultServings;
    const activeInventory = getActiveItems();

    for (const ingredient of recipe.ingredients) {
      const neededQuantity = ingredient.quantity * scalingFactor;
      const normalizedName = normalizeIngredientName(ingredient.ingredientName);
      const inventoryItem = activeInventory.find(item =>
        normalizeIngredientName(item.ingredientName) === normalizedName && !item.isArchived // Explicitly check not archived
      );

      if (!inventoryItem) {
        missingIngredients.push({ name: ingredient.ingredientName, needed: neededQuantity, available: 0, unit: ingredient.unit });
        continue;
      }

      let availableQuantity = inventoryItem.quantity;
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
        missingIngredients.push({ name: ingredient.ingredientName, needed: neededQuantity, available: availableQuantity, unit: ingredient.unit });
      }
    }
    return { canPrepare: missingIngredients.length === 0, missingIngredients, warnings };
  };

  const deductIngredientsForPreparation = (recipe: Recipe, preparedServings: number) => {
    const scalingFactor = preparedServings / recipe.defaultServings;
    const deductedIngredients: Array<{ name: string; amountDeducted: number; unit: string; remainingInInventory: number; }> = [];
    const errors: string[] = [];

    const validation = validateRecipePreparation(recipe, preparedServings);
    if (!validation.canPrepare) {
      return { success: false, deductedIngredients: [], errors: [`Cannot prepare recipe: missing ingredients - ${validation.missingIngredients.map(mi => mi.name).join(', ')}`] };
    }

    const now = new Date().toISOString();

    for (const ingredient of recipe.ingredients) {
      const neededQuantityForRecipeUnit = ingredient.quantity * scalingFactor;
      const normalizedName = normalizeIngredientName(ingredient.ingredientName);

      // Find item in the main inventory state to update it directly
      const itemIndexInMainInventory = inventory.findIndex(item =>
        normalizeIngredientName(item.ingredientName) === normalizedName && !item.isArchived
      );

      if (itemIndexInMainInventory === -1) {
        errors.push(`Ingredient not found in active inventory: ${ingredient.ingredientName}`);
        continue;
      }

      const itemToDeduct = inventory[itemIndexInMainInventory];
      let deductableQuantityInItemUnit = neededQuantityForRecipeUnit;

      if (itemToDeduct.unit !== ingredient.unit) {
        const converted = convertUnit(neededQuantityForRecipeUnit, ingredient.unit, itemToDeduct.unit);
        if (converted === null) {
          errors.push(`Cannot convert units for ${ingredient.ingredientName} to perform deduction.`);
          continue;
        }
        deductableQuantityInItemUnit = converted;
      }

      if (itemToDeduct.quantity < deductableQuantityInItemUnit) {
        errors.push(`Insufficient quantity for ${ingredient.ingredientName} after unit conversion.`);
        continue;
      }

      const newQuantity = Math.max(0, itemToDeduct.quantity - deductableQuantityInItemUnit);

      setInventory(prev => prev.map((invItem, index) => {
        if (index === itemIndexInMainInventory) {
          const updatedItem = {
            ...invItem,
            quantity: newQuantity,
            lastUpdated: now,
            totalConsumed: (invItem.totalConsumed || 0) + deductableQuantityInItemUnit,
            lastUsedDate: now,
          };
          if (newQuantity <= 0) {
            return {
              ...updatedItem,
              isArchived: true,
              archivedDate: now,
              originalQuantity: invItem.quantity, // original before this deduction
            };
          }
          return updatedItem;
        }
        return invItem;
      }));

      deductedIngredients.push({
        name: ingredient.ingredientName,
        amountDeducted: neededQuantityForRecipeUnit, // Report in recipe unit
        unit: ingredient.unit,
        remainingInInventory: newQuantity, // Report in item's unit
      });
    }

    if (errors.length > 0) {
        // This part needs careful consideration: if some deductions failed, should we roll back?
        // For now, it processes what it can and reports errors.
        console.warn("Errors occurred during ingredient deduction:", errors);
        return { success: false, deductedIngredients, errors };
    }

    return { success: true, deductedIngredients, errors };
  };

  const contextValue: InventoryContextType = {
    inventory,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem, // now archives
    archiveItem,
    unarchiveItem,
    createTemplateFromItem,
    getInventoryItemByName,
    getArchivedItems,
    getActiveItems,
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
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};