import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { InventoryItem, InventoryContextType, Recipe, Unit } from '../../types';
import { generateId, convertUnit, normalizeIngredientName } from '../../constants';
import { useAuth } from './AuthProvider';

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

interface InventoryProviderProps {
  children: ReactNode;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const { currentUser } = useAuth();

  const getStorageKey = () => `inventory_${currentUser?.id || 'anonymous'}`;

  // Load inventory from localStorage when user changes
  useEffect(() => {
    if (currentUser) {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setInventory(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading inventory from localStorage:', error);
          setInventory([]);
        }
      } else {
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

  const addInventoryItem = (item: Omit<InventoryItem, 'id'>): void => {
    const normalizedName = normalizeIngredientName(item.ingredientName);
    
    // Check if item with same name and unit already exists
    const existingItemIndex = inventory.findIndex(
      invItem => normalizeIngredientName(invItem.ingredientName) === normalizedName && invItem.unit === item.unit
    );

    if (existingItemIndex >= 0) {
      // Update existing item quantity
      setInventory(prev => prev.map((invItem, index) => {
        if (index === existingItemIndex) {
          return {
            ...invItem,
            quantity: invItem.quantity + item.quantity,
            // Update other fields if they're provided and different
            lowStockThreshold: item.lowStockThreshold !== undefined ? item.lowStockThreshold : invItem.lowStockThreshold,
            expirationDate: item.expirationDate || invItem.expirationDate,
            frequencyOfUse: item.frequencyOfUse || invItem.frequencyOfUse,
            defaultStoreId: item.defaultStoreId || invItem.defaultStoreId,
          };
        }
        return invItem;
      }));
    } else {
      // Add new item
      const newItem: InventoryItem = {
        id: generateId(),
        ...item,
        ingredientName: normalizedName,
      };
      setInventory(prev => [...prev, newItem]);
    }
  };

  const updateInventoryItem = (item: InventoryItem): void => {
    setInventory(prev => prev.map(invItem => 
      invItem.id === item.id 
        ? { ...item, ingredientName: normalizeIngredientName(item.ingredientName) }
        : invItem
    ));
  };

  const deleteInventoryItem = (itemId: string): void => {
    setInventory(prev => prev.filter(item => item.id !== itemId));
  };

  const getInventoryItemByName = (name: string): InventoryItem | undefined => {
    const normalizedName = normalizeIngredientName(name);
    return inventory.find(item => normalizeIngredientName(item.ingredientName) === normalizedName);
  };

  const deductFromInventory = (ingredientName: string, quantity: number, unit: Unit): boolean => {
    const normalizedName = normalizeIngredientName(ingredientName);
    const itemIndex = inventory.findIndex(item => 
      normalizeIngredientName(item.ingredientName) === normalizedName
    );

    if (itemIndex === -1) return false;

    const item = inventory[itemIndex];
    let deductableQuantity = quantity;

    // Try to convert units if they don't match
    if (item.unit !== unit) {
      const converted = convertUnit(quantity, unit, item.unit);
      if (converted === null) return false; // Cannot convert units
      deductableQuantity = converted;
    }

    if (item.quantity < deductableQuantity) return false;

    // Perform deduction
    setInventory(prev => prev.map((invItem, index) => {
      if (index === itemIndex) {
        const newQuantity = invItem.quantity - deductableQuantity;
        return {
          ...invItem,
          quantity: Math.max(0, newQuantity)
        };
      }
      return invItem;
    }));

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
      const itemIndex = inventory.findIndex(item => 
        normalizeIngredientName(item.ingredientName) === normalizedName
      );

      if (itemIndex === -1) {
        errors.push(`Ingredient not found in inventory: ${ingredient.ingredientName}`);
        continue;
      }

      const item = inventory[itemIndex];
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
      
      setInventory(prev => prev.map((invItem, index) => {
        if (index === itemIndex) {
          return { ...invItem, quantity: newQuantity };
        }
        return invItem;
      }));

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
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}; 