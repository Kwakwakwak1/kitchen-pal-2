import React, { useState, useEffect, createContext, useContext, useCallback, ReactNode, FormEvent, ReactElement, ChangeEvent, FocusEvent, useMemo } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  Recipe, RecipeIngredient, Store, ShoppingList, ShoppingListItem, Unit, FrequencyOfUse, MeasurementSystem, User, UserPreferences,
  RecipesContextType,
  // InventoryContextType, // Will be redefined for EnhancedInventoryItem
  StoresContextType, ShoppingListsContextType, AppStateContextType, AuthContextType, ActiveView, ScrapedRecipeData, RecipeInventoryAnalysis, ShoppingListStatus,
  EnhancedInventoryItem, ItemCategory, DEFAULT_CATEGORIES, ItemTemplate // Added new types
} from './types';
import { saveState, loadState } from './localStorageService';
import { 
  generateId, UNITS_ARRAY, FREQUENCY_OF_USE_OPTIONS, normalizeIngredientName, convertUnit, isItemExpiringSoon, isItemExpired, APP_NAME,
  LOCAL_STORAGE_USERS_KEY, ACTIVE_USER_ID_KEY, isDiscreteUnit, formatQuantityForUnit
} from './constants';
import { runMigrationIfNeeded } from './src/utils/migration'; // Added migration utility
import { 
  BookOpenIcon, ArchiveBoxIcon, ShoppingCartIcon, BuildingStorefrontIcon, PlusIcon, TrashIcon, PencilIcon,
  ArrowLeftIcon, MagnifyingGlassIcon, DEFAULT_RECIPE_IMAGE, DEFAULT_AVATAR_IMAGE,
  SparklesIcon, CubeTransparentIcon, UserCircleIcon, ArrowRightOnRectangleIcon, UserPlusIcon, ArrowLeftOnRectangleIcon,
  XMarkIcon, ArrowPathIcon
} from './constants';
import { Modal, Button, InputField, TextAreaField, SelectField, Card, SearchInput, EmptyState, AddItemButton, CheckboxField, Alert } from './components';
import { IngredientCorrectionButton, FixAllIngredientsButton } from './components/IngredientCorrectionButton';
import { scrapeRecipeFromUrl, validateRecipeUrl } from './services/recipeScrapingService';
import { normalizeScrapedRecipe, validateNormalizedRecipe } from './utils/recipeNormalizer';
import { ServingSizeSelector } from './components/ServingSizeSelector';
import { ScaledIngredientsList } from './components/ScaledIngredientsList';
import { scaleIngredients, type ScaledIngredient } from './utils/recipeScaling';
import { InteractiveInstructions } from './components/InteractiveInstructions';
import { analyzeRecipeInventory } from './utils/recipeAnalyzer';
import { useRecipeCollectionAnalysis } from './utils/hooks';
import { ShoppingListDetailPage } from './src/pages/ShoppingListDetailPage';
import DashboardPage from './src/pages/dashboard/DashboardPage';
import InventoryStatusBadge from './src/components/shared/InventoryStatusBadge';
import InventoryAnalysisCard from './src/components/shared/InventoryAnalysisCard';
import ProtectedRoute from './src/components/shared/ProtectedRoute';
import StoresPage from './src/pages/stores/StoresPage';
import LoginPage from './src/pages/auth/LoginPage';
import SignupPage from './src/pages/auth/SignupPage';
import ProfilePage from './src/pages/auth/ProfilePage';


// --- CONTEXTS ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const RecipesContext = createContext<RecipesContextType | undefined>(undefined);
// const InventoryContext = createContext<InventoryContextType | undefined>(undefined); // Redefined below
const StoresContext = createContext<StoresContextType | undefined>(undefined);
const ShoppingListsContext = createContext<ShoppingListsContextType | undefined>(undefined);
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// New Categories Context
export interface CategoriesContextType {
  categories: ItemCategory[];
  addCategory: (categoryData: Omit<ItemCategory, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'isDefault'> & Partial<Pick<ItemCategory, 'sortOrder' | 'isDefault'>>) => string;
  updateCategory: (category: ItemCategory) => void;
  deleteCategory: (categoryId: string, reassignToCategoryId?: string) => void;
  getCategoryById: (categoryId: string) => ItemCategory | undefined;
  getDefaultCategoryId: () => string | undefined;
  getCategoryByName: (name: string) => ItemCategory | undefined;
  reorderCategories: (orderedIds: string[]) => void;
  isLoadingCategories: boolean;
}
const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);


// Updated Inventory Context Type
export interface InventoryContextType {
  inventory: EnhancedInventoryItem[];
  addInventoryItem: (item: Omit<EnhancedInventoryItem, 'id' | 'addedDate' | 'lastUpdated' | 'isArchived' | 'archivedDate' | 'originalQuantity' | 'timesRestocked' | 'totalConsumed' | 'averageConsumptionRate' | 'lastUsedDate'>) => void;
  updateInventoryItem: (item: EnhancedInventoryItem) => void;
  deleteInventoryItem: (itemId: string) => void; // This will now archive
  archiveItem: (itemId: string) => void;
  unarchiveItem: (itemId: string, quantity?: number) => void;
  createTemplateFromItem: (itemId: string) => ItemTemplate | undefined;
  getInventoryItemByName: (name: string) => EnhancedInventoryItem | undefined;
  getActiveItems: () => EnhancedInventoryItem[];
  getArchivedItems: () => EnhancedInventoryItem[];
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


// --- HOOKS for contexts ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
export const useRecipes = (): RecipesContextType => {
  const context = useContext(RecipesContext);
  if (!context) throw new Error('useRecipes must be used within a RecipesProvider');
  return context;
};
export const useInventory = (): InventoryContextType => { // Now returns the new type
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
};
export const useCategories = (): CategoriesContextType => {
  const context = useContext(CategoriesContext);
  if (!context) throw new Error('useCategories must be used within a CategoriesProvider');
  return context;
};
export const useStores = (): StoresContextType => {
  const context = useContext(StoresContext);
  if (!context) throw new Error('useStores must be used within a StoresProvider');
  return context;
};
export const useShoppingLists = (): ShoppingListsContextType => {
  const context = useContext(ShoppingListsContext);
  if (!context) throw new Error('useShoppingLists must be used within a ShoppingListsProvider');
  return context;
};
export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used within an AppStateProvider');
  return context;
}


// --- PROVIDERS ---

// AUTH PROVIDER
const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => loadState<User[]>(LOCAL_STORAGE_USERS_KEY) || []);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    saveState(LOCAL_STORAGE_USERS_KEY, users);
  }, [users]);

  useEffect(() => {
    const activeUserId = loadState<string>(ACTIVE_USER_ID_KEY);
    if (activeUserId) {
      const userToLogin = users.find(u => u.id === activeUserId);
      if (userToLogin) {
        setCurrentUser(userToLogin);
      } else {
        // Active user ID exists but user not found, clear invalid ID
        localStorage.removeItem(ACTIVE_USER_ID_KEY);
      }
    }
    setIsLoadingAuth(false);
  }, [users]); // Rerun if users array changes (e.g. signup)

  const login = async (email: string, passwordAttempt: string): Promise<boolean> => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    // WARNING: Plaintext password comparison. DO NOT USE IN PRODUCTION.
    if (user && user.passwordHash === passwordAttempt) {
      setCurrentUser(user);
      saveState(ACTIVE_USER_ID_KEY, user.id);
      return true;
    }
    return false;
  };

  const signup = async (name: string, email: string, passwordPlain: string): Promise<boolean> => {
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      alert('User with this email already exists.');
      return false;
    }
    const newUser: User = {
      id: generateId(),
      name,
      email,
      // WARNING: Storing plaintext password. DO NOT USE IN PRODUCTION.
      passwordHash: passwordPlain, 
      preferences: { measurementSystem: MeasurementSystem.METRIC },
    };
    setUsers(prevUsers => [...prevUsers, newUser]);
    // Automatically log in the new user
    setCurrentUser(newUser);
    saveState(ACTIVE_USER_ID_KEY, newUser.id);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(ACTIVE_USER_ID_KEY);
    navigate('/login'); // Redirect to login after logout
  };
  
  const updateUserProfile = async (userId: string, data: Partial<Pick<User, 'name' | 'email' | 'passwordHash'>>): Promise<boolean> => {
    let success = false;
    setUsers(prevUsers => 
      prevUsers.map(user => {
        if (user.id === userId) {
          success = true;
          const updatedUser = { ...user, ...data };
          if(currentUser?.id === userId) setCurrentUser(updatedUser);
          return updatedUser;
        }
        return user;
      })
    );
    return success;
  };

  const updateUserPreferences = async (userId: string, preferences: Partial<UserPreferences>): Promise<boolean> => {
    let success = false;
    setUsers(prevUsers =>
      prevUsers.map(user => {
        if (user.id === userId) {
          success = true;
          const updatedUser = { ...user, preferences: { ...user.preferences, ...preferences } };
           if(currentUser?.id === userId) setCurrentUser(updatedUser);
          return updatedUser;
        }
        return user;
      })
    );
    return success;
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, signup, logout, updateUserProfile, updateUserPreferences, isLoadingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};


const RecipesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const userRecipesKey = currentUser ? `recipes_${currentUser.id}` : null;
  const globalRecipesKey = 'recipes';

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    if (currentUser && userRecipesKey) {
      const userSpecificData = loadState<Recipe[]>(userRecipesKey);
      if (userSpecificData) return userSpecificData;
      const globalData = loadState<Recipe[]>(globalRecipesKey);
      if (globalData) {
        saveState(userRecipesKey, globalData);
        return globalData;
      }
    }
    return [];
  });

  useEffect(() => {
    if (currentUser && userRecipesKey) {
      const userSpecificData = loadState<Recipe[]>(userRecipesKey);
      if (userSpecificData) {
        setRecipes(userSpecificData);
      } else {
        const globalData = loadState<Recipe[]>(globalRecipesKey);
        if (globalData) {
          setRecipes(globalData);
          saveState(userRecipesKey, globalData);
        } else {
          setRecipes([]);
        }
      }
    } else if (!currentUser) {
      setRecipes([]);
    }
  }, [currentUser, userRecipesKey]);

  useEffect(() => {
    if (userRecipesKey && currentUser) {
      saveState(userRecipesKey, recipes);
    }
  }, [recipes, userRecipesKey, currentUser]);

  const addRecipe = (recipeData: Omit<Recipe, 'id' | 'imageUrl'>) => {
    if (!currentUser) return;
    const newRecipe: Recipe = { 
      ...recipeData, 
      id: generateId(),
      imageUrl: `https://picsum.photos/seed/${generateId()}/400/300` 
    };
    setRecipes(prev => [...prev, newRecipe]);
  };
  const updateRecipe = (updatedRecipe: Recipe) => {
    if (!currentUser) return;
    setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
  }
  const deleteRecipe = (recipeId: string) => {
    if (!currentUser) return;
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
  }
  const getRecipeById = (recipeId: string) => recipes.find(r => r.id === recipeId);
  
  return <RecipesContext.Provider value={{ recipes, addRecipe, updateRecipe, deleteRecipe, getRecipeById }}>{children}</RecipesContext.Provider>;
};

const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  // const { getDefaultCategoryId } = useCategories(); // Available if needed for default category logic
  const userInventoryKey = currentUser ? `enhanced_inventory_${currentUser.id}` : null; // UPDATED KEY

  const [inventory, setInventory] = useState<EnhancedInventoryItem[]>(() => {
    if (currentUser && userInventoryKey) {
      const userSpecificData = loadState<EnhancedInventoryItem[]>(userInventoryKey);
      // No global data migration here; migration_runner handles old 'inventory_*' key
      return userSpecificData || [];
    }
    return [];
  });

  useEffect(() => {
    if (currentUser && userInventoryKey) {
      const userSpecificData = loadState<EnhancedInventoryItem[]>(userInventoryKey);
      setInventory(userSpecificData || []);
    } else if (!currentUser) {
      setInventory([]);
    }
  }, [currentUser, userInventoryKey]);

  useEffect(() => {
    if (userInventoryKey && currentUser) {
      saveState(userInventoryKey, inventory);
    }
  }, [inventory, userInventoryKey, currentUser]);

  const archiveItem = useCallback((itemId: string, internalCall: boolean = false) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    const updateFn = (prev: EnhancedInventoryItem[]) => prev.map(item => {
      if (item.id === itemId && !item.isArchived) {
        return {
          ...item,
          quantity: 0,
          isArchived: true,
          archivedDate: now,
          originalQuantity: item.quantity > 0 ? item.quantity : item.originalQuantity || 0,
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
  }, [currentUser]);

  const addInventoryItem = (itemData: Omit<EnhancedInventoryItem, 'id' | 'addedDate' | 'lastUpdated' | 'isArchived' | 'archivedDate' | 'originalQuantity' | 'timesRestocked' | 'totalConsumed' | 'averageConsumptionRate' | 'lastUsedDate'>) => {
    if (!currentUser) return;
    const normalizedName = normalizeIngredientName(itemData.ingredientName);
    const now = new Date().toISOString();

    setInventory(prevInventory => {
      const existingItemIndex = prevInventory.findIndex(
        invItem => normalizeIngredientName(invItem.ingredientName) === normalizedName && invItem.unit === itemData.unit
      );

      if (existingItemIndex >= 0) {
        return prevInventory.map((invItem, index) => {
          if (index === existingItemIndex) {
            const updatedQty = invItem.quantity + itemData.quantity;
            const itemToUpdate: EnhancedInventoryItem = {
              ...invItem,
              ...itemData,
              quantity: updatedQty,
              lastUpdated: now,
              isArchived: false, // Unarchive if adding
              archivedDate: undefined,
              originalQuantity: undefined, // Clear original quantity from archive
              timesRestocked: invItem.isArchived ? (invItem.timesRestocked || 0) + 1 : invItem.timesRestocked,
            };
            if (updatedQty <= 0) { // Should not happen if itemData.quantity is positive
                archiveItem(itemToUpdate.id, true); // Use internal call
                // This needs to be careful about state updates, archiveItem will setInventory again.
                // For simplicity, let's assume itemData.quantity is always positive when adding.
                // If it can be zero/negative, this logic needs adjustment.
            }
            return itemToUpdate;
          }
          return invItem;
        });
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
        };
        if (newItem.quantity <= 0) { // Handle cases where item is added with 0 or negative quantity
          newItem.isArchived = true;
          newItem.archivedDate = now;
          newItem.originalQuantity = newItem.quantity;
          newItem.quantity = 0;
        }
        return [...prevInventory, newItem];
      }
    });
  };

  const updateInventoryItem = (item: EnhancedInventoryItem) => {
    if (!currentUser) return;
    const now = new Date().toISOString();
    setInventory(prev => prev.map(invItem => {
      if (invItem.id === item.id) {
        const updatedItem = {
          ...item,
          ingredientName: normalizeIngredientName(item.ingredientName),
          lastUpdated: now
        };
        if (updatedItem.quantity <= 0 && !updatedItem.isArchived) {
          // Directly set archive fields or call archiveItem
          return {
            ...updatedItem,
            quantity: 0,
            isArchived: true,
            archivedDate: now,
            originalQuantity: invItem.quantity, // Store last positive quantity before this update
          };
        }
        return updatedItem;
      }
      return invItem;
    }));
  };

  const unarchiveItem = (itemId: string, quantity?: number) => {
    if (!currentUser) return;
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

  const deleteInventoryItem = (itemId: string) => { // Now archives
    if (!currentUser) return;
    archiveItem(itemId);
  };

  const createTemplateFromItem = (itemId: string): ItemTemplate | undefined => {
    if (!currentUser) return undefined;
    const item = inventory.find(invItem => invItem.id === itemId);
    if (!item) return undefined;

    return {
      id: generateId(),
      ingredientName: item.ingredientName,
      unit: item.unit,
      categoryId: item.categoryId,
      defaultStoreId: item.defaultStoreId,
      brand: item.brand,
      notes: item.notes,
      averageQuantity: item.isArchived && item.quantity === 0
                       ? (item.originalQuantity || 1)
                       : (item.quantity > 0 ? item.quantity : 1),
      typicalLowStockThreshold: item.lowStockThreshold,
      frequencyOfUse: item.frequencyOfUse,
      timesUsed: 0,
      lastUsedDate: new Date().toISOString(),
      createdFrom: item.isArchived ? 'archive' : 'manual',
      sourceItemId: item.id,
    };
  };

  const getInventoryItemByName = (name: string) => {
    const normalizedNameSearch = normalizeIngredientName(name);
    return inventory.find(i => normalizeIngredientName(i.ingredientName) === normalizedNameSearch && !i.isArchived) ||
           inventory.find(i => normalizeIngredientName(i.ingredientName) === normalizedNameSearch && i.isArchived);
  };

  const getActiveItems = () => inventory.filter(item => !item.isArchived);
  const getArchivedItems = () => inventory.filter(item => item.isArchived);

  const deductFromInventory = (ingredientName: string, quantity: number, unit: Unit): boolean => {
    if (!currentUser) return false;
    const normalizedName = normalizeIngredientName(ingredientName);
    
    // Find the inventory item first to validate the deduction
    const normalizedName = normalizeIngredientName(ingredientName);
    const activeInventory = getActiveItems(); // Use active items for deduction
    const itemIndex = activeInventory.findIndex(item =>
      normalizeIngredientName(item.ingredientName) === normalizedName
    );

    if (itemIndex === -1) {
      console.log(`Deduction failed: Item "${ingredientName}" not found in active inventory`);
      return false;
    }

    const item = activeInventory[itemIndex];
    let deductableQuantity = quantity;

    if (item.unit !== unit) {
      const converted = convertUnit(quantity, unit, item.unit);
      if (converted === null) {
        console.log(`Deduction failed: Cannot convert ${quantity} ${unit} to ${item.unit} for ${ingredientName}`);
        return false;
      }
      deductableQuantity = converted;
    }

    if (item.quantity < deductableQuantity) {
      console.log(`Deduction failed: Insufficient ${ingredientName}. Have ${item.quantity} ${item.unit}, need ${deductableQuantity} ${item.unit}`);
      return false;
    }
    
    const now = new Date().toISOString();
    setInventory(prev => prev.map(invItem => {
      if (invItem.id === item.id) {
        const newQuantity = Math.max(0, invItem.quantity - deductableQuantity);
        const updatedInvItem: EnhancedInventoryItem = {
          ...invItem,
          quantity: formatQuantityForUnit(newQuantity, invItem.unit),
          lastUpdated: now,
          totalConsumed: (invItem.totalConsumed || 0) + deductableQuantity,
          lastUsedDate: now,
        };
        if (updatedInvItem.quantity <= 0) {
          return { // Archive it
            ...updatedInvItem,
            isArchived: true,
            archivedDate: now,
            originalQuantity: invItem.quantity, // Store quantity before this deduction
          };
        }
        return updatedInvItem;
      }
      return invItem;
    }));
    return true;
  };

  const validateRecipePreparation = (recipe: Recipe, requestedServings: number) => {
    const requiredIngredients = recipe.ingredients.filter(ing => !ing.isOptional);
    const missingIngredients: Array<{name: string; needed: number; available: number; unit: string}> = [];
    const warnings: string[] = [];
    const activeInventory = getActiveItems(); // Use active items for validation
    
    for (const ingredient of requiredIngredients) {
      const normalizedName = normalizeIngredientName(ingredient.ingredientName);
      const inventoryItem = activeInventory.find(item =>
        normalizeIngredientName(item.ingredientName) === normalizedName
      );
      const neededQuantity = (ingredient.quantity / recipe.defaultServings) * requestedServings;
      
      if (!inventoryItem) {
        missingIngredients.push({ name: ingredient.ingredientName, needed: neededQuantity, available: 0, unit: ingredient.unit });
        continue;
      }
      const convertedAvailable = convertUnit(inventoryItem.quantity, inventoryItem.unit, ingredient.unit);
      if (convertedAvailable === null) {
        warnings.push(`Cannot convert ${inventoryItem.unit} to ${ingredient.unit} for ${ingredient.ingredientName}`);
        missingIngredients.push({ name: ingredient.ingredientName, needed: neededQuantity, available: 0, unit: ingredient.unit });
        continue;
      }
      if (convertedAvailable < neededQuantity) {
        missingIngredients.push({ name: ingredient.ingredientName, needed: neededQuantity, available: convertedAvailable, unit: ingredient.unit });
      }
    }
    return { canPrepare: missingIngredients.length === 0, missingIngredients, warnings };
  };

  const deductIngredientsForPreparation = (recipe: Recipe, preparedServings: number) => {
    const deductedIngredients: Array<{ name: string; amountDeducted: number; unit: string; remainingInInventory: number; }> = [];
    const errors: string[] = [];
    const validation = validateRecipePreparation(recipe, preparedServings);

    if (!validation.canPrepare) {
      return { success: false, deductedIngredients: [], errors: validation.missingIngredients.map(ing => `Insufficient ${ing.name}`) };
    }

    const requiredIngredients = recipe.ingredients.filter(ing => !ing.isOptional);
    const now = new Date().toISOString();

    for (const ingredient of requiredIngredients) {
      const neededQuantityForRecipeUnit = (ingredient.quantity / recipe.defaultServings) * preparedServings;
      const normalizedName = normalizeIngredientName(ingredient.ingredientName);
      
      const itemIndexInMainInventory = inventory.findIndex(item =>
        normalizeIngredientName(item.ingredientName) === normalizedName && !item.isArchived
      );

      if (itemIndexInMainInventory === -1) { // Should not happen if validation passed
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
      
      // This check should have been covered by validateRecipePreparation
      if (itemToDeduct.quantity < deductableQuantityInItemUnit) {
        errors.push(`Insufficient quantity for ${ingredient.ingredientName} (should have been caught by validation).`);
        continue;
      }

      const newQuantity = Math.max(0, itemToDeduct.quantity - deductableQuantityInItemUnit);

      setInventory(prev => prev.map((invItem, index) => {
        if (index === itemIndexInMainInventory) {
          const updatedItem: EnhancedInventoryItem = {
            ...invItem,
            quantity: formatQuantityForUnit(newQuantity, invItem.unit),
            lastUpdated: now,
            totalConsumed: (invItem.totalConsumed || 0) + deductableQuantityInItemUnit,
            lastUsedDate: now,
          };
          if (updatedItem.quantity <= 0) {
            return { // Archive it
              ...updatedItem,
              isArchived: true,
              archivedDate: now,
              originalQuantity: invItem.quantity,
            };
          }
          return updatedItem;
        }
        return invItem;
      }));
      
      // After state update, find the item again to report remaining quantity
      const itemAfterDeduction = inventory.find(i => i.id === itemToDeduct.id);
      const remainingInRecipeUnit = itemAfterDeduction ? convertUnit(itemAfterDeduction.quantity, itemAfterDeduction.unit, ingredient.unit) : 0;

      deductedIngredients.push({
        name: ingredient.ingredientName,
        amountDeducted: neededQuantityForRecipeUnit,
        unit: ingredient.unit,
        remainingInInventory: remainingInRecipeUnit || 0,
      });
    }
    return { success: errors.length === 0, deductedIngredients, errors };
  };

  return (
    <InventoryContext.Provider
      value={{
        inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem,
        archiveItem, unarchiveItem, createTemplateFromItem,
        getInventoryItemByName, getActiveItems, getArchivedItems,
        deductFromInventory, validateRecipePreparation, deductIngredientsForPreparation
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};


// CATEGORIES PROVIDER (New Inline Provider)
const CategoriesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(true);
  const storageKey = currentUser ? `categories_${currentUser.id}` : null;

  useEffect(() => {
    if (currentUser && storageKey) {
      setIsLoadingCategories(true);
      try {
        const storedCategories = loadState<ItemCategory[]>(storageKey);
        if (storedCategories && storedCategories.length > 0) {
          setCategories(storedCategories.sort((a,b) => a.sortOrder - b.sortOrder));
        } else {
          const initialCategories: ItemCategory[] = DEFAULT_CATEGORIES.map((cat, index) => ({
            ...cat,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sortOrder: cat.sortOrder !== undefined ? cat.sortOrder : index + 1,
            isDefault: cat.isDefault !== undefined ? cat.isDefault : false,
          })).sort((a,b) => a.sortOrder - b.sortOrder);
          setCategories(initialCategories);
          saveState(storageKey, initialCategories);
        }
      } catch (error) {
        console.error("Failed to load categories, initializing defaults:", error);
        const initialCategories: ItemCategory[] = DEFAULT_CATEGORIES.map((cat, index) => ({
            ...cat,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sortOrder: cat.sortOrder !== undefined ? cat.sortOrder : index + 1,
            isDefault: cat.isDefault !== undefined ? cat.isDefault : false,
          })).sort((a,b) => a.sortOrder - b.sortOrder);
        setCategories(initialCategories);
        if (storageKey) saveState(storageKey, initialCategories);
      } finally {
        setIsLoadingCategories(false);
      }
    } else if (!currentUser) {
      setCategories([]); // Clear categories if logged out
      setIsLoadingCategories(false);
    }
  }, [currentUser, storageKey]);

  useEffect(() => {
    if (storageKey && currentUser && !isLoadingCategories) {
      saveState(storageKey, categories);
    }
  }, [categories, storageKey, currentUser, isLoadingCategories]);

  const addCategory = (categoryData: Omit<ItemCategory, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'isDefault'> & Partial<Pick<ItemCategory, 'sortOrder' | 'isDefault'>>): string => {
    if (!currentUser) return '';
    const now = new Date().toISOString();
    const maxSortOrder = categories.reduce((max, cat) => Math.max(max, cat.sortOrder), 0);
    const newCategory: ItemCategory = {
      id: generateId(),
      name: categoryData.name,
      description: categoryData.description,
      color: categoryData.color,
      icon: categoryData.icon,
      createdAt: now,
      updatedAt: now,
      sortOrder: categoryData.sortOrder !== undefined ? categoryData.sortOrder : maxSortOrder + 1,
      isDefault: categoryData.isDefault !== undefined ? categoryData.isDefault : false,
    };
    setCategories(prev => [...prev, newCategory].sort((a,b) => a.sortOrder - b.sortOrder));
    return newCategory.id;
  };

  const updateCategory = (updatedCategory: ItemCategory) => {
    if (!currentUser) return;
    setCategories(prev =>
      prev.map(cat =>
        cat.id === updatedCategory.id
          ? { ...updatedCategory, updatedAt: new Date().toISOString() }
          : cat
      ).sort((a,b) => a.sortOrder - b.sortOrder)
    );
  };

  const deleteCategory = (categoryId: string, reassignToCategoryId?: string) => {
    if (!currentUser) return;
    // Basic deletion. Reassignment of items in InventoryProvider would be needed.
    const categoryToDelete = categories.find(cat => cat.id === categoryId);
    if (!categoryToDelete) return;

    if (categoryToDelete.name.toLowerCase() === 'uncategorized') {
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
    // TODO: Trigger item reassignment in InventoryContext if reassignToCategoryId is provided.
  };

  const getCategoryById = (categoryId: string) => categories.find(cat => cat.id === categoryId);
  const getCategoryByName = (name: string) => categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());
  
  const getDefaultCategoryId = (): string | undefined => {
    const defaultCat = categories.find(cat => cat.isDefault === true);
    if (defaultCat) return defaultCat.id;
    const uncategorized = categories.find(cat => cat.name.toLowerCase() === 'uncategorized');
    return uncategorized?.id;
  };

  const reorderCategories = (orderedIds: string[]) => {
    if (!currentUser) return;
    const reordered = orderedIds.map((id, index) => {
      const category = categories.find(cat => cat.id === id);
      if (category) return { ...category, sortOrder: index + 1 };
      return null;
    }).filter(Boolean) as ItemCategory[];

    const remaining = categories.filter(cat => !orderedIds.includes(cat.id))
      .sort((a,b) => a.sortOrder - b.sortOrder) // keep original relative order
      .map((cat, index) => ({ ...cat, sortOrder: reordered.length + index + 1 }));

    setCategories([...reordered, ...remaining]);
  };

  return (
    <CategoriesContext.Provider value={{ categories, addCategory, updateCategory, deleteCategory, getCategoryById, getDefaultCategoryId, getCategoryByName, reorderCategories, isLoadingCategories }}>
      {children}
    </CategoriesContext.Provider>
  );
};


const StoresProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const userStoresKey = currentUser ? `stores_${currentUser.id}` : null;
  const globalStoresKey = 'stores';

  const [stores, setStores] = useState<Store[]>(() => {
    if (currentUser && userStoresKey) {
      const userSpecificData = loadState<Store[]>(userStoresKey);
      if (userSpecificData) return userSpecificData;
      const globalData = loadState<Store[]>(globalStoresKey);
      if (globalData) {
        saveState(userStoresKey, globalData);
        return globalData;
      }
    }
    return [];
  });

  useEffect(() => {
     if (currentUser && userStoresKey) {
      const userSpecificData = loadState<Store[]>(userStoresKey);
      if (userSpecificData) {
        setStores(userSpecificData);
      } else {
        const globalData = loadState<Store[]>(globalStoresKey);
        if (globalData) {
          setStores(globalData);
          saveState(userStoresKey, globalData);
        } else {
          setStores([]);
        }
      }
    } else if (!currentUser) {
      setStores([]);
    }
  }, [currentUser, userStoresKey]);

  useEffect(() => {
    if (userStoresKey && currentUser) {
      saveState(userStoresKey, stores);
    }
  }, [stores, userStoresKey, currentUser]);

  const addStore = (storeData: Omit<Store, 'id'>) => {
    if(!currentUser) return;
    setStores(prev => [...prev, { ...storeData, id: generateId() }]);
  }
  const updateStore = (updatedStore: Store) => {
    if(!currentUser) return;
    setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
  }
  const deleteStore = (storeId: string) => {
    if(!currentUser) return;
    setStores(prev => prev.filter(s => s.id !== storeId));
  }
  const getStoreById = (storeId: string) => stores.find(s => s.id === storeId);

  return <StoresContext.Provider value={{ stores, addStore, updateStore, deleteStore, getStoreById }}>{children}</StoresContext.Provider>;
};

const ShoppingListsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const userShoppingListsKey = currentUser ? `shoppingLists_${currentUser.id}` : null;
  const userArchivedListsKey = currentUser ? `archivedShoppingLists_${currentUser.id}` : null;
  const globalShoppingListsKey = 'shoppingLists';
  
  // Migration function for existing data
  const migrateShoppingListsToNewFormat = (existingLists: any[]): ShoppingList[] => {
    return existingLists.map(list => ({
      ...list,
      status: determineListStatus(list),
      completedAt: list.items && list.items.every((item: any) => item.purchased) ? list.createdAt : undefined,
      archivedAt: undefined
    }));
  };

  const determineListStatus = (list: any): ShoppingListStatus => {
    if (!list.items || list.items.length === 0) return ShoppingListStatus.ACTIVE;
    if (list.items.every((item: any) => item.purchased)) return ShoppingListStatus.COMPLETED;
    return ShoppingListStatus.ACTIVE;
  };

  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>(() => {
    if (currentUser && userShoppingListsKey) {
      const userSpecificData = loadState<ShoppingList[]>(userShoppingListsKey);
      if (userSpecificData) {
        // Check if data needs migration (doesn't have status field)
        const needsMigration = userSpecificData.some((list: any) => !list.status);
        return needsMigration ? migrateShoppingListsToNewFormat(userSpecificData) : userSpecificData;
      }
      const globalData = loadState<ShoppingList[]>(globalShoppingListsKey);
      if (globalData) {
        const migratedData = migrateShoppingListsToNewFormat(globalData);
        saveState(userShoppingListsKey, migratedData);
        return migratedData;
      }
    }
    return [];
  });

  const [archivedShoppingLists, setArchivedShoppingLists] = useState<ShoppingList[]>(() => {
    if (currentUser && userArchivedListsKey) {
      const archivedData = loadState<ShoppingList[]>(userArchivedListsKey);
      return archivedData || [];
    }
    return [];
  });

  useEffect(() => {
    if (currentUser && userShoppingListsKey) {
      const userSpecificData = loadState<ShoppingList[]>(userShoppingListsKey);
      if (userSpecificData) {
        const needsMigration = userSpecificData.some((list: any) => !list.status);
        const finalData = needsMigration ? migrateShoppingListsToNewFormat(userSpecificData) : userSpecificData;
        setShoppingLists(finalData);
        if (needsMigration) {
          saveState(userShoppingListsKey, finalData);
        }
      } else {
        const globalData = loadState<ShoppingList[]>(globalShoppingListsKey);
        if (globalData) {
          const migratedData = migrateShoppingListsToNewFormat(globalData);
          setShoppingLists(migratedData);
          saveState(userShoppingListsKey, migratedData);
        } else {
          setShoppingLists([]);
        }
      }
    } else if (!currentUser) {
      setShoppingLists([]);
      setArchivedShoppingLists([]);
    }
  }, [currentUser, userShoppingListsKey]);

  useEffect(() => {
    if (currentUser && userArchivedListsKey) {
      const archivedData = loadState<ShoppingList[]>(userArchivedListsKey);
      setArchivedShoppingLists(archivedData || []);
    }
  }, [currentUser, userArchivedListsKey]);

  useEffect(() => {
    if (userShoppingListsKey && currentUser) {
      saveState(userShoppingListsKey, shoppingLists);
    }
  }, [shoppingLists, userShoppingListsKey, currentUser]);

  useEffect(() => {
    if (userArchivedListsKey && currentUser) {
      saveState(userArchivedListsKey, archivedShoppingLists);
    }
  }, [archivedShoppingLists, userArchivedListsKey, currentUser]);

  const addShoppingList = (listData: Omit<ShoppingList, 'id' | 'createdAt' | 'status'>): string => {
    if (!currentUser) return '';
    const newList: ShoppingList = { 
      ...listData, 
      id: generateId(), 
      createdAt: new Date().toISOString(),
      status: ShoppingListStatus.ACTIVE
    };
    setShoppingLists(prev => [newList, ...prev]);
    return newList.id;
  };

  const updateShoppingList = (updatedList: ShoppingList) => {
    if (!currentUser) return;
    
    // Auto-update status based on items
    const allItemsPurchased = updatedList.items.length > 0 && updatedList.items.every(item => item.purchased);
    const updatedStatus = allItemsPurchased ? ShoppingListStatus.COMPLETED : ShoppingListStatus.ACTIVE;
    
    const finalList = {
      ...updatedList,
      status: updatedStatus,
      completedAt: allItemsPurchased && !updatedList.completedAt ? new Date().toISOString() : updatedList.completedAt
    };

    setShoppingLists(prev => prev.map(sl => sl.id === finalList.id ? finalList : sl));
  };

  const deleteShoppingList = (listId: string) => {
    if (!currentUser) return;
    setShoppingLists(prev => prev.filter(sl => sl.id !== listId));
  };

  const archiveShoppingList = (listId: string) => {
    if (!currentUser) return;
    
    const listToArchive = shoppingLists.find(sl => sl.id === listId);
    if (listToArchive && listToArchive.status === ShoppingListStatus.COMPLETED) {
      const archivedList = {
        ...listToArchive,
        status: ShoppingListStatus.ARCHIVED,
        archivedAt: new Date().toISOString()
      };
      
      setArchivedShoppingLists(prev => [archivedList, ...prev]);
      setShoppingLists(prev => prev.filter(sl => sl.id !== listId));
    }
  };

  const unarchiveShoppingList = (listId: string) => {
    if (!currentUser) return;
    
    const archivedList = archivedShoppingLists.find(sl => sl.id === listId);
    if (archivedList) {
      const restoredList = {
        ...archivedList,
        status: ShoppingListStatus.COMPLETED,
        archivedAt: undefined
      };
      
      setShoppingLists(prev => [restoredList, ...prev]);
      setArchivedShoppingLists(prev => prev.filter(sl => sl.id !== listId));
    }
  };

  const deleteArchivedShoppingList = (listId: string) => {
    if (!currentUser) return;
    setArchivedShoppingLists(prev => prev.filter(sl => sl.id !== listId));
  };

  const bulkDeleteShoppingLists = (listIds: string[]) => {
    if (!currentUser) return;
    setShoppingLists(prev => prev.filter(sl => !listIds.includes(sl.id)));
  };

  const bulkArchiveShoppingLists = (listIds: string[]) => {
    if (!currentUser) return;
    
    const listsToArchive = shoppingLists.filter(sl => 
      listIds.includes(sl.id) && sl.status === ShoppingListStatus.COMPLETED
    );
    
    const archivedLists = listsToArchive.map(list => ({
      ...list,
      status: ShoppingListStatus.ARCHIVED,
      archivedAt: new Date().toISOString()
    }));
    
    setArchivedShoppingLists(prev => [...archivedLists, ...prev]);
    setShoppingLists(prev => prev.filter(sl => !listIds.includes(sl.id)));
  };

  const bulkDeleteArchivedShoppingLists = (listIds: string[]) => {
    if (!currentUser) return;
    setArchivedShoppingLists(prev => prev.filter(sl => !listIds.includes(sl.id)));
  };

  const getShoppingListById = (listId: string) => {
    return shoppingLists.find(sl => sl.id === listId) || archivedShoppingLists.find(sl => sl.id === listId);
  };

  return (
    <ShoppingListsContext.Provider 
      value={{ 
        shoppingLists: shoppingLists.filter(sl => sl.status !== ShoppingListStatus.ARCHIVED), 
        archivedShoppingLists,
        addShoppingList, 
        updateShoppingList, 
        deleteShoppingList,
        archiveShoppingList,
        unarchiveShoppingList,
        deleteArchivedShoppingList,
        bulkDeleteShoppingLists,
        bulkArchiveShoppingLists,
        bulkDeleteArchivedShoppingLists,
        getShoppingListById 
      }}
    >
      {children}
    </ShoppingListsContext.Provider>
  );
};

const AppStateProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  
  const getActiveViewFromPath = (pathname: string): ActiveView => {
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const view = pathSegments[0] as ActiveView;
      const validViews: ActiveView[] = ['dashboard', 'recipes', 'inventory', 'shopping_lists', 'stores', 'recipe_detail', 'shopping_list_detail', 'generate_shopping_list', 'login', 'signup', 'profile'];
      if (validViews.includes(view)) return view;
    }
    return currentUser ? 'dashboard' : 'login'; // Default to dashboard if logged in, else login
  };

  const [activeView, _setActiveView] = useState<ActiveView>(getActiveViewFromPath(location.pathname));
  const [viewParams, setViewParams] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isLoadingAuth) return; // Don't run this effect until auth state is resolved

    const currentPathView = getActiveViewFromPath(location.pathname);
    _setActiveView(currentPathView);

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const params: Record<string, string> = {};

    if (pathSegments.length > 1 && (pathSegments[0] === 'recipe_detail' || pathSegments[0] === 'shopping_list_detail')) {
      params.id = pathSegments[1];
    } else if (pathSegments[0] === 'generate_shopping_list' && location.search) {
       const queryParams = new URLSearchParams(location.search);
       params.recipeIds = queryParams.get('recipeIds') || '';
    }
    setViewParams(params);

  }, [location.pathname, location.search, currentUser, isLoadingAuth, navigate]);


  const setActiveView = useCallback((view: ActiveView, params?: Record<string, string>) => {
    if (isLoadingAuth) return; 

    _setActiveView(view);
    const currentParams = params || {};
    setViewParams(currentParams);
    
    let path = `/${view}`;
    if (currentParams?.id) {
      path += `/${currentParams.id}`;
    } else if (view === 'generate_shopping_list' && currentParams?.recipeIds) {
      path += `?recipeIds=${currentParams.recipeIds}`;
    }
    navigate(path);
    setSearchTerm(''); 
  }, [navigate, isLoadingAuth]);

  return (
    <AppStateContext.Provider value={{ activeView, setActiveView, viewParams, searchTerm, setSearchTerm }}>
      {children}
    </AppStateContext.Provider>
  );
};


// --- UI COMPONENTS (Feature Specific) ---

// Recipe URL Import Component
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

const RecipeUrlImport: React.FC<RecipeUrlImportProps> = ({ onImport, onCancel }) => {
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

// Recipe Form
interface RecipeFormProps {
  initialRecipe?: Recipe;
  onSave: (recipe: Omit<Recipe, 'id' | 'imageUrl'> | Recipe) => void;
  onClose: () => void;
}
const RecipeForm: React.FC<RecipeFormProps> = ({ initialRecipe, onSave, onClose }) => {
  const [showUrlImport, setShowUrlImport] = useState(false);
  const [name, setName] = useState(initialRecipe?.name || '');
  const [defaultServings, setDefaultServings] = useState(initialRecipe?.defaultServings || 4);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(initialRecipe?.ingredients || [{ ingredientName: '', quantity: 1, unit: Unit.PIECE, isOptional: false }]);
  const [instructions, setInstructions] = useState(initialRecipe?.instructions || '');
  const [sourceName, setSourceName] = useState(initialRecipe?.sourceName || '');
  const [sourceUrl, setSourceUrl] = useState(initialRecipe?.sourceUrl || '');
  const [prepTime, setPrepTime] = useState(initialRecipe?.prepTime || '');
  const [cookTime, setCookTime] = useState(initialRecipe?.cookTime || '');
  const [tags, setTags] = useState(initialRecipe?.tags?.join(', ') || '');

  const handleIngredientChange = <K extends keyof RecipeIngredient>(index: number, field: K, value: RecipeIngredient[K]) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const handleIngredientFix = (index: number, fixedIngredient: RecipeIngredient) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = fixedIngredient;
    setIngredients(newIngredients);
  };

  const handleFixAll = (fixedIngredients: RecipeIngredient[]) => {
    setIngredients(fixedIngredients);
  };

  const addIngredientField = () => setIngredients([...ingredients, { ingredientName: '', quantity: 1, unit: Unit.PIECE, isOptional: false }]);
  const removeIngredientField = (index: number) => setIngredients(ingredients.filter((_, i) => i !== index));

  const handleUrlImport = (importedRecipe: Omit<Recipe, 'id' | 'imageUrl'>) => {
    // Populate form fields with imported data
    setName(importedRecipe.name);
    setDefaultServings(importedRecipe.defaultServings);
    setIngredients(importedRecipe.ingredients);
    setInstructions(importedRecipe.instructions);
    setSourceName(importedRecipe.sourceName || '');
    setSourceUrl(importedRecipe.sourceUrl || '');
    setPrepTime(importedRecipe.prepTime || '');
    setCookTime(importedRecipe.cookTime || '');
    setTags(importedRecipe.tags?.join(', ') || '');
    
    // Hide URL import section
    setShowUrlImport(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const recipeData = {
      name,
      defaultServings: Number(defaultServings),
      ingredients: ingredients.filter(ing => ing.ingredientName.trim() !== ''),
      instructions,
      sourceName,
      sourceUrl,
      prepTime,
      cookTime,
      tags: tags.split(',').map(t => t.trim()).filter(t => t !== ''),
    };
    if (initialRecipe) {
      onSave({ ...initialRecipe, ...recipeData });
    } else {
      onSave(recipeData);
    }
    onClose();
  };

  // Don't show URL import for editing existing recipes
  const canShowUrlImport = !initialRecipe;

  return (
    <div className="space-y-4">
      {/* URL Import Toggle - only show for new recipes */}
      {canShowUrlImport && (
        <div className="flex items-center justify-between pb-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-medium">Add Recipe</h3>
            <p className="text-sm text-gray-500">Create manually or import from a URL</p>
          </div>
          <div className="flex space-x-2">
            <Button
              type="button"
              variant={!showUrlImport ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowUrlImport(false)}
            >
              Manual Entry
            </Button>
            <Button
              type="button"
              variant={showUrlImport ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowUrlImport(true)}
            >
              Import from URL
            </Button>
          </div>
        </div>
      )}

      {/* URL Import Component */}
      {showUrlImport && canShowUrlImport && (
        <RecipeUrlImport
          onImport={handleUrlImport}
          onCancel={() => setShowUrlImport(false)}
        />
      )}

      {/* Manual Recipe Form */}
      {!showUrlImport && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Recipe Name" id="recipeName" value={name} onChange={e => setName(e.target.value)} required />
          <InputField label="Default Servings" id="defaultServings" type="number" value={defaultServings} onChange={e => setDefaultServings(Number(e.target.value))} min="1" required />
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Ingredients</label>
              <FixAllIngredientsButton
                ingredients={ingredients}
                onFixAll={handleFixAll}
              />
            </div>
            {ingredients.map((ing, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
                <div className="col-span-1 flex items-end pb-2.5">
                  <IngredientCorrectionButton
                    ingredient={ing}
                    onFix={(fixedIngredient) => handleIngredientFix(index, fixedIngredient)}
                  />
                </div>
                <InputField containerClassName="col-span-4" placeholder="Ingredient Name" value={ing.ingredientName} onChange={e => handleIngredientChange(index, 'ingredientName', e.target.value)} aria-label={`Ingredient name ${index + 1}`} />
                <InputField containerClassName="col-span-2" type="number" placeholder="Qty" value={ing.quantity} onChange={e => handleIngredientChange(index, 'quantity', Number(e.target.value))} min="0" step="any" aria-label={`Ingredient quantity ${index + 1}`} />
                <SelectField containerClassName="col-span-2" options={UNITS_ARRAY.map(u => ({value: u, label: u}))} value={ing.unit} onChange={e => handleIngredientChange(index, 'unit', e.target.value as Unit)} aria-label={`Ingredient unit ${index + 1}`} />
                <CheckboxField containerClassName="col-span-2 justify-self-start self-end pb-2.5" id={`optional-${index}`} label="Optional" checked={ing.isOptional || false} onChange={e => handleIngredientChange(index, 'isOptional', e.target.checked)} />
                <div className="col-span-1 flex items-end pb-2.5">
                  <Button type="button" variant="danger" size="sm" onClick={() => removeIngredientField(index)} className="p-1.5" aria-label={`Remove ingredient ${index + 1}`}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addIngredientField} leftIcon={<PlusIcon className="w-4 h-4"/>}>Add Ingredient</Button>
          </div>

          <TextAreaField label="Instructions" id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} />
          <InputField label="Source Name (Optional)" id="sourceName" value={sourceName} onChange={e => setSourceName(e.target.value)} />
          <InputField label="Source URL (Optional)" id="sourceUrl" type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} />
          <InputField label="Prep Time (e.g., 30 mins)" id="prepTime" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
          <InputField label="Cook/Total Time (e.g., 1 hour)" id="cookTime" value={cookTime} onChange={e => setCookTime(e.target.value)} />
          <InputField label="Tags (comma-separated)" id="tags" value={tags} onChange={e => setTags(e.target.value)} />
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary">Save Recipe</Button>
          </div>
        </form>
      )}
    </div>
  );
};

// Recipe Card
const RecipeCard: React.FC<{ 
  recipe: Recipe; 
  onSelect: () => void; 
  onDelete: () => void; 
  onEdit: () => void;
  onAddToShoppingList: () => void;
  showInventoryAnalysis?: boolean;
  inventoryAnalysis?: RecipeInventoryAnalysis;
}> = ({ recipe, onSelect, onDelete, onEdit, onAddToShoppingList, showInventoryAnalysis = false, inventoryAnalysis }) => {
  const hasOptional = recipe.ingredients.some(ing => ing.isOptional);
  
  return (
    <Card className="flex flex-col justify-between h-full relative">
      {/* Inventory Status Badge */}
      {showInventoryAnalysis && inventoryAnalysis && (
        <div className="absolute top-2 right-2 z-10">
          <InventoryStatusBadge analysis={inventoryAnalysis} />
        </div>
      )}
      
      <div>
        <img 
          src={recipe.imageUrl || DEFAULT_RECIPE_IMAGE} 
          alt={recipe.name} 
          className="w-full h-40 object-cover rounded-t-lg mb-4 cursor-pointer"
          onClick={onSelect}
          onError={(e) => (e.currentTarget.src = DEFAULT_RECIPE_IMAGE)}
        />
        <h3 className="text-xl font-semibold text-blue-600 hover:text-blue-800 mb-2 cursor-pointer" onClick={onSelect}>
          {recipe.name}
        </h3>
        
        {/* Basic Recipe Info */}
        <p className="text-sm text-gray-500 mb-1">Servings: {recipe.defaultServings}</p>
        {recipe.prepTime && <p className="text-sm text-gray-500 mb-1">Prep: {recipe.prepTime}</p>}
        {recipe.cookTime && <p className="text-sm text-gray-500 mb-1">Cook: {recipe.cookTime}</p>}
        {hasOptional && <p className="text-xs text-purple-600 mb-1">Has optional ingredients</p>}
        
        {/* Inventory Analysis Info */}
        {showInventoryAnalysis && inventoryAnalysis && (
          <InventoryAnalysisCard analysis={inventoryAnalysis} />
        )}
        
        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div className="mt-2">
            {recipe.tags.map(tag => (
              <span key={tag} className="inline-block bg-gray-200 rounded px-2 py-0.5 text-xs mr-1">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-end space-x-2 pt-2 border-t border-gray-200">
        <Button 
          variant="secondary" 
          size="sm" 
          onClick={(e) => { 
            e.stopPropagation(); 
            onAddToShoppingList(); 
          }} 
          aria-label={`Add ${recipe.name} to shopping list`}
          title="Add to Shopping List"
        >
          <ShoppingCartIcon className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${recipe.name}`}>
          <PencilIcon />
        </Button>
        <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label={`Delete ${recipe.name}`}>
          <TrashIcon />
        </Button>
      </div>
    </Card>
  );
};

// Recipes Page
const RecipesPage: React.FC = () => {
  const { recipes, addRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const { inventory, getInventoryItemByName } = useInventory();
  const { addShoppingList } = useShoppingLists();
  const { setActiveView, searchTerm } = useAppState();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);
  const [showInventoryAnalysis, setShowInventoryAnalysis] = useState(true);
  const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // New state for servings prompt modal
  const [showServingsModal, setShowServingsModal] = useState(false);
  const [selectedRecipeForShoppingList, setSelectedRecipeForShoppingList] = useState<Recipe | null>(null);
  const [selectedServings, setSelectedServings] = useState(1);

  // Get inventory analysis for all recipes
  const recipeAnalysisMap = useRecipeCollectionAnalysis(recipes, inventory);

  const handleSaveRecipe = (recipeData: Omit<Recipe, 'id' | 'imageUrl'> | Recipe) => {
    if ('id' in recipeData) { 
      updateRecipe(recipeData as Recipe);
    } else { 
      addRecipe(recipeData as Omit<Recipe, 'id' | 'imageUrl'>);
    }
    setShowAddModal(false);
    setEditingRecipe(undefined);
  };
  
  const openEditModal = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowAddModal(true);
  };

  // Function to show servings prompt modal
  const promptForServingsAndAddToShoppingList = (recipe: Recipe) => {
    setSelectedRecipeForShoppingList(recipe);
    setSelectedServings(recipe.defaultServings);
    setShowServingsModal(true);
  };

  // Modified direct recipe to shopping list function that takes servings as parameter
  const createShoppingListWithServings = (recipe: Recipe, servings: number) => {
    const servingsMultiplier = servings / recipe.defaultServings;
    const neededIngredients: Record<string, { totalQuantity: number; unit: Unit; defaultStoreId?: string }> = {};

    recipe.ingredients.forEach(ing => {
      // Skip optional ingredients by default
      if (ing.isOptional) return;

      const normalizedName = normalizeIngredientName(ing.ingredientName);
      const scaledQuantity = ing.quantity * servingsMultiplier;
      
      const inventoryItemForDefaultStore = getInventoryItemByName(normalizedName);

      if (!neededIngredients[normalizedName]) {
        neededIngredients[normalizedName] = { 
          totalQuantity: 0, 
          unit: ing.unit, 
          defaultStoreId: inventoryItemForDefaultStore?.defaultStoreId 
        };
      }
      
      const existingEntry = neededIngredients[normalizedName];
      const convertedScaledQuantity = convertUnit(scaledQuantity, ing.unit, existingEntry.unit);

      if (convertedScaledQuantity !== null) {
        existingEntry.totalQuantity += convertedScaledQuantity;
      } else { 
        if (existingEntry.totalQuantity === 0) { 
           existingEntry.unit = ing.unit;
           existingEntry.totalQuantity = scaledQuantity;
        }
      }
      
      if (!existingEntry.defaultStoreId && inventoryItemForDefaultStore?.defaultStoreId) {
        existingEntry.defaultStoreId = inventoryItemForDefaultStore.defaultStoreId;
      }
    });
    
    const shoppingListItems: ShoppingListItem[] = [];
    Object.entries(neededIngredients).forEach(([name, data]) => {
      const inventoryItem = getInventoryItemByName(name);
      let quantityToBuy = data.totalQuantity;

      if (inventoryItem) {
        const inventoryQuantityInNeededUnit = convertUnit(inventoryItem.quantity, inventoryItem.unit, data.unit);
        if (inventoryQuantityInNeededUnit !== null) {
          quantityToBuy -= inventoryQuantityInNeededUnit;
        }
      }
      
      if (quantityToBuy > 0.01) { 
        shoppingListItems.push({
          id: generateId(),
          ingredientName: name,
          neededQuantity: parseFloat(quantityToBuy.toFixed(2)), 
          unit: data.unit,
          recipeSources: [{ recipeName: recipe.name, quantity: data.totalQuantity }],
          purchased: false,
          storeId: data.defaultStoreId,
        });
      }
    });
    
    if (shoppingListItems.length === 0) {
      setAlertMessage({
        type: 'success', 
        message: `You have all ingredients for "${recipe.name}" (${servings} serving${servings !== 1 ? 's' : ''})! No shopping needed.`
      });
      setTimeout(() => setAlertMessage(null), 5000);
      return;
    }
    
    // Create new shopping list
    const listName = `Shopping List - ${recipe.name} (${servings} serving${servings !== 1 ? 's' : ''}) - ${new Date().toLocaleDateString()}`;
    const newListId = addShoppingList({
      name: listName,
      items: shoppingListItems
    });
    
    // Show success notification
    setAlertMessage({
      type: 'success', 
      message: `Shopping list "${listName}" created with ${shoppingListItems.length} items! Click here to view it.`
    });
    setTimeout(() => setAlertMessage(null), 5000);
    
    // Close the modal
    setShowServingsModal(false);
    setSelectedRecipeForShoppingList(null);
    
    // Optional: Navigate to the new shopping list after a brief delay
    setTimeout(() => {
      setActiveView('shopping_list_detail', { id: newListId });
    }, 1000);
  };

  const handleConfirmServings = () => {
    if (selectedRecipeForShoppingList) {
      createShoppingListWithServings(selectedRecipeForShoppingList, selectedServings);
    }
  };

  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.ingredients.some(ing => ing.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  ).sort((a,b) => a.name.localeCompare(b.name));

  // Get summary statistics
  const readyRecipes = Array.from(recipeAnalysisMap.values()).filter((analysis: RecipeInventoryAnalysis) => analysis.hasAllIngredients).length;
  const totalRecipes = recipes.length;

  return (
    <div className="container mx-auto p-4">
      {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />}
      {/* Header with summary and toggle */}
      {totalRecipes > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50 p-4 rounded-lg">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-lg font-semibold text-gray-800">Your Recipes</h2>
            <p className="text-sm text-gray-600">
              {readyRecipes} of {totalRecipes} recipes ready to cook with current inventory
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="inventoryToggle" className="text-sm text-gray-700">
              Show inventory status
            </label>
            <input
              id="inventoryToggle"
              type="checkbox"
              checked={showInventoryAnalysis}
              onChange={(e) => setShowInventoryAnalysis(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {filteredRecipes.length === 0 && searchTerm === '' ? (
        <EmptyState 
          icon={<BookOpenIcon />}
          title="No Recipes Yet"
          message="Start by adding your favorite recipes to your collection."
          actionButton={<Button onClick={() => setShowAddModal(true)} leftIcon={<PlusIcon/>}>Add New Recipe</Button>}
        />
      ) : filteredRecipes.length === 0 && searchTerm !== '' ? (
         <EmptyState 
          icon={<MagnifyingGlassIcon />}
          title="No Recipes Found"
          message={`Your search for "${searchTerm}" did not match any recipes.`}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecipes.map(recipe => {
            const analysis = recipeAnalysisMap.get(recipe.id);
            return (
              <RecipeCard 
                key={recipe.id} 
                recipe={recipe} 
                onSelect={() => setActiveView('recipe_detail', { id: recipe.id })}
                onDelete={() => deleteRecipe(recipe.id)}
                onEdit={() => openEditModal(recipe)}
                onAddToShoppingList={() => promptForServingsAndAddToShoppingList(recipe)}
                showInventoryAnalysis={showInventoryAnalysis}
                inventoryAnalysis={analysis}
              />
            );
          })}
        </div>
      )}
      <AddItemButton onClick={() => { setEditingRecipe(undefined); setShowAddModal(true); }} text="Add Recipe" />
      
      {/* Recipe Form Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingRecipe(undefined); }} title={editingRecipe ? "Edit Recipe" : "Add New Recipe"} size="2xl">
        <RecipeForm 
          initialRecipe={editingRecipe}
          onSave={handleSaveRecipe} 
          onClose={() => { setShowAddModal(false); setEditingRecipe(undefined); }} 
        />
      </Modal>

      {/* Servings Selection Modal */}
      <Modal 
        isOpen={showServingsModal} 
        onClose={() => { setShowServingsModal(false); setSelectedRecipeForShoppingList(null); }} 
        title="Add to Shopping List"
      >
        {selectedRecipeForShoppingList && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {selectedRecipeForShoppingList.name}
              </h3>
              <p className="text-sm text-gray-600">
                How many servings would you like to add to your shopping list?
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-4">
              <label htmlFor="servingsInput" className="text-sm font-medium text-gray-700">
                Servings:
              </label>
              <InputField
                id="servingsInput"
                type="number"
                value={selectedServings}
                onChange={(e) => setSelectedServings(Math.max(1, parseInt(e.target.value) || 1))}
                onFocus={(e) => e.target.select()}
                min="1"
                max="50"
                step="1"
                className="w-20 text-center"
                aria-label="Number of servings"
              />
              <span className="text-sm text-gray-500">
                (default: {selectedRecipeForShoppingList.defaultServings})
              </span>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-600 text-center">
                This will calculate ingredients needed for {selectedServings} serving{selectedServings !== 1 ? 's' : ''} and 
                subtract what you already have in your inventory.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                variant="ghost" 
                onClick={() => { setShowServingsModal(false); setSelectedRecipeForShoppingList(null); }}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleConfirmServings}
                leftIcon={<ShoppingCartIcon className="w-4 h-4" />}
              >
                Add to Shopping List
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// Recipe Detail Page
const RecipeDetailPage: React.FC = () => {
  const { getRecipeById, updateRecipe } = useRecipes();
  const { validateRecipePreparation, deductIngredientsForPreparation, inventory, getInventoryItemByName } = useInventory();
  const { addShoppingList } = useShoppingLists();
  const { setActiveView, viewParams } = useAppState();
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [prepareServings, setPrepareServings] = useState(1);
  const [preparationValidation, setPreparationValidation] = useState<any>(null);
  const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // New state for dynamic serving size
  const [currentServings, setCurrentServings] = useState(1);
  const [scaledIngredients, setScaledIngredients] = useState<ScaledIngredient[]>([]);

  const recipe = getRecipeById(viewParams.id || '');

  // Add inventory analysis for current serving size
  const inventoryAnalysis = useMemo(() => {
    if (!recipe) return null;
    return analyzeRecipeInventory(recipe, inventory, currentServings);
  }, [recipe, inventory, currentServings]);

  // Check if we can prepare the current serving size
  const canPrepareCurrentServings = useMemo(() => {
    if (!recipe || !inventoryAnalysis) return false;
    return currentServings <= inventoryAnalysis.maxPossibleServings;
  }, [recipe, inventoryAnalysis, currentServings]);

  useEffect(() => {
    if (recipe) {
      setPrepareServings(recipe.defaultServings);
      setCurrentServings(recipe.defaultServings);
      // Initialize scaled ingredients
      const scaled = scaleIngredients(recipe.ingredients, recipe.defaultServings, recipe.defaultServings);
      setScaledIngredients(scaled);
    }
  }, [recipe]);

  // Update scaled ingredients when serving size changes
  useEffect(() => {
    if (recipe) {
      const scaled = scaleIngredients(recipe.ingredients, currentServings, recipe.defaultServings);
      setScaledIngredients(scaled);
    }
  }, [recipe, currentServings]);

  const handleServingsChange = (newServings: number) => {
    setCurrentServings(newServings);
  };

  // Direct shopping list creation for current serving size
  const handleAddToShoppingList = () => {
    if (!recipe) return;

    const servingsMultiplier = currentServings / recipe.defaultServings;
    const neededIngredients: Record<string, { totalQuantity: number; unit: Unit; defaultStoreId?: string }> = {};

    recipe.ingredients.forEach(ing => {
      // Skip optional ingredients by default
      if (ing.isOptional) return;

      const normalizedName = normalizeIngredientName(ing.ingredientName);
      const scaledQuantity = ing.quantity * servingsMultiplier;
      
      const inventoryItemForDefaultStore = getInventoryItemByName(normalizedName);

      if (!neededIngredients[normalizedName]) {
        neededIngredients[normalizedName] = { 
          totalQuantity: 0, 
          unit: ing.unit, 
          defaultStoreId: inventoryItemForDefaultStore?.defaultStoreId 
        };
      }
      
      const existingEntry = neededIngredients[normalizedName];
      const convertedScaledQuantity = convertUnit(scaledQuantity, ing.unit, existingEntry.unit);

      if (convertedScaledQuantity !== null) {
        existingEntry.totalQuantity += convertedScaledQuantity;
      } else { 
        if (existingEntry.totalQuantity === 0) { 
           existingEntry.unit = ing.unit;
           existingEntry.totalQuantity = scaledQuantity;
        }
      }
      
      if (!existingEntry.defaultStoreId && inventoryItemForDefaultStore?.defaultStoreId) {
        existingEntry.defaultStoreId = inventoryItemForDefaultStore.defaultStoreId;
      }
    });
    
    const shoppingListItems: ShoppingListItem[] = [];
    Object.entries(neededIngredients).forEach(([name, data]) => {
      const inventoryItem = getInventoryItemByName(name);
      let quantityToBuy = data.totalQuantity;

      if (inventoryItem) {
        const inventoryQuantityInNeededUnit = convertUnit(inventoryItem.quantity, inventoryItem.unit, data.unit);
        if (inventoryQuantityInNeededUnit !== null) {
          quantityToBuy -= inventoryQuantityInNeededUnit;
        }
      }
      
      if (quantityToBuy > 0.01) { 
        shoppingListItems.push({
          id: generateId(),
          ingredientName: name,
          neededQuantity: parseFloat(quantityToBuy.toFixed(2)), 
          unit: data.unit,
          recipeSources: [{ recipeName: recipe.name, quantity: data.totalQuantity }],
          purchased: false,
          storeId: data.defaultStoreId,
        });
      }
    });
    
    if (shoppingListItems.length === 0) {
      setAlertMessage({
        type: 'success', 
        message: `You have all ingredients for "${recipe.name}" (${currentServings} serving${currentServings !== 1 ? 's' : ''})! No shopping needed.`
      });
      setTimeout(() => setAlertMessage(null), 5000);
      return;
    }
    
    // Create new shopping list
    const listName = `Shopping List - ${recipe.name} (${currentServings} serving${currentServings !== 1 ? 's' : ''}) - ${new Date().toLocaleDateString()}`;
    const newListId = addShoppingList({
      name: listName,
      items: shoppingListItems
    });
    
    // Show success notification
    setAlertMessage({
      type: 'success', 
      message: `Shopping list "${listName}" created with ${shoppingListItems.length} items!`
    });
    setTimeout(() => setAlertMessage(null), 3000);
    
    // Navigate to the new shopping list
    setTimeout(() => {
      setActiveView('shopping_list_detail', { id: newListId });
    }, 1000);
  };

  const handlePrepareClick = () => {
    if (!recipe) return;
    const validation = validateRecipePreparation(recipe, prepareServings);
    setPreparationValidation(validation);
    
    if (!validation.canPrepare) {
      setAlertMessage({
        type: 'error', 
        message: `Cannot prepare recipe: Missing ${validation.missingIngredients.length} ingredient${validation.missingIngredients.length !== 1 ? 's' : ''}`
      });
      setTimeout(() => setAlertMessage(null), 5000);
      return;
    }
    
    setShowPrepareModal(false);
    setShowConfirmationModal(true);
  };

  const handleConfirmPreparation = () => {
    if (!recipe) return;
    const result = deductIngredientsForPreparation(recipe, prepareServings);
    
    // Always close the modal first to ensure UI responsiveness
    setShowConfirmationModal(false);
    setPreparationValidation(null);
    
    if (result.success) {
      setAlertMessage({
        type: 'success', 
        message: `${recipe.name} prepared for ${prepareServings} servings! Ingredients deducted from inventory.`
      });
      
      // Navigate to dashboard after brief delay to show updated inventory
      setTimeout(() => {
        setActiveView('dashboard');
      }, 2000);
    } else {
      setAlertMessage({
        type: 'error', 
        message: `Preparation failed. ${result.errors.length} ingredient(s) could not be deducted: ${result.errors.join(', ')}`
      });
    }
    
    // Clear the alert message after 5 seconds
    setTimeout(() => setAlertMessage(null), 5000);
  };

  const handleEditRecipe = (updatedRecipe: Recipe) => {
    updateRecipe(updatedRecipe);
    setShowEditModal(false);
    setAlertMessage({
      type: 'success',
      message: 'Recipe updated successfully!'
    });
    setTimeout(() => setAlertMessage(null), 3000);
  };

  if (!recipe) {
    return ( 
      <div className="container mx-auto p-4 text-center">
        <EmptyState
            icon={<BookOpenIcon />}
            title="Recipe Not Found"
            message="The recipe you are looking for does not exist or may have been removed."
            actionButton={<Button onClick={() => setActiveView('recipes')} variant="primary">Back to Recipes</Button>}
        />
      </div> 
    );
  }

  const { name, defaultServings, ingredients, instructions, sourceName, sourceUrl, prepTime, cookTime, tags, imageUrl } = recipe;

  return (
    <div className="container mx-auto p-4 lg:p-8">
      <Button onClick={() => setActiveView('recipes')} variant="ghost" leftIcon={<ArrowLeftIcon />} className="mb-6">Back to Recipes</Button>
      {alertMessage && <Alert type={alertMessage.type} message={alertMessage.message} onClose={() => setAlertMessage(null)} />}
      <Card className="overflow-hidden">
        <div className="md:flex">
          <div className="md:flex-shrink-0">
            <img className="h-64 w-full object-cover md:w-64 md:h-auto" src={imageUrl || DEFAULT_RECIPE_IMAGE} alt={name} onError={(e) => (e.currentTarget.src = DEFAULT_RECIPE_IMAGE)}/>
          </div>
          <div className="p-6 md:p-8 flex-grow">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-3">{name}</h1>
            <div className="flex flex-wrap items-center text-sm text-gray-600 mb-4">
              {/* Replace static servings display with interactive selector */}
              <div className="mr-4">
                <ServingSizeSelector
                  defaultServings={defaultServings}
                  currentServings={currentServings}
                  onServingsChange={handleServingsChange}
                />
              </div>
              {prepTime && <span className="mr-4">Prep: {prepTime}</span>}
              {cookTime && <span className="mr-4">Cook: {cookTime}</span>}
            </div>

            {/* Inventory status indicator */}
            {inventoryAnalysis && (
              <div className="mb-4">
                {inventoryAnalysis.maxPossibleServings === 0 ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833-.23 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-red-700 font-medium">Missing ingredients</span>
                    </div>
                    <p className="text-sm text-red-600 mt-1">
                      You don't have the required ingredients to make this recipe.
                    </p>
                  </div>
                ) : inventoryAnalysis.maxPossibleServings === Infinity ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">
                        Can make unlimited servings
                      </span>
                    </div>
                  </div>
                ) : !canPrepareCurrentServings ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-orange-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833-.23 2.5 1.732 2.5z" />
                      </svg>
                      <span className="text-sm text-orange-700 font-medium">
                        Not enough ingredients for {currentServings} serving{currentServings !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <p className="text-sm text-orange-600 mt-1">
                      You can make up to {inventoryAnalysis.maxPossibleServings} serving{inventoryAnalysis.maxPossibleServings !== 1 ? 's' : ''} with your current inventory.
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-green-700 font-medium">
                        Ready to cook {currentServings} serving{currentServings !== 1 ? 's' : ''}!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {tags && tags.length > 0 && (
                <div className="mb-4">
                    {tags.map(tag => (
                    <span key={tag} className="inline-block bg-gray-200 rounded-full px-3 py-1 text-xs font-semibold text-gray-700 mr-2 mb-2">{tag}</span>
                    ))}
                </div>
            )}
            {sourceName && (
                 <p className="text-sm text-gray-500">
                 Source: {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{sourceName}</a> : sourceName}
               </p>
            )}
          </div>
        </div>

        <div className="p-6 md:p-8 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <h2 className="text-xl font-semibold text-gray-700 mb-3">Ingredients</h2>
              {/* Replace static ingredients list with scaled ingredients list */}
              <ScaledIngredientsList 
                ingredients={scaledIngredients}
                showMixedNumbers={true}
              />
            </div>
            <div className="md:col-span-2">
               <h2 className="text-xl font-semibold text-gray-700 mb-3">Instructions</h2>
              {/* Replace static instructions with interactive instructions */}
              <InteractiveInstructions
                instructions={instructions || "No instructions provided."}
                ingredients={ingredients}
                currentServings={currentServings}
                defaultServings={defaultServings}
              />
            </div>
          </div>
        </div>
         <div className="p-6 md:p-8 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowEditModal(true)}
                leftIcon={<PencilIcon className="w-4 h-4" />}
              >
                Edit Recipe
              </Button>
              <Button 
                variant="success" 
                onClick={() => { setPrepareServings(currentServings); setShowPrepareModal(true); }}
                leftIcon={<SparklesIcon />}
                disabled={!canPrepareCurrentServings}
                title={!canPrepareCurrentServings ? `Not enough ingredients for ${currentServings} serving${currentServings !== 1 ? 's' : ''}` : undefined}
              >
                Prepare this Recipe
              </Button>
              <Button 
                variant="primary" 
                onClick={handleAddToShoppingList}
                leftIcon={<ShoppingCartIcon />}
              >
                Add to Shopping List
              </Button>
            </div>
          </div>
      </Card>
      <Modal isOpen={showPrepareModal} onClose={() => setShowPrepareModal(false)} title={`Prepare ${recipe.name}`}>
        <div className="space-y-4">
            <p>How many servings are you preparing?</p>
            <InputField 
                id="prepareServings"
                type="number"
                label="Servings"
                value={prepareServings}
                onChange={e => setPrepareServings(Math.max(1, parseInt(e.target.value)))}
                min="1"
            />
            <p className="text-sm text-gray-600">This will deduct the required ingredients from your inventory based on the selected servings.</p>
            <div className="flex justify-end space-x-2 pt-2">
                <Button variant="ghost" onClick={() => setShowPrepareModal(false)}>Cancel</Button>
                <Button variant="success" onClick={handlePrepareClick}>Confirm & Deduct</Button>
            </div>
        </div>
      </Modal>
      <Modal isOpen={showConfirmationModal} onClose={() => setShowConfirmationModal(false)} title={`Confirm Preparation`}>
        <div className="space-y-4">
          <p className="font-semibold">Preparing "{recipe.name}" for {prepareServings} serving{prepareServings !== 1 ? 's' : ''}</p>
          <p className="text-sm text-gray-600">The following ingredients will be deducted from your inventory:</p>
          
          {preparationValidation && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2 text-gray-700">Ingredient Deductions:</h4>
              <ul className="space-y-2">
                {recipe.ingredients
                  .filter(ing => !ing.isOptional)
                  .map((ing, index) => {
                    const neededQuantity = (ing.quantity / recipe.defaultServings) * prepareServings;
                    return (
                      <li key={index} className="text-sm">
                        <span className="font-medium">{ing.ingredientName}:</span>{' '}
                        <span className="text-red-600">-{neededQuantity.toFixed(2)} {ing.unit}</span>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
          
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="ghost" onClick={() => setShowConfirmationModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmPreparation}>Confirm Preparation</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Recipe Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Recipe" size="2xl">
        {recipe && (
          <RecipeForm 
            initialRecipe={recipe}
            onSave={(recipeData) => handleEditRecipe(recipeData as Recipe)} 
            onClose={() => setShowEditModal(false)} 
          />
        )}
      </Modal>
    </div>
  );
};


// Inventory Page
const InventoryPage: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, getActiveItems, getArchivedItems } = useInventory(); // Using new inventory hook
  const { searchTerm } = useAppState(); 
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<EnhancedInventoryItem | undefined>(undefined);
  const [activeInventoryTab, setActiveInventoryTab] = useState<'active' | 'archived'>('active');


  const handleSave = (itemData: Omit<EnhancedInventoryItem, 'id' | 'addedDate' | 'lastUpdated' | 'isArchived' | 'archivedDate' | 'originalQuantity' | 'timesRestocked' | 'totalConsumed' | 'averageConsumptionRate' | 'lastUsedDate'> | EnhancedInventoryItem) => {
    if ('id' in itemData) { // This implies it's an EnhancedInventoryItem
      updateInventoryItem(itemData as EnhancedInventoryItem);
    } else { // This is Omit<...>
      addInventoryItem(itemData);
    }
    setShowModal(false);
    setEditingItem(undefined);
  };

  const openEditModal = (item: EnhancedInventoryItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const currentInventoryList = activeInventoryTab === 'active' ? getActiveItems() : getArchivedItems();

  const filteredInventory = currentInventoryList.filter(item =>
    item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a,b) => {
      if (activeInventoryTab === 'active') {
        if (a.expirationDate && b.expirationDate) return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        if (a.expirationDate) return -1;
        if (b.expirationDate) return 1;
      } else { // For archived, sort by archivedDate descending
        if (a.archivedDate && b.archivedDate) return new Date(b.archivedDate).getTime() - new Date(a.archivedDate).getTime();
        if (b.archivedDate) return -1;
        if (a.archivedDate) return 1;
      }
      return a.ingredientName.localeCompare(b.ingredientName);
  });

  return (
    <div className="container mx-auto p-4">
      {/* Tabs for Active/Archived */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveInventoryTab('active')}
            className={`${
              activeInventoryTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
          >
            Active ({getActiveItems().length})
          </button>
          <button
            onClick={() => setActiveInventoryTab('archived')}
            className={`${
              activeInventoryTab === 'archived'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
          >
            Archived ({getArchivedItems().length})
          </button>
        </nav>
      </div>

       {filteredInventory.length === 0 && searchTerm === '' ? (
        <EmptyState 
          icon={<ArchiveBoxIcon />}
          title={activeInventoryTab === 'active' ? "No Active Items Yet" : "No Archived Items"}
          message={activeInventoryTab === 'active' ? "Add items to your inventory. Items with zero quantity will be archived." : "Archived items (zero quantity) will appear here."}
          actionButton={activeInventoryTab === 'active' ? <Button onClick={() => { setEditingItem(undefined); setShowModal(true); }} leftIcon={<PlusIcon/>}>Add New Item</Button> : undefined}
        />
      ) : filteredInventory.length === 0 && searchTerm !== '' ? (
         <EmptyState 
          icon={<MagnifyingGlassIcon />}
          title="No Items Found"
          message={`Your search for "${searchTerm}" did not match any ${activeInventoryTab} inventory items.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map(item => {
            const expiringSoon = !item.isArchived && isItemExpiringSoon(item.expirationDate);
            const expired = !item.isArchived && isItemExpired(item.expirationDate);
            const lowStock = !item.isArchived && item.lowStockThreshold && item.quantity < item.lowStockThreshold;
            let cardBorder = '';
            if (expired) cardBorder = 'border-2 border-red-700 bg-red-50';
            else if (expiringSoon) cardBorder = 'border-2 border-yellow-500 bg-yellow-50';
            else if (lowStock) cardBorder = 'border-2 border-red-500';
            else if (item.isArchived) cardBorder = 'opacity-70 bg-gray-100';


            return (
            <Card key={item.id} className={`relative ${cardBorder}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{item.ingredientName}</h3>
                  <p className="text-gray-600">
                    {isDiscreteUnit(item.unit) 
                      ? `${Math.round(item.quantity)} ${item.unit}`
                      : `${item.quantity.toFixed(2)} ${item.unit}`
                    }
                    {item.isArchived && item.originalQuantity && ` (Archived, was ${item.originalQuantity} ${item.unit})`}
                  </p>
                  {!item.isArchived && item.expirationDate && <p className={`text-xs ${expired || expiringSoon ? 'font-semibold' : ''} ${expired ? 'text-red-700' : expiringSoon ? 'text-yellow-700' : 'text-gray-500'}`}>Exp: {new Date(item.expirationDate).toLocaleDateString()} {expired && "(Expired!)"}{!expired && expiringSoon && "(Expiring Soon!)"}</p>}
                  {!item.isArchived && lowStock && !expired && !expiringSoon && <span className="text-xs text-red-600 font-semibold">Low Stock!</span>}
                  {item.frequencyOfUse && <p className="text-xs text-gray-500">Use: {item.frequencyOfUse}</p>}
                  {item.brand && <p className="text-xs text-gray-500">Brand: {item.brand}</p>}
                  {item.notes && <p className="text-xs text-gray-500 truncate" title={item.notes}>Notes: {item.notes}</p>}
                   {item.archivedDate && <p className="text-xs text-gray-500">Archived: {new Date(item.archivedDate).toLocaleDateString()}</p>}
                </div>
                <div className="flex flex-col space-y-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} className="p-1.5"><PencilIcon className="w-4 h-4"/></Button>
                  {/* Delete button behavior might change based on tab, or be consistent (archive) */}
                  <Button variant="danger" size="sm" onClick={() => deleteInventoryItem(item.id)} className="p-1.5" title={item.isArchived ? "Permanently delete (future feature)" : "Archive Item (sets quantity to 0)"}><TrashIcon className="w-4 h-4"/></Button>
                </div>
              </div>
            </Card>
          );})}
        </div>
      )}
      {activeInventoryTab === 'active' && <AddItemButton onClick={() => { setEditingItem(undefined); setShowModal(true); }} text="Add Inventory Item" />}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingItem(undefined); }} title={editingItem ? "Edit Inventory Item" : "Add Inventory Item"} size="lg">
        {/* The form needs to be updated to handle EnhancedInventoryItem fields */}
        <InventoryItemForm initialItem={editingItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditingItem(undefined); }} />
      </Modal>
    </div>
  );
};

// Inventory Item Form - Needs to be updated for EnhancedInventoryItem
interface InventoryItemFormProps {
  initialItem?: EnhancedInventoryItem; // Changed to EnhancedInventoryItem
  onSave: (itemData: Omit<EnhancedInventoryItem, 'id' | 'addedDate' | 'lastUpdated' | 'isArchived' | 'archivedDate' | 'originalQuantity' | 'timesRestocked' | 'totalConsumed' | 'averageConsumptionRate' | 'lastUsedDate'> | EnhancedInventoryItem) => void;
  onClose: () => void;
}
const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ initialItem, onSave, onClose }) => {
  const { stores } = useStores();
  const { categories, getDefaultCategoryId } = useCategories(); // Use categories context

  const [ingredientName, setIngredientName] = useState(initialItem?.ingredientName || '');
  const [quantity, setQuantity] = useState(initialItem?.quantity ?? 0); // Default to 0 for new items
  const [unit, setUnit] = useState<Unit>(initialItem?.unit ?? Unit.PIECE);
  const [categoryId, setCategoryId] = useState<string>(initialItem?.categoryId || getDefaultCategoryId() || '');

  // Enhanced fields
  const [lowStockThreshold, setLowStockThreshold] = useState(initialItem?.lowStockThreshold);
  const [expirationDate, setExpirationDate] = useState(initialItem?.expirationDate || '');
  const [frequencyOfUse, setFrequencyOfUse] = useState<FrequencyOfUse | ''>(initialItem?.frequencyOfUse || '');
  const [defaultStoreId, setDefaultStoreId] = useState<string>(initialItem?.defaultStoreId || '');
  const [brand, setBrand] = useState(initialItem?.brand || '');
  const [notes, setNotes] = useState(initialItem?.notes || '');
  const [customTags, setCustomTags] = useState(initialItem?.customTags?.join(', ') || ''); // For simple input

  // Unarchive logic if editing an archived item and quantity is > 0
  const [isArchivedInitially, setIsArchivedInitially] = useState(initialItem?.isArchived || false);
  const [unarchiveOnSave, setUnarchiveOnSave] = useState(false);


  const storeOptions = [{value: '', label: 'No Default Store'}, ...stores.map(s => ({ value: s.id, label: s.name }))];
  const categoryOptions = categories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}`}));

  useEffect(() => {
    if (isArchivedInitially && quantity > 0) {
      setUnarchiveOnSave(true);
    } else if (isArchivedInitially && quantity <= 0) {
      setUnarchiveOnSave(false);
    }
  }, [quantity, isArchivedInitially]);


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const baseData = {
      ingredientName, 
      quantity: Number(quantity), 
      unit, 
      categoryId,
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : undefined,
      expirationDate: expirationDate || undefined,
      frequencyOfUse: frequencyOfUse as FrequencyOfUse || undefined,
      defaultStoreId: defaultStoreId || undefined,
      brand: brand || undefined,
      notes: notes || undefined,
      customTags: customTags.split(',').map(t => t.trim()).filter(t => t),
    };

    if (initialItem) {
       const updatedItem: EnhancedInventoryItem = {
        ...initialItem,
        ...baseData,
        // If unarchiving, update relevant fields
        ...(unarchiveOnSave && initialItem.isArchived && {
          isArchived: false,
          archivedDate: undefined,
          originalQuantity: undefined,
          timesRestocked: (initialItem.timesRestocked || 0) + 1,
        }),
      };
      onSave(updatedItem);
    } else {
      // For new items, other fields (id, addedDate etc) are set in InventoryProvider
      onSave(baseData as Omit<EnhancedInventoryItem, 'id' | 'addedDate' | 'lastUpdated' | 'isArchived' | 'archivedDate' | 'originalQuantity' | 'timesRestocked' | 'totalConsumed' | 'averageConsumptionRate' | 'lastUsedDate'>);
    }
    onClose(); 
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField label="Ingredient Name" id="invItemName" value={ingredientName} onChange={e => setIngredientName(e.target.value)} required />
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Quantity" id="invItemQty" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} step="any" required />
        <SelectField label="Unit" id="invItemUnit" options={UNITS_ARRAY.map(u => ({value: u, label: u}))} value={unit} onChange={e => setUnit(e.target.value as Unit)} required />
      </div>
      <SelectField label="Category" id="invItemCategory" options={categoryOptions} value={categoryId} onChange={e => setCategoryId(e.target.value)} required />

      <div className="grid grid-cols-2 gap-4">
        <InputField label="Low Stock Threshold (Optional)" id="invItemLowStock" type="number" placeholder="e.g., 2" value={lowStockThreshold || ''} onChange={e => setLowStockThreshold(e.target.value === '' ? undefined : Number(e.target.value))} min="0" step="any" />
        <InputField label="Expiration Date (Optional)" id="invItemExpDate" type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Frequency of Use (Optional)" id="invItemFreq" options={[{value: '', label: 'Select frequency'}, ...FREQUENCY_OF_USE_OPTIONS]} value={frequencyOfUse} onChange={e => setFrequencyOfUse(e.target.value as FrequencyOfUse | '')} />
        <SelectField label="Default Store (Optional)" id="invItemStore" options={storeOptions} value={defaultStoreId} onChange={e => setDefaultStoreId(e.target.value)} />
      </div>
      <InputField label="Brand (Optional)" id="invItemBrand" value={brand} onChange={e => setBrand(e.target.value)} />
      <TextAreaField label="Notes (Optional)" id="invItemNotes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
      <InputField label="Custom Tags (comma-separated, Optional)" id="invItemTags" value={customTags} onChange={e => setCustomTags(e.target.value)} />

      {initialItem?.isArchived && (
        <p className="text-sm text-orange-600">This item is currently archived. Setting quantity above 0 will unarchive it.</p>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save Item</Button>
      </div>
    </form>
  );
};


// Migration Runner Component (New)
const MigrationRunner: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, isLoadingAuth } = useAuth();
  const [migrationAttempted, setMigrationAttempted] = useState(false);
  const [migrationError, setMigrationError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component

    if (!isLoadingAuth && currentUser && !migrationAttempted) {
      console.log('MigrationRunner: User authenticated, attempting migration...');
      // Use a promise wrapper for runMigrationIfNeeded if it's not already async
      Promise.resolve(runMigrationIfNeeded(currentUser.id))
        .then((migrationWasRun) => {
          if (!isMounted) return;
          if (migrationWasRun) {
            console.log('MigrationRunner: Migration process completed.');
            // Optionally, could force a reload of specific contexts or app state here
            // For now, providers listening to currentUser will reload their data
          } else {
            console.log('MigrationRunner: Migration was not needed or already done.');
          }
          setMigrationAttempted(true);
        })
        .catch(err => {
          if (!isMounted) return;
          console.error('MigrationRunner: Migration failed', err);
          setMigrationError(err.message || 'Unknown migration error');
          setMigrationAttempted(true); // Mark as attempted even on error
        });
    } else if (!isLoadingAuth && !currentUser && !migrationAttempted) {
      // No user, no migration needed for now. Mark as attempted for this "session".
      console.log('MigrationRunner: No user, migration check skipped for this session.');
      setMigrationAttempted(true);
    }

    return () => { isMounted = false; };
  }, [currentUser, isLoadingAuth, migrationAttempted]);

  // Reset migrationAttempted if user logs out, so it can run for next login
  useEffect(() => {
    if (!currentUser) {
      setMigrationAttempted(false);
      setMigrationError(null); // Clear any previous errors
    }
  }, [currentUser]);


  if (isLoadingAuth || (currentUser && !migrationAttempted && !migrationError)) {
    // Show loading screen while auth is loading or migration is pending for a logged-in user
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-700">Initializing Kitchen Pal...</p>
            {currentUser && !migrationAttempted && <p className="text-sm text-gray-500">Checking for data updates...</p>}
        </div>
      </div>
    );
  }

  if (migrationError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-100 text-red-700 p-4 text-center">
        <div className="w-16 h-16 text-red-500 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h1 className="text-2xl font-bold mb-4">Data Migration Error</h1>
        <p className="mb-2">An error occurred while updating your application data:</p>
        <p className="mb-4 font-mono bg-red-200 p-3 rounded shadow text-sm">{migrationError}</p>
        <p className="text-sm">Please try <Button variant="link" onClick={() => window.location.reload()} className="text-red-700 underline">refreshing the application</Button>. If the problem persists, contact support.</p>
      </div>
    );
  }

  // Render children once auth is resolved and migration has been attempted (or not needed for logged-out user)
  return <>{children}</>;
};


// Shopping List Generator Page
interface SelectedOptionalIngredients {
  [recipeId: string]: { [ingredientName: string]: boolean };
}
const ShoppingListGeneratorPage: React.FC = () => {
  const { recipes, getRecipeById } = useRecipes();
  const { getInventoryItemByName } = useInventory();
  const { addShoppingList } = useShoppingLists();
  const { setActiveView, viewParams, searchTerm } = useAppState();
  
  const initialRecipeIds = viewParams.recipeIds ? viewParams.recipeIds.split(',') : [];
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>(initialRecipeIds);
  const [servingsOverrides, setServingsOverrides] = useState<Record<string, number>>({});
  const [selectedOptionalIngs, setSelectedOptionalIngs] = useState<SelectedOptionalIngredients>({});

  const toggleRecipeSelection = (recipeId: string) => {
    setSelectedRecipeIds(prev => 
      prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    );
    if (selectedRecipeIds.includes(recipeId)) {
      setSelectedOptionalIngs(prev => {
        const newState = {...prev};
        delete newState[recipeId];
        return newState;
      });
    }
  };

  const handleOptionalIngredientToggle = (recipeId: string, ingredientName: string, isChecked: boolean) => {
    setSelectedOptionalIngs(prev => ({
      ...prev,
      [recipeId]: {
        ...(prev[recipeId] || {}),
        [ingredientName]: isChecked,
      }
    }));
  };

  const handleServingsChange = (recipeId: string, servings: number) => {
    setServingsOverrides(prev => ({ ...prev, [recipeId]: Math.max(1, servings) }));
  };
  
  const calculateShoppingList = () => {
    const neededIngredients: Record<string, { totalQuantity: number; unit: Unit; sources: Array<{ recipeName: string; quantity: number }>, defaultStoreId?: string }> = {};

    selectedRecipeIds.forEach(recipeId => {
      const recipe = getRecipeById(recipeId);
      if (!recipe) return;

      const servingsMultiplier = (servingsOverrides[recipeId] || recipe.defaultServings) / recipe.defaultServings;

      recipe.ingredients.forEach(ing => {
        if (ing.isOptional && (!selectedOptionalIngs[recipeId] || !selectedOptionalIngs[recipeId][ing.ingredientName])) {
          return;
        }

        const normalizedName = normalizeIngredientName(ing.ingredientName);
        const scaledQuantity = ing.quantity * servingsMultiplier;
        
        const inventoryItemForDefaultStore = getInventoryItemByName(normalizedName);

        if (!neededIngredients[normalizedName]) {
          neededIngredients[normalizedName] = { totalQuantity: 0, unit: ing.unit, sources: [], defaultStoreId: inventoryItemForDefaultStore?.defaultStoreId };
        }
        
        const existingEntry = neededIngredients[normalizedName];
        const convertedScaledQuantity = convertUnit(scaledQuantity, ing.unit, existingEntry.unit);

        if (convertedScaledQuantity !== null) {
          existingEntry.totalQuantity += convertedScaledQuantity;
        } else { 
          if (existingEntry.totalQuantity === 0) { 
             existingEntry.unit = ing.unit;
             existingEntry.totalQuantity = scaledQuantity;
          } else {
            console.warn(`Could not convert ${ing.unit} to ${existingEntry.unit} for ${normalizedName}. This ingredient might be listed separately.`);
          }
        }
        existingEntry.sources.push({ recipeName: recipe.name, quantity: scaledQuantity });
        if (!existingEntry.defaultStoreId && inventoryItemForDefaultStore?.defaultStoreId) {
          existingEntry.defaultStoreId = inventoryItemForDefaultStore.defaultStoreId;
        }
      });
    });
    
    const shoppingListItems: ShoppingListItem[] = [];
    Object.entries(neededIngredients).forEach(([name, data]) => {
      const inventoryItem = getInventoryItemByName(name);
      let quantityToBuy = data.totalQuantity;

      if (inventoryItem) {
        const inventoryQuantityInNeededUnit = convertUnit(inventoryItem.quantity, inventoryItem.unit, data.unit);
        if (inventoryQuantityInNeededUnit !== null) {
          quantityToBuy -= inventoryQuantityInNeededUnit;
        }
      }
      
      if (quantityToBuy > 0.01) { 
        shoppingListItems.push({
          id: generateId(),
          ingredientName: name,
          neededQuantity: parseFloat(quantityToBuy.toFixed(2)), 
          unit: data.unit,
          recipeSources: data.sources,
          purchased: false,
          storeId: data.defaultStoreId,
        });
      }
    });
    
    if (shoppingListItems.length > 0) {
        const listName = `Shopping List - ${new Date().toLocaleDateString()}`;
        const newListId = addShoppingList({ name: listName, items: shoppingListItems });
        setActiveView('shopping_list_detail', {id: newListId});
    } else {
        alert("Nothing to buy! Your inventory covers all selected recipe needs, or no recipes were selected.");
        setActiveView('recipes');
    }
  };

  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => a.name.localeCompare(b.name));


  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => setActiveView('recipes')} variant="ghost" leftIcon={<ArrowLeftIcon />} className="mb-6">Back to Recipes</Button>
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Generate Shopping List</h2>
      
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-700 mb-2">Select Recipes</h3>
        <p className="text-sm text-blue-600 mb-4">Choose recipes and adjust servings. Optional ingredients can be selected per recipe.</p>
        {filteredRecipes.length === 0 && searchTerm === '' ? (
            <EmptyState
                icon={<BookOpenIcon />}
                title="No Recipes Available"
                message="Add some recipes first to generate a shopping list."
                actionButton={<Button onClick={() => setActiveView('recipes')} leftIcon={<PlusIcon/>}>Go to Recipes</Button>}
            />
        ) : filteredRecipes.length === 0 && searchTerm !== '' ? (
            <EmptyState
                icon={<MagnifyingGlassIcon />}
                title="No Recipes Found"
                message={`Your search for "${searchTerm}" did not match any recipes for list generation.`}
            />
        ) : (
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
            {filteredRecipes.map(recipe => {
                const currentServings = servingsOverrides[recipe.id] || recipe.defaultServings;
                const optionalIngredients = recipe.ingredients.filter(ing => ing.isOptional);
                const isRecipeSelected = selectedRecipeIds.includes(recipe.id);
                return (
                <div key={recipe.id} className="p-3 bg-white rounded shadow">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                        <CheckboxField 
                            id={`recipe-${recipe.id}`}
                            checked={isRecipeSelected}
                            onChange={() => toggleRecipeSelection(recipe.id)}
                            label={<span className="text-gray-700 font-medium">{recipe.name}</span>}
                        />
                        </div>
                        <div className="flex items-center space-x-2">
                        <InputField 
                            type="number" 
                            id={`servings-${recipe.id}`}
                            min="1"
                            max="50"
                            step="1"
                            value={currentServings}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleServingsChange(recipe.id, parseInt(e.target.value) || 1)}
                            onFocus={(e: FocusEvent<HTMLInputElement>) => e.target.select()}
                            className="w-20 p-1.5 text-sm"
                            aria-label={`Servings for ${recipe.name}`}
                        />
                        <label htmlFor={`servings-${recipe.id}`} className="text-sm text-gray-600">servings</label>
                        </div>
                    </div>
                    {isRecipeSelected && optionalIngredients.length > 0 && (
                        <div className="mt-2 pl-6 border-l-2 border-gray-200">
                            <p className="text-xs text-gray-500 mb-1">Optional Ingredients:</p>
                            {optionalIngredients.map(optIng => (
                                <CheckboxField
                                    key={optIng.ingredientName}
                                    id={`opt-${recipe.id}-${normalizeIngredientName(optIng.ingredientName)}`}
                                    label={`${optIng.ingredientName} (${optIng.quantity} ${optIng.unit})`}
                                    checked={selectedOptionalIngs[recipe.id]?.[optIng.ingredientName] || false}
                                    onChange={e => handleOptionalIngredientToggle(recipe.id, optIng.ingredientName, e.target.checked)}
                                    containerClassName="text-sm"
                                />
                            ))}
                        </div>
                    )}
                </div>
                );
            })}
            </div>
        )}
      </div>

      <Button 
        onClick={calculateShoppingList} 
        disabled={selectedRecipeIds.length === 0}
        variant="primary"
        size="lg"
        leftIcon={<ShoppingCartIcon />}
        className="w-full sm:w-auto"
      >
        Generate List
      </Button>
    </div>
  );
};

// Shopping Lists Page
const ShoppingListsPage: React.FC = () => {
  const { shoppingLists, archivedShoppingLists, deleteShoppingList, archiveShoppingList, unarchiveShoppingList, deleteArchivedShoppingList, bulkDeleteShoppingLists, bulkArchiveShoppingLists, bulkDeleteArchivedShoppingLists } = useShoppingLists();
  const { setActiveView, searchTerm } = useAppState();
  
  type ShoppingListTab = 'active' | 'completed' | 'archived';
  const [activeTab, setActiveTab] = useState<ShoppingListTab>('active');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Filter lists based on status and search term
  const activeLists = shoppingLists.filter(list => 
    list.status === ShoppingListStatus.ACTIVE &&
    (list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     list.items.some(item => item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())))
  ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const completedLists = shoppingLists.filter(list => 
    list.status === ShoppingListStatus.COMPLETED &&
    (list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     list.items.some(item => item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())))
  ).sort((a,b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());

  const archivedListsFiltered = archivedShoppingLists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.items.some(item => item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a,b) => new Date(b.archivedAt || b.createdAt).getTime() - new Date(a.archivedAt || a.createdAt).getTime());

  const getCurrentLists = () => {
    switch (activeTab) {
      case 'active': return activeLists;
      case 'completed': return completedLists;
      case 'archived': return archivedListsFiltered;
      default: return activeLists;
    }
  };

  const handleListSelection = (listId: string) => {
    setSelectedListIds(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const handleSelectAll = () => {
    const currentLists = getCurrentLists();
    setSelectedListIds(currentLists.map(list => list.id));
  };

  const handleDeselectAll = () => {
    setSelectedListIds([]);
  };

  const handleBulkArchive = () => {
    bulkArchiveShoppingLists(selectedListIds);
    setSelectedListIds([]);
    setSelectionMode(false);
    setShowArchiveConfirm(false);
  };

  const handleBulkDelete = () => {
    if (activeTab === 'archived') {
      bulkDeleteArchivedShoppingLists(selectedListIds);
    } else {
      bulkDeleteShoppingLists(selectedListIds);
    }
    setSelectedListIds([]);
    setSelectionMode(false);
    setShowDeleteConfirm(false);
  };

  const getStatusBadge = (list: ShoppingList) => {
    switch (list.status) {
      case ShoppingListStatus.ACTIVE:
        return <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Active</span>;
      case ShoppingListStatus.COMPLETED:
        return <span className="inline-block px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Completed</span>;
      case ShoppingListStatus.ARCHIVED:
        return <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Archived</span>;
      default:
        return null;
    }
  };

  const renderShoppingListCard = (list: ShoppingList) => {
    const isSelected = selectedListIds.includes(list.id);
    const purchasedCount = list.items.filter(item => item.purchased).length;
    const progressPercentage = list.items.length > 0 ? (purchasedCount / list.items.length) * 100 : 0;

    return (
      <Card 
        key={list.id} 
        onClick={() => selectionMode ? handleListSelection(list.id) : setActiveView('shopping_list_detail', {id: list.id})} 
        className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
      >
        <div className="flex items-center justify-between">
          {selectionMode && (
            <div className="mr-4">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleListSelection(list.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          )}
          
          <div className="flex-grow">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-blue-600">{list.name}</h3>
              {getStatusBadge(list)}
            </div>
            
            <div className="space-y-1 text-sm text-gray-500">
              <p>Created: {new Date(list.createdAt).toLocaleDateString()}</p>
              {list.completedAt && <p>Completed: {new Date(list.completedAt).toLocaleDateString()}</p>}
              {list.archivedAt && <p>Archived: {new Date(list.archivedAt).toLocaleDateString()}</p>}
              <p>{list.items.length} items ({purchasedCount} purchased)</p>
            </div>

            {/* Progress bar */}
            {list.items.length > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {!selectionMode && (
            <div className="flex space-x-2 ml-4">
              {activeTab === 'completed' && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    archiveShoppingList(list.id); 
                  }}
                  title="Archive this list"
                >
                  <ArchiveBoxIcon className="w-4 h-4" />
                </Button>
              )}
              
              {activeTab === 'archived' && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    unarchiveShoppingList(list.id); 
                  }}
                  title="Restore from archive"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </Button>
              )}

              <Button 
                variant="danger" 
                size="sm" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (activeTab === 'archived') {
                    deleteArchivedShoppingList(list.id);
                  } else {
                    deleteShoppingList(list.id);
                  }
                }}
                title="Delete this list"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const currentLists = getCurrentLists();
  const hasLists = activeLists.length > 0 || completedLists.length > 0 || archivedListsFiltered.length > 0;

  return (
    <div className="container mx-auto p-4">
      {/* Bulk Actions Bar */}
      {selectionMode && (
        <div className="sticky top-0 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className="text-blue-700 font-medium">
              {selectedListIds.length} list{selectedListIds.length !== 1 ? 's' : ''} selected
            </span>
            <Button variant="ghost" size="sm" onClick={handleSelectAll}>
              Select All
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
          </div>
          <div className="flex space-x-2">
            {activeTab === 'completed' && selectedListIds.length > 0 && (
              <Button variant="secondary" onClick={() => setShowArchiveConfirm(true)}>
                Archive Selected
              </Button>
            )}
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete Selected
            </Button>
            <Button variant="ghost" onClick={() => { setSelectionMode(false); setSelectedListIds([]); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Shopping Lists</h1>
        <div className="flex space-x-2">
          {hasLists && (
            <Button 
              variant="ghost" 
              onClick={() => setSelectionMode(!selectionMode)}
              leftIcon={selectionMode ? <XMarkIcon className="w-4 h-4" /> : <PencilIcon className="w-4 h-4" />}
            >
              {selectionMode ? 'Cancel' : 'Select'}
            </Button>
          )}
          <Button 
            onClick={() => setActiveView('generate_shopping_list')} 
            leftIcon={<PlusIcon/>}
          >
            New List
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active ({activeLists.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Completed ({completedLists.length})
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'archived'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Archived ({archivedListsFiltered.length})
          </button>
        </nav>
      </div>

      {/* Lists Content */}
      {currentLists.length === 0 && searchTerm === '' ? (
        <EmptyState 
          icon={<ShoppingCartIcon />}
          title={`No ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Shopping Lists`}
          message={
            activeTab === 'active' 
              ? "Create a shopping list from your recipes or add items manually."
              : activeTab === 'completed'
              ? "Complete some shopping lists to see them here."
              : "Archive completed lists to see them here."
          }
          actionButton={
            activeTab === 'active' ? (
              <Button onClick={() => setActiveView('generate_shopping_list')} leftIcon={<PlusIcon/>}>
                Generate New List
              </Button>
            ) : undefined
          }
        />
      ) : currentLists.length === 0 && searchTerm !== '' ? (
        <EmptyState 
          icon={<MagnifyingGlassIcon />}
          title="No Shopping Lists Found"
          message={`Your search for "${searchTerm}" did not match any ${activeTab} shopping lists.`}
        />
      ) : (
        <div className="space-y-4">
          {currentLists.map(renderShoppingListCard)}
        </div>
      )}

      {/* Confirmation Modals */}
      <Modal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)} 
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete {selectedListIds.length} shopping list{selectedListIds.length !== 1 ? 's' : ''}? 
            This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleBulkDelete}>
              Delete {selectedListIds.length} List{selectedListIds.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showArchiveConfirm} 
        onClose={() => setShowArchiveConfirm(false)} 
        title="Confirm Archive"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to archive {selectedListIds.length} completed shopping list{selectedListIds.length !== 1 ? 's' : ''}? 
            You can restore them later from the archived section.
          </p>
          <div className="flex justify-end space-x-3">
            <Button variant="ghost" onClick={() => setShowArchiveConfirm(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleBulkArchive}>
              Archive {selectedListIds.length} List{selectedListIds.length !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};






// --- Main App Layout & Router Setup ---
const AppLayout: React.FC = () => {
  const { activeView, setActiveView, searchTerm, setSearchTerm } = useAppState();
  const { currentUser, logout, isLoadingAuth } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);


  const navItems: Array<{ view: ActiveView; label: string; icon: ReactElement<{ className?: string }> }> = [
    { view: 'dashboard', label: 'Dashboard', icon: <CubeTransparentIcon /> },
    { view: 'recipes', label: 'Recipes', icon: <BookOpenIcon /> },
    { view: 'inventory', label: 'Inventory', icon: <ArchiveBoxIcon /> },
    { view: 'shopping_lists', label: 'Shopping Lists', icon: <ShoppingCartIcon /> },
    { view: 'stores', label: 'Stores', icon: <BuildingStorefrontIcon /> },
  ];

  const showSearchBar = currentUser && ['recipes', 'inventory', 'shopping_lists', 'stores', 'generate_shopping_list'].includes(activeView);

  if (isLoadingAuth) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-100">
          <p className="text-lg text-gray-600">Loading Kitchen Pal...</p>
        </div>
      );
  }


  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow-md sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to={currentUser ? "/dashboard" : "/login"} onClick={() => setActiveView(currentUser ? 'dashboard' : 'login')} className="text-2xl font-bold text-blue-600 flex items-center">
              <img src="/vite.svg" alt="Kitchen Pal Logo" className="h-8 w-8 mr-2" /> 
              {APP_NAME}
            </Link>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-1">
              {currentUser ? (
                <>
                  {navItems.map(item => (
                    <Link
                      key={item.view}
                      to={`/${item.view}`}
                      onClick={() => { setActiveView(item.view); setMobileMenuOpen(false); }}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2
                        ${activeView.startsWith(item.view) ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                    >
                      {React.cloneElement(item.icon, { className: "w-5 h-5" })}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  <div className="relative group">
                     <button 
                        onClick={() => setActiveView('profile')}
                        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        aria-label="User Profile"
                      >
                       <img 
                          src={currentUser.preferences.avatarUrl || DEFAULT_AVATAR_IMAGE} 
                          alt="User Avatar" 
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR_IMAGE)}
                        />
                     </button>
                  </div>
                   <Button onClick={() => { logout(); setMobileMenuOpen(false); }} variant="ghost" size="sm" leftIcon={<ArrowLeftOnRectangleIcon className="w-5 h-5"/>}>
                      Logout
                    </Button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => { setActiveView('login'); setMobileMenuOpen(false); }} className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex items-center space-x-2"><ArrowRightOnRectangleIcon className="w-5 h-5"/><span>Login</span></Link>
                  <Link to="/signup" onClick={() => { setActiveView('signup'); setMobileMenuOpen(false); }} className="px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 flex items-center space-x-2"><UserPlusIcon className="w-5 h-5"/><span>Sign Up</span></Link>
                </>
              )}
              {showSearchBar && (
                <div className="w-full md:w-64 lg:w-80 ml-4">
                  <SearchInput 
                    value={searchTerm} 
                    onChange={setSearchTerm} 
                    placeholder={`Search ${activeView.replace(/_/g, ' ').replace('detail', '')}...`}
                  />
                </div>
              )}
            </div>
            
            {/* Mobile Menu Button & Search (if applicable) */}
            <div className="md:hidden flex items-center"> 
               {showSearchBar && !mobileMenuOpen && ( // Only show search if menu is closed on mobile, otherwise it's in the menu
                <div className="w-auto mr-2"> 
                   <SearchInput 
                    value={searchTerm} 
                    onChange={setSearchTerm} 
                    placeholder="Search..."
                  />
                </div>
              )}
               <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-500 hover:text-gray-700 focus:outline-none p-2" aria-label="Open mobile menu" aria-expanded={mobileMenuOpen}>
                 {mobileMenuOpen ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                 ) : (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                 )}
               </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white shadow-lg">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {currentUser && showSearchBar && (
                 <div className="p-2">
                    <SearchInput 
                      value={searchTerm} 
                      onChange={setSearchTerm} 
                      placeholder={`Search ${activeView.replace(/_/g, ' ').replace('detail', '')}...`}
                    />
                  </div>
              )}
              {currentUser ? (
                <>
                  {navItems.map(item => (
                      <Link
                        key={`mobile-${item.view}`}
                        to={`/${item.view}`}
                        onClick={() => { setActiveView(item.view); setMobileMenuOpen(false); }}
                        className={`block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 
                        ${activeView.startsWith(item.view) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                      >
                        {React.cloneElement(item.icon, { className: "w-5 h-5" })}
                        <span>{item.label}</span>
                      </Link>
                  ))}
                  <Link
                    to="/profile"
                    onClick={() => { setActiveView('profile'); setMobileMenuOpen(false); }}
                    className={`block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 
                    ${activeView === 'profile' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
                  >
                    <UserCircleIcon className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                   <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                 <>
                  <Link to="/login" onClick={() => { setActiveView('login'); setMobileMenuOpen(false); }} className="block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"><ArrowRightOnRectangleIcon className="w-5 h-5"/><span>Login</span></Link>
                  <Link to="/signup" onClick={() => { setActiveView('signup'); setMobileMenuOpen(false); }} className="block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 text-gray-700 hover:bg-gray-100 hover:text-gray-900"><UserPlusIcon className="w-5 h-5"/><span>Sign Up</span></Link>
                </>
              )}
              </div>
          </div>
        )}
      </nav>
      
      <main className="flex-grow container mx-auto py-4 sm:py-8 px-2 sm:px-4">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/recipes" element={<ProtectedRoute><RecipesPage /></ProtectedRoute>} />
          <Route path="/recipe_detail/:id" element={<ProtectedRoute><RecipeDetailPage /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
          <Route path="/shopping_lists" element={<ProtectedRoute><ShoppingListsPage /></ProtectedRoute>} />
          <Route path="/shopping_list_detail/:id" element={<ProtectedRoute><ShoppingListDetailPage /></ProtectedRoute>} />
          <Route path="/generate_shopping_list" element={<ProtectedRoute><ShoppingListGeneratorPage /></ProtectedRoute>} />
          <Route path="/stores" element={<ProtectedRoute><StoresPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} /> 
        </Routes>
      </main>
      <footer className="bg-white border-t border-gray-200 text-center p-4 text-sm text-gray-500">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </footer>
    </div>
  );
}

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <AuthProvider> {/* Manages isLoadingAuth, currentUser */}
        <MigrationRunner> {/* Runs migration after auth, before other data providers load fully */}
          <CategoriesProvider> {/* Manages categories, uses useAuth */}
            <AppStateProvider> {/* Uses useAuth for default view logic */}
              <RecipesProvider> {/* Uses useAuth */}
                <InventoryProvider> {/* Uses useAuth, useCategories; THIS IS THE INLINE ONE MODIFIED */}
                  <StoresProvider> {/* Uses useAuth */}
                    <ShoppingListsProvider> {/* Uses useAuth */}
                      <AppLayout />
                    </ShoppingListsProvider>
                  </StoresProvider>
                </InventoryProvider>
              </RecipesProvider>
            </AppStateProvider>
          </CategoriesProvider>
        </MigrationRunner>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
