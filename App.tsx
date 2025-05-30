import React, { useState, useEffect, createContext, useContext, useCallback, ReactNode, FormEvent, ReactElement, ChangeEvent } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { 
  Recipe, RecipeIngredient, InventoryItem, Store, ShoppingList, ShoppingListItem, Unit, FrequencyOfUse, MeasurementSystem, User, UserPreferences,
  RecipesContextType, InventoryContextType, StoresContextType, ShoppingListsContextType, AppStateContextType, AuthContextType, ActiveView, ScrapedRecipeData
} from './types';
import { 
  generateId, UNITS_ARRAY, FREQUENCY_OF_USE_OPTIONS, MEASUREMENT_SYSTEM_OPTIONS, normalizeIngredientName, convertUnit, isItemExpiringSoon, isItemExpired, APP_NAME,
  BookOpenIcon, ArchiveBoxIcon, ShoppingCartIcon, BuildingStorefrontIcon, PlusIcon, TrashIcon, PencilIcon, ArrowLeftIcon, MagnifyingGlassIcon, DEFAULT_RECIPE_IMAGE, DEFAULT_AVATAR_IMAGE, CalendarIcon, SparklesIcon, CubeTransparentIcon, UserCircleIcon, ArrowRightOnRectangleIcon, UserPlusIcon, ArrowLeftOnRectangleIcon, WrenchScrewdriverIcon,
  LOCAL_STORAGE_USERS_KEY, ACTIVE_USER_ID_KEY
} from './constants';
import { loadState, saveState } from './localStorageService';
import { Modal, Button, InputField, TextAreaField, SelectField, Card, SearchInput, EmptyState, AddItemButton, CheckboxField, Alert } from './components';
import { IngredientCorrectionButton } from './components/IngredientCorrectionButton';
import { scrapeRecipeFromUrl, validateRecipeUrl } from './services/recipeScrapingService';
import { normalizeScrapedRecipe, validateNormalizedRecipe } from './utils/recipeNormalizer';
import { detectIngredientIssues, autoFixIngredient, hasIngredientIssues, type IngredientIssue } from './utils/ingredientParser';

// --- CONTEXTS ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const RecipesContext = createContext<RecipesContextType | undefined>(undefined);
const InventoryContext = createContext<InventoryContextType | undefined>(undefined);
const StoresContext = createContext<StoresContextType | undefined>(undefined);
const ShoppingListsContext = createContext<ShoppingListsContextType | undefined>(undefined);
const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

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
export const useInventory = (): InventoryContextType => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
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
  const globalRecipesKey = 'recipes'; // Old global key

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    if (currentUser && userRecipesKey) {
      const userSpecificData = loadState<Recipe[]>(userRecipesKey);
      if (userSpecificData) return userSpecificData;
      // Try to load global data if user-specific doesn't exist (one-time migration attempt)
      const globalData = loadState<Recipe[]>(globalRecipesKey);
      if (globalData) {
        saveState(userRecipesKey, globalData); // Save it under user-specific key
        // Optionally, clear global data: localStorage.removeItem(globalRecipesKey);
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
      setRecipes([]); // Clear data if logged out
    }
  }, [currentUser, userRecipesKey]);

  useEffect(() => {
    if (userRecipesKey && currentUser) { // Only save if there's a user and a key
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
  const userInventoryKey = currentUser ? `inventory_${currentUser.id}` : null;
  const globalInventoryKey = 'inventory';

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
     if (currentUser && userInventoryKey) {
      const userSpecificData = loadState<InventoryItem[]>(userInventoryKey);
      if (userSpecificData) return userSpecificData;
      const globalData = loadState<InventoryItem[]>(globalInventoryKey);
      if (globalData) {
        saveState(userInventoryKey, globalData);
        return globalData;
      }
    }
    return [];
  });

  useEffect(() => {
    if (currentUser && userInventoryKey) {
      const userSpecificData = loadState<InventoryItem[]>(userInventoryKey);
      if (userSpecificData) {
        setInventory(userSpecificData);
      } else {
        const globalData = loadState<InventoryItem[]>(globalInventoryKey);
        if (globalData) {
          setInventory(globalData);
          saveState(userInventoryKey, globalData);
        } else {
          setInventory([]);
        }
      }
    } else if (!currentUser) {
      setInventory([]);
    }
  }, [currentUser, userInventoryKey]);


  useEffect(() => {
    if (userInventoryKey && currentUser) {
      saveState(userInventoryKey, inventory);
    }
  }, [inventory, userInventoryKey, currentUser]);

  const addInventoryItem = (itemData: Omit<InventoryItem, 'id'>, fromPurchase: boolean = false) => {
    if (!currentUser) return;
    const normalizedName = normalizeIngredientName(itemData.ingredientName);
    setInventory(prevInventory => {
        const existingItemIndex = prevInventory.findIndex(i => normalizeIngredientName(i.ingredientName) === normalizedName && i.unit === itemData.unit);
        if (existingItemIndex > -1) {
            const newInventory = [...prevInventory];
            const existingItem = newInventory[existingItemIndex];
            newInventory[existingItemIndex] = {
                ...existingItem,
                quantity: existingItem.quantity + itemData.quantity,
                ...(fromPurchase ? {} : { 
                  expirationDate: itemData.expirationDate,
                  frequencyOfUse: itemData.frequencyOfUse,
                  lowStockThreshold: itemData.lowStockThreshold,
                  defaultStoreId: itemData.defaultStoreId,
                })
            };
            return newInventory;
        } else {
            return [...prevInventory, { ...itemData, id: generateId(), ingredientName: normalizedName }];
        }
    });
  };
  const updateInventoryItem = (updatedItem: InventoryItem) => {
    if (!currentUser) return;
    const normalizedName = normalizeIngredientName(updatedItem.ingredientName);
    setInventory(prev => prev.map(i => i.id === updatedItem.id ? {...updatedItem, ingredientName: normalizedName } : i));
  };
  const deleteInventoryItem = (itemId: string) => {
    if (!currentUser) return;
    setInventory(prev => prev.filter(i => i.id !== itemId));
  }
  const getInventoryItemByName = (name: string) => inventory.find(i => normalizeIngredientName(i.ingredientName) === normalizeIngredientName(name));

  const deductFromInventory = (ingredientName: string, quantity: number, unit: Unit): boolean => {
    if (!currentUser) return false;
    const normalizedName = normalizeIngredientName(ingredientName);
    let deductionHappened = false;
    setInventory(prevInventory => 
      prevInventory.map(item => {
        if (normalizeIngredientName(item.ingredientName) === normalizedName) {
          const convertedQuantityToDeduct = convertUnit(quantity, unit, item.unit);
          if (convertedQuantityToDeduct !== null) {
            item.quantity = Math.max(0, item.quantity - convertedQuantityToDeduct);
            deductionHappened = true;
          }
        }
        return item;
      }).filter(item => item.quantity > 0.001 || (item.quantity === 0 && (item.unit === Unit.PIECE || item.unit === Unit.NONE)))
    );
    return deductionHappened;
  };
  
  return <InventoryContext.Provider value={{ inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, getInventoryItemByName, deductFromInventory }}>{children}</InventoryContext.Provider>;
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
  const globalShoppingListsKey = 'shoppingLists';
  
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>(() => {
    if (currentUser && userShoppingListsKey) {
      const userSpecificData = loadState<ShoppingList[]>(userShoppingListsKey);
      if (userSpecificData) return userSpecificData;
      const globalData = loadState<ShoppingList[]>(globalShoppingListsKey);
      if (globalData) {
        saveState(userShoppingListsKey, globalData);
        return globalData;
      }
    }
    return [];
  });

 useEffect(() => {
    if (currentUser && userShoppingListsKey) {
      const userSpecificData = loadState<ShoppingList[]>(userShoppingListsKey);
      if (userSpecificData) {
        setShoppingLists(userSpecificData);
      } else {
        const globalData = loadState<ShoppingList[]>(globalShoppingListsKey);
        if (globalData) {
          setShoppingLists(globalData);
          saveState(userShoppingListsKey, globalData);
        } else {
          setShoppingLists([]);
        }
      }
    } else if (!currentUser) {
      setShoppingLists([]);
    }
  }, [currentUser, userShoppingListsKey]);

  useEffect(() => {
    if (userShoppingListsKey && currentUser) {
      saveState(userShoppingListsKey, shoppingLists);
    }
  }, [shoppingLists, userShoppingListsKey, currentUser]);

  const addShoppingList = (listData: Omit<ShoppingList, 'id' | 'createdAt'>): string => {
    if (!currentUser) return '';
    const newList = { ...listData, id: generateId(), createdAt: new Date().toISOString() };
    setShoppingLists(prev => [newList, ...prev]);
    return newList.id;
  };
  const updateShoppingList = (updatedList: ShoppingList) => {
    if (!currentUser) return;
    setShoppingLists(prev => prev.map(sl => sl.id === updatedList.id ? updatedList : sl));
  }
  const deleteShoppingList = (listId: string) => {
    if (!currentUser) return;
    setShoppingLists(prev => prev.filter(sl => sl.id !== listId));
  }
  const getShoppingListById = (listId: string) => shoppingLists.find(sl => sl.id === listId);

  return <ShoppingListsContext.Provider value={{ shoppingLists, addShoppingList, updateShoppingList, deleteShoppingList, getShoppingListById }}>{children}</ShoppingListsContext.Provider>;
};

const AppStateProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isLoadingAuth } = useAuth(); // Use useAuth here
  
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
            <label className="block mb-2 text-sm font-medium text-gray-700">Ingredients</label>
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
          <InputField label="Cook Time (e.g., 1 hour)" id="cookTime" value={cookTime} onChange={e => setCookTime(e.target.value)} />
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
const RecipeCard: React.FC<{ recipe: Recipe; onSelect: () => void; onDelete: () => void; onEdit: () => void; }> = ({ recipe, onSelect, onDelete, onEdit }) => {
  const hasOptional = recipe.ingredients.some(ing => ing.isOptional);
  return (
    <Card className="flex flex-col justify-between h-full">
      <div>
        <img 
          src={recipe.imageUrl || DEFAULT_RECIPE_IMAGE} 
          alt={recipe.name} 
          className="w-full h-40 object-cover rounded-t-lg mb-4 cursor-pointer"
          onClick={onSelect}
          onError={(e) => (e.currentTarget.src = DEFAULT_RECIPE_IMAGE)}
        />
        <h3 className="text-xl font-semibold text-blue-600 hover:text-blue-800 mb-2 cursor-pointer" onClick={onSelect}>{recipe.name}</h3>
        <p className="text-sm text-gray-500 mb-1">Servings: {recipe.defaultServings}</p>
        {recipe.prepTime && <p className="text-sm text-gray-500 mb-1">Prep: {recipe.prepTime}</p>}
        {recipe.cookTime && <p className="text-sm text-gray-500 mb-1">Cook: {recipe.cookTime}</p>}
        {hasOptional && <p className="text-xs text-purple-600 mb-1">Has optional ingredients</p>}
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
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${recipe.name}`}><PencilIcon /></Button>
        <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); onDelete(); }} aria-label={`Delete ${recipe.name}`}><TrashIcon /></Button>
      </div>
    </Card>
  );
};

// Recipes Page
const RecipesPage: React.FC = () => {
  const { recipes, addRecipe, updateRecipe, deleteRecipe } = useRecipes();
  const { setActiveView, searchTerm } = useAppState();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);

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

  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.ingredients.some(ing => ing.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (recipe.tags && recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  ).sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="container mx-auto p-4">
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
          {filteredRecipes.map(recipe => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              onSelect={() => setActiveView('recipe_detail', { id: recipe.id })}
              onDelete={() => deleteRecipe(recipe.id)}
              onEdit={() => openEditModal(recipe)}
            />
          ))}
        </div>
      )}
      <AddItemButton onClick={() => { setEditingRecipe(undefined); setShowAddModal(true); }} text="Add Recipe" />
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingRecipe(undefined); }} title={editingRecipe ? "Edit Recipe" : "Add New Recipe"} size="2xl">
        <RecipeForm 
          initialRecipe={editingRecipe}
          onSave={handleSaveRecipe} 
          onClose={() => { setShowAddModal(false); setEditingRecipe(undefined); }} 
        />
      </Modal>
    </div>
  );
};

// Recipe Detail Page
const RecipeDetailPage: React.FC = () => {
  const { getRecipeById } = useRecipes();
  const { deductFromInventory } = useInventory();
  const { setActiveView, viewParams } = useAppState();
  const [showPrepareModal, setShowPrepareModal] = useState(false);
  const [prepareServings, setPrepareServings] = useState(1);
  const [alertMessage, setAlertMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);


  const recipe = getRecipeById(viewParams.id || '');

  useEffect(() => {
    if (recipe) {
      setPrepareServings(recipe.defaultServings);
    }
  }, [recipe]);

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

  const handlePrepareRecipe = () => {
    recipe.ingredients.forEach(ing => {
      if (ing.isOptional) return; 
      const scaledQuantity = (ing.quantity / recipe.defaultServings) * prepareServings;
      deductFromInventory(ing.ingredientName, scaledQuantity, ing.unit);
    });
    setShowPrepareModal(false);
    setAlertMessage({type: 'success', message: `${recipe.name} prepared for ${prepareServings} servings! Inventory updated.`});
    setTimeout(() => setAlertMessage(null), 5000);
  };

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
              <span className="mr-4">Servings: {defaultServings}</span>
              {prepTime && <span className="mr-4">Prep: {prepTime}</span>}
              {cookTime && <span className="mr-4">Cook: {cookTime}</span>}
            </div>
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
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {ingredients.map((ing, index) => (
                  <li key={index} className={`${ing.isOptional ? 'text-gray-500 italic' : ''}`}>
                    {ing.quantity} {ing.unit || ''} {ing.ingredientName} {ing.isOptional && "(optional)"}
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2">
               <h2 className="text-xl font-semibold text-gray-700 mb-3">Instructions</h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                {instructions || "No instructions provided."}
              </div>
            </div>
          </div>
        </div>
         <div className="p-6 md:p-8 border-t border-gray-200 flex justify-end space-x-3">
            <Button 
              variant="success" 
              onClick={() => { setPrepareServings(recipe.defaultServings); setShowPrepareModal(true); }}
              leftIcon={<SparklesIcon />}
            >
              Prepare this Recipe
            </Button>
            <Button 
              variant="primary" 
              onClick={() => setActiveView('generate_shopping_list', { recipeIds: recipe.id })}
              leftIcon={<ShoppingCartIcon />}
            >
              Add to Shopping List
            </Button>
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
                <Button variant="success" onClick={handlePrepareRecipe}>Confirm & Deduct</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};


// Inventory Page
const InventoryPage: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();
  const { searchTerm } = useAppState(); 
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | undefined>(undefined);

  const handleSave = (itemData: Omit<InventoryItem, 'id'> | InventoryItem) => {
    if ('id' in itemData) {
      updateInventoryItem(itemData);
    } else {
      addInventoryItem(itemData, false); 
    }
    setShowModal(false);
    setEditingItem(undefined);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const filteredInventory = inventory.filter(item =>
    item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a,b) => {
      if (a.expirationDate && b.expirationDate) return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      if (a.expirationDate) return -1;
      if (b.expirationDate) return 1;
      return a.ingredientName.localeCompare(b.ingredientName);
  });

  return (
    <div className="container mx-auto p-4">
       {filteredInventory.length === 0 && searchTerm === '' ? (
        <EmptyState 
          icon={<ArchiveBoxIcon />}
          title="No Inventory Items Yet"
          message="Add items to your inventory manually or when purchasing from a shopping list."
          actionButton={<Button onClick={() => { setEditingItem(undefined); setShowModal(true); }} leftIcon={<PlusIcon/>}>Add New Item</Button>}
        />
      ) : filteredInventory.length === 0 && searchTerm !== '' ? (
         <EmptyState 
          icon={<MagnifyingGlassIcon />}
          title="No Items Found"
          message={`Your search for "${searchTerm}" did not match any inventory items.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map(item => {
            const expiringSoon = isItemExpiringSoon(item.expirationDate);
            const expired = isItemExpired(item.expirationDate);
            const lowStock = item.lowStockThreshold && item.quantity < item.lowStockThreshold;
            let cardBorder = '';
            if (expired) cardBorder = 'border-2 border-red-700 bg-red-50';
            else if (expiringSoon) cardBorder = 'border-2 border-yellow-500 bg-yellow-50';
            else if (lowStock) cardBorder = 'border-2 border-red-500';

            return (
            <Card key={item.id} className={`relative ${cardBorder}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{item.ingredientName}</h3>
                  <p className="text-gray-600">{item.quantity.toFixed(2)} {item.unit}</p>
                  {item.expirationDate && <p className={`text-xs ${expired || expiringSoon ? 'font-semibold' : ''} ${expired ? 'text-red-700' : expiringSoon ? 'text-yellow-700' : 'text-gray-500'}`}>Exp: {new Date(item.expirationDate).toLocaleDateString()} {expired && "(Expired!)"}{!expired && expiringSoon && "(Expiring Soon!)"}</p>}
                  {lowStock && !expired && !expiringSoon && <span className="text-xs text-red-600 font-semibold">Low Stock!</span>}
                  {item.frequencyOfUse && <p className="text-xs text-gray-500">Use: {item.frequencyOfUse}</p>}
                </div>
                <div className="flex flex-col space-y-1">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(item)} className="p-1.5"><PencilIcon className="w-4 h-4"/></Button>
                  <Button variant="danger" size="sm" onClick={() => deleteInventoryItem(item.id)} className="p-1.5"><TrashIcon className="w-4 h-4"/></Button>
                </div>
              </div>
            </Card>
          );})}
        </div>
      )}
      <AddItemButton onClick={() => { setEditingItem(undefined); setShowModal(true); }} text="Add Inventory Item" />
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingItem(undefined); }} title={editingItem ? "Edit Inventory Item" : "Add Inventory Item"} size="lg">
        <InventoryItemForm initialItem={editingItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditingItem(undefined); }} />
      </Modal>
    </div>
  );
};

// Inventory Item Form
interface InventoryItemFormProps {
  initialItem?: InventoryItem;
  onSave: (itemData: Omit<InventoryItem, 'id'> | InventoryItem) => void;
  onClose: () => void;
}
const InventoryItemForm: React.FC<InventoryItemFormProps> = ({ initialItem, onSave, onClose }) => {
  const { stores } = useStores();
  const [ingredientName, setIngredientName] = useState(initialItem?.ingredientName || '');
  const [quantity, setQuantity] = useState(initialItem?.quantity || 0);
  const [unit, setUnit] = useState<Unit>(initialItem?.unit ?? Unit.PIECE);
  const [lowStockThreshold, setLowStockThreshold] = useState(initialItem?.lowStockThreshold || undefined); 
  const [expirationDate, setExpirationDate] = useState(initialItem?.expirationDate || '');
  const [frequencyOfUse, setFrequencyOfUse] = useState<FrequencyOfUse | ''>(initialItem?.frequencyOfUse || '');
  const [defaultStoreId, setDefaultStoreId] = useState<string>(initialItem?.defaultStoreId || '');

  const storeOptions = [{value: '', label: 'No Default Store'}, ...stores.map(s => ({ value: s.id, label: s.name }))];


  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const itemData = { 
      ingredientName, 
      quantity: Number(quantity), 
      unit, 
      lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : undefined,
      expirationDate: expirationDate || undefined,
      frequencyOfUse: frequencyOfUse as FrequencyOfUse || undefined,
      defaultStoreId: defaultStoreId || undefined,
    };
    if (initialItem) {
      onSave({ ...initialItem, ...itemData });
    } else {
      onSave(itemData);
    }
    onClose(); 
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField label="Ingredient Name" id="invItemName" value={ingredientName} onChange={e => setIngredientName(e.target.value)} required />
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Quantity" id="invItemQty" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} min="0" step="any" required />
        <SelectField label="Unit" id="invItemUnit" options={UNITS_ARRAY.map(u => ({value: u, label: u}))} value={unit} onChange={e => setUnit(e.target.value as Unit)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Low Stock Threshold (Optional)" id="invItemLowStock" type="number" placeholder="e.g., 2" value={lowStockThreshold || ''} onChange={e => setLowStockThreshold(e.target.value === '' ? undefined : Number(e.target.value))} min="0" step="any" />
        <InputField label="Expiration Date (Optional)" id="invItemExpDate" type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="Frequency of Use (Optional)" id="invItemFreq" options={[{value: '', label: 'Select frequency'}, ...FREQUENCY_OF_USE_OPTIONS]} value={frequencyOfUse} onChange={e => setFrequencyOfUse(e.target.value as FrequencyOfUse | '')} />
        <SelectField label="Default Store (Optional)" id="invItemStore" options={storeOptions} value={defaultStoreId} onChange={e => setDefaultStoreId(e.target.value)} />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save Item</Button>
      </div>
    </form>
  );
};


// Shopping List Generator Page
interface SelectedOptionalIngredients {
  [recipeId: string]: { [ingredientName: string]: boolean };
}
const ShoppingListGeneratorPage: React.FC = () => {
  const { recipes, getRecipeById } = useRecipes();
  const { inventory, getInventoryItemByName } = useInventory();
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
    setServingsOverrides(prev => ({ ...prev, recipeId: Math.max(1, servings) }));
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
                            value={currentServings}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleServingsChange(recipe.id, parseInt(e.target.value))}
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
  const { shoppingLists, deleteShoppingList } = useShoppingLists();
  const { setActiveView, searchTerm } = useAppState();

  const filteredLists = shoppingLists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    list.items.some(item => item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


  return (
    <div className="container mx-auto p-4">
       {filteredLists.length === 0 && searchTerm === '' ? (
        <EmptyState 
          icon={<ShoppingCartIcon />}
          title="No Shopping Lists Yet"
          message="Create a shopping list from your recipes or add items manually."
          actionButton={<Button onClick={() => setActiveView('generate_shopping_list')} leftIcon={<PlusIcon/>}>Generate New List</Button>}
        />
      ) : filteredLists.length === 0 && searchTerm !== '' ? (
        <EmptyState 
            icon={<MagnifyingGlassIcon />}
            title="No Shopping Lists Found"
            message={`Your search for "${searchTerm}" did not match any shopping lists.`}
        />
      ) : (
        <div className="space-y-4">
          {filteredLists.map(list => (
            <Card key={list.id} onClick={() => setActiveView('shopping_list_detail', {id: list.id})} className="hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-blue-600">{list.name}</h3>
                  <p className="text-sm text-gray-500">Created: {new Date(list.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">{list.items.length} items ({list.items.filter(i => i.purchased).length} purchased)</p>
                </div>
                <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); deleteShoppingList(list.id); }}><TrashIcon/></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AddItemButton onClick={() => setActiveView('generate_shopping_list')} text="New Shopping List" />
    </div>
  );
};

// Shopping List Detail Page
const ShoppingListDetailPage: React.FC = () => {
  const { getShoppingListById, updateShoppingList } = useShoppingLists();
  const { inventory, addInventoryItem: addInvItemSystem } = useInventory(); // Renamed to avoid conflict
  const { stores, getStoreById } = useStores();
  const { setActiveView, viewParams } = useAppState();
  const listId = viewParams.id || '';
  const shoppingList = getShoppingListById(listId);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  if (!shoppingList) { 
    return (
      <div className="container mx-auto p-4 text-center">
        <EmptyState
            icon={<ShoppingCartIcon />}
            title="Shopping List Not Found"
            message="The shopping list you are looking for does not exist or may have been removed."
            actionButton={<Button onClick={() => setActiveView('shopping_lists')} variant="primary">Back to Shopping Lists</Button>}
        />
      </div>
    );
  }

  const shoppingListItemNames = shoppingList.items.map(item => normalizeIngredientName(item.ingredientName));

  const suggestedLowStockItems = inventory.filter(invItem => 
    invItem.lowStockThreshold && invItem.quantity < invItem.lowStockThreshold &&
    !shoppingListItemNames.includes(normalizeIngredientName(invItem.ingredientName))
  );

  const suggestedExpiringItems = inventory.filter(invItem =>
    isItemExpiringSoon(invItem.expirationDate) && !isItemExpired(invItem.expirationDate) &&
    !shoppingListItemNames.includes(normalizeIngredientName(invItem.ingredientName))
  );


  const handleAddSuggestedItem = (invItem: InventoryItem, type: 'low-stock' | 'expiring') => {
    if (!shoppingList) return;

    let quantityToAdd = 1;
    if (type === 'low-stock' && invItem.lowStockThreshold) {
      quantityToAdd = Math.max(1, invItem.lowStockThreshold - invItem.quantity);
    }

    const newShoppingListItem: ShoppingListItem = {
      id: generateId(),
      ingredientName: invItem.ingredientName,
      neededQuantity: quantityToAdd,
      unit: invItem.unit,
      recipeSources: [], // No recipe source for suggested items
      purchased: false,
      storeId: invItem.defaultStoreId,
    };

    const updatedItems = [...shoppingList.items, newShoppingListItem];
    updateShoppingList({ ...shoppingList, items: updatedItems });
    setAlertMessage(`${invItem.ingredientName} added to the shopping list.`);
    setTimeout(() => setAlertMessage(null), 3000);
  };


  const toggleItemPurchased = (itemId: string, currentlyPurchased: boolean) => {
    let itemAddedToInventory = false;
    const updatedItems = shoppingList.items.map(item => {
      if (item.id === itemId) {
        const newPurchasedState = !currentlyPurchased;
        if (newPurchasedState) { 
          addInvItemSystem({ 
            ingredientName: item.ingredientName, 
            quantity: item.neededQuantity, 
            unit: item.unit,
            // For items purchased from SL, we don't know exp date/freq/store unless it was pre-filled
            // This info is best updated in inventory directly.
            // defaultStoreId: item.storeId 
          }, true); 
          itemAddedToInventory = true;
        }
        return { ...item, purchased: newPurchasedState };
      }
      return item;
    });
    updateShoppingList({ ...shoppingList, items: updatedItems });
    if(itemAddedToInventory) {
        const changedItem = shoppingList.items.find(i => i.id === itemId);
        setAlertMessage(`${changedItem?.ingredientName} marked as purchased and added to inventory.`);
        setTimeout(() => setAlertMessage(null), 3000);
    }
  };
  
  const handleStoreChange = (itemId: string, storeId: string) => {
    const updatedItems = shoppingList.items.map(item =>
      item.id === itemId ? { ...item, storeId: storeId === "NONE" ? undefined : storeId } : item
    );
    updateShoppingList({ ...shoppingList, items: updatedItems });
  };

  const addAllPurchasedToInventory = () => {
    let itemsAddedCount = 0;
    const updatedItems = shoppingList.items.map(item => {
      if (!item.purchased) {
         addInvItemSystem({
            ingredientName: item.ingredientName,
            quantity: item.neededQuantity,
            unit: item.unit
         }, true);
         itemsAddedCount++;
         return {...item, purchased: true};
      }
      return item;
    });
    updateShoppingList({ ...shoppingList, items: updatedItems });
    setAlertMessage(`${itemsAddedCount} item(s) marked as purchased and added to inventory.`);
    setTimeout(() => setAlertMessage(null), 5000);
  };
  
  const itemsByStore: Record<string, ShoppingListItem[]> = shoppingList.items.reduce((acc, item) => {
    const storeKey = item.storeId || 'unassigned';
    if (!acc[storeKey]) acc[storeKey] = [];
    acc[storeKey].push(item);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>);

  const storeOptions = [{value: "NONE", label: "No Specific Store"}, ...stores.map(s => ({ value: s.id, label: s.name }))];

  const renderSuggestedItem = (item: InventoryItem, type: 'low-stock' | 'expiring') => (
    <li key={`suggest-${item.id}`} className="p-3 bg-gray-50 rounded-md shadow-sm flex justify-between items-center">
      <div>
        <span className="font-medium text-gray-700">{item.ingredientName}</span>
        <span className="text-sm text-gray-500 ml-2">({item.quantity.toFixed(1)} {item.unit} in stock)</span>
        {type === 'expiring' && item.expirationDate && <span className="text-xs text-yellow-600 ml-2">Expires: {new Date(item.expirationDate).toLocaleDateString()}</span>}
        {type === 'low-stock' && item.lowStockThreshold && <span className="text-xs text-red-600 ml-2">Low! (Threshold: {item.lowStockThreshold})</span>}
      </div>
      <Button size="sm" variant="secondary" onClick={() => handleAddSuggestedItem(item, type)} leftIcon={<PlusIcon className="w-4 h-4"/>}>
        Add to List
      </Button>
    </li>
  );

  return (
    <div className="container mx-auto p-4">
      <Button onClick={() => setActiveView('shopping_lists')} variant="ghost" leftIcon={<ArrowLeftIcon />} className="mb-6">Back to Shopping Lists</Button>
      {alertMessage && <Alert type="success" message={alertMessage} onClose={() => setAlertMessage(null)} />}
      <h2 className="text-3xl font-bold text-gray-800 mb-2">{shoppingList.name}</h2>
      <p className="text-sm text-gray-500 mb-6">Created: {new Date(shoppingList.createdAt).toLocaleDateString()}</p>
      
      
      {Object.entries(itemsByStore).map(([storeId, items]) => {
        const store = getStoreById(storeId);
        const storeName = store ? store.name : "Unassigned Items";
        return (
          <div key={storeId} className="mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">{storeName}</h3>
            <ul className="space-y-3">
            {items.map(item => (
              <li key={item.id} className={`p-4 rounded-lg shadow flex items-center justify-between ${item.purchased ? 'bg-green-50 opacity-70' : 'bg-white'}`}>
                <div className="flex items-center flex-grow">
                  <CheckboxField
                    id={`item-${item.id}`}
                    checked={item.purchased}
                    onChange={() => toggleItemPurchased(item.id, item.purchased)}
                    label={
                      <div>
                        <span className={`font-medium ${item.purchased ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                          {item.ingredientName}
                        </span>
                        <span className={`ml-2 text-sm ${item.purchased ? 'text-gray-400' : 'text-gray-600'}`}>
                          ({item.neededQuantity} {item.unit})
                        </span>
                        {item.recipeSources.length > 0 && (
                          <p className="text-xs text-gray-500">
                            For: {item.recipeSources.map(rs => `${rs.recipeName} (${rs.quantity.toFixed(1)}${item.unit})`).join(', ')}
                          </p>
                        )}
                      </div>
                    }
                    containerClassName="w-full"
                  />
                </div>
                <div className="w-48 ml-4 flex-shrink-0">
                    <SelectField 
                        label=""
                        options={storeOptions}
                        value={item.storeId || "NONE"}
                        onChange={(e) => handleStoreChange(item.id, e.target.value)}
                        className="text-xs p-1.5"
                        aria-label={`Store for ${item.ingredientName}`}
                    />
                </div>
              </li>
            ))}
          </ul>
          </div>
        );
      })}
      
      {shoppingList.items.length === 0 && (
        <EmptyState
            icon={<ShoppingCartIcon/>}
            title="This Shopping List is Empty"
            message="No items in this list. You can generate items from recipes or add them manually."
        />
      )}

      {shoppingList.items.some(item => !item.purchased) && (
        <div className="mt-8 text-right">
          <Button onClick={addAllPurchasedToInventory} variant="primary" size="lg">
            Mark All Unpurchased & Add to Inventory
          </Button>
        </div>
      )}

      {/* Suggested Add-Ons Section */}
      {(suggestedLowStockItems.length > 0 || suggestedExpiringItems.length > 0) && (
        <div className="mt-12 p-6 bg-gray-50 rounded-lg shadow">
          <h3 className="text-2xl font-semibold text-gray-700 mb-6 flex items-center">
            <SparklesIcon className="w-6 h-6 mr-2 text-blue-500" /> Suggested Add-Ons
          </h3>
          
          {suggestedLowStockItems.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-red-600 mb-3">Low on Stock</h4>
              <ul className="space-y-2">
                {suggestedLowStockItems.map(item => renderSuggestedItem(item, 'low-stock'))}
              </ul>
            </div>
          )}

          {suggestedExpiringItems.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-yellow-600 mb-3">Expiring Soon</h4>
              <ul className="space-y-2">
                {suggestedExpiringItems.map(item => renderSuggestedItem(item, 'expiring'))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// Stores Page & Form
const StoresPage: React.FC = () => { 
  const { stores, addStore, updateStore, deleteStore } = useStores();
  const { searchTerm } = useAppState();
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | undefined>(undefined);

  const handleSave = (storeData: Omit<Store, 'id'> | Store) => {
    if ('id' in storeData) {
      updateStore(storeData);
    } else {
      addStore(storeData);
    }
    setShowModal(false);
    setEditingStore(undefined);
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    setShowModal(true);
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (store.location && store.location.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="container mx-auto p-4">
      {filteredStores.length === 0 && searchTerm === '' ? (
        <EmptyState 
          icon={<BuildingStorefrontIcon />}
          title="No Stores Added Yet"
          message="Add your favorite stores to assign items when creating shopping lists."
          actionButton={<Button onClick={() => {setEditingStore(undefined); setShowModal(true);}} leftIcon={<PlusIcon/>}>Add New Store</Button>}
        />
      ) : filteredStores.length === 0 && searchTerm !== '' ? (
         <EmptyState 
          icon={<MagnifyingGlassIcon />}
          title="No Stores Found"
          message={`Your search for "${searchTerm}" did not match any stores.`}
        />
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStores.map(store => (
            <Card key={store.id}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{store.name}</h3>
                  {store.location && <p className="text-sm text-gray-500">{store.location}</p>}
                  {store.website && <a href={store.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline block truncate">{store.website}</a>}
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(store)}><PencilIcon/></Button>
                  <Button variant="danger" size="sm" onClick={() => deleteStore(store.id)}><TrashIcon/></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <AddItemButton onClick={() => { setEditingStore(undefined); setShowModal(true); }} text="Add Store" />
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingStore(undefined); }} title={editingStore ? "Edit Store" : "Add New Store"}>
        <StoreForm initialStore={editingStore} onSave={handleSave} onClose={() => { setShowModal(false); setEditingStore(undefined); }} />
      </Modal>
    </div>
  );
};

interface StoreFormProps {
  initialStore?: Store;
  onSave: (storeData: Omit<Store, 'id'> | Store) => void;
  onClose: () => void;
}
const StoreForm: React.FC<StoreFormProps> = ({ initialStore, onSave, onClose }) => { 
  const [name, setName] = useState(initialStore?.name || '');
  const [location, setLocation] = useState(initialStore?.location || '');
  const [website, setWebsite] = useState(initialStore?.website || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const storeData = { name, location, website };
    if (initialStore) {
      onSave({ ...initialStore, ...storeData });
    } else {
      onSave(storeData);
    }
    onClose(); 
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField label="Store Name" id="storeName" value={name} onChange={e => setName(e.target.value)} required />
      <InputField label="Location (Optional)" id="storeLocation" value={location} onChange={e => setLocation(e.target.value)} />
      <InputField label="Website (Optional)" id="storeWebsite" type="url" value={website} onChange={e => setWebsite(e.target.value)} />
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary">Save Store</Button>
      </div>
    </form>
  );
};

// --- DASHBOARD PAGE ---
const DashboardPage: React.FC = () => {
  const { inventory } = useInventory();
  const { currentUser } = useAuth();

  const expiringSoonItems = inventory.filter(item => isItemExpiringSoon(item.expirationDate, 7) && !isItemExpired(item.expirationDate)).sort((a,b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime());
  const expiredItems = inventory.filter(item => isItemExpired(item.expirationDate));
  const lowStockItems = inventory.filter(item => item.lowStockThreshold && item.quantity < item.lowStockThreshold && !isItemExpired(item.expirationDate));
  const toConsiderRestocking = inventory.filter(item => item.frequencyOfUse && item.frequencyOfUse !== FrequencyOfUse.OTHER && !lowStockItems.find(lsi => lsi.id === item.id) && !expiringSoonItems.find(esi => esi.id === item.id) && !expiredItems.find(exi => exi.id === item.id)).sort((a,b) => a.ingredientName.localeCompare(b.ingredientName));

  const renderInventoryItem = (item: InventoryItem, context: 'expiring' | 'low' | 'expired' | 'restock') => (
    <li key={`${context}-${item.id}`} className="p-3 bg-white rounded-md shadow-sm flex justify-between items-center">
        <div>
            <span className="font-medium text-gray-800">{item.ingredientName}</span>
            <span className="text-sm text-gray-600 ml-2">({item.quantity.toFixed(1)} {item.unit})</span>
            {context === 'expiring' && item.expirationDate && <span className="text-xs text-yellow-600 ml-2">Expires: {new Date(item.expirationDate).toLocaleDateString()}</span>}
            {context === 'expired' && item.expirationDate && <span className="text-xs text-red-700 ml-2">Expired: {new Date(item.expirationDate).toLocaleDateString()}</span>}
            {context === 'low' && item.lowStockThreshold && <span className="text-xs text-red-600 ml-2">Low Stock! (Threshold: {item.lowStockThreshold})</span>}
            {context === 'restock' && item.frequencyOfUse && <span className="text-xs text-blue-600 ml-2">Use: {item.frequencyOfUse}</span>}
        </div>
    </li>
  );

  return (
    <div className="container mx-auto p-4 space-y-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome to your Dashboard, {currentUser?.name}!</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <h2 className="text-xl font-semibold text-red-700 mb-3 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-red-700"/> Expired Items ({expiredItems.length})</h2>
                {expiredItems.length > 0 ? <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">{expiredItems.map(item => renderInventoryItem(item, 'expired'))}</ul> : <p className="text-sm text-gray-500">No items currently expired. Great job!</p>}
            </Card>

            <Card>
                <h2 className="text-xl font-semibold text-yellow-600 mb-3 flex items-center"><CalendarIcon className="w-5 h-5 mr-2 text-yellow-600"/> Expiring Soon ({expiringSoonItems.length})</h2>
                {expiringSoonItems.length > 0 ? <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">{expiringSoonItems.map(item => renderInventoryItem(item, 'expiring'))}</ul> : <p className="text-sm text-gray-500">No items expiring in the next 7 days.</p>}
            </Card>

            <Card>
                <h2 className="text-xl font-semibold text-red-600 mb-3 flex items-center"><ArchiveBoxIcon className="w-5 h-5 mr-2 text-red-600"/>Low Stock Items ({lowStockItems.length})</h2>
                {lowStockItems.length > 0 ? <ul className="space-y-2 max-h-60 overflow-y-auto pr-1">{lowStockItems.map(item => renderInventoryItem(item, 'low'))}</ul> : <p className="text-sm text-gray-500">No items are currently low on stock based on thresholds.</p>}
            </Card>
        </div>
         <Card>
            <h2 className="text-xl font-semibold text-blue-600 mb-3 flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-600"/>Consider Re-stocking ({toConsiderRestocking.length})</h2>
            {toConsiderRestocking.length > 0 ? <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">{toConsiderRestocking.map(item => renderInventoryItem(item, 'restock'))}</ul> : <p className="text-sm text-gray-500">No specific items flagged for re-stocking based on frequency. Check your inventory!</p>}
        </Card>
    </div>
  );
};

// --- NEW AUTH PAGES ---
const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { setActiveView } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(email, password);
    if (success) {
      navigate(from, { replace: true });
    } else {
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Login to {APP_NAME}</h2>
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <InputField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" variant="primary" className="w-full" size="lg">Login</Button>
        </form>
        <p className="text-sm text-center mt-6">
          Don't have an account?{' '}
          <Link to="/signup" onClick={() => setActiveView('signup')} className="font-medium text-blue-600 hover:underline">Sign up</Link>
        </p>
      </Card>
    </div>
  );
};

const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const { setActiveView } = useAppState();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    const success = await signup(name, email, password);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Signup failed. Email may already be in use or an unexpected error occurred.');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Create your {APP_NAME} Account</h2>
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        <p className="text-xs text-red-500 mb-3 text-center">Warning: For demonstration, passwords are not securely hashed. Do not use real passwords.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField label="Full Name" id="name" value={name} onChange={e => setName(e.target.value)} required />
          <InputField label="Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <InputField label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          <InputField label="Confirm Password" id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          <Button type="submit" variant="primary" className="w-full" size="lg">Sign Up</Button>
        </form>
        <p className="text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" onClick={() => setActiveView('login')} className="font-medium text-blue-600 hover:underline">Login</Link>
        </p>
      </Card>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { currentUser, updateUserProfile, updateUserPreferences } = useAuth();
  const { stores } = useStores();
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.preferences.avatarUrl || '');
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>(currentUser?.preferences.measurementSystem || MeasurementSystem.METRIC);
  const [defaultStoreId, setDefaultStoreId] = useState(currentUser?.preferences.defaultStoreId || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!currentUser) return <Navigate to="/login" />;

  const storeOptions = [{value: '', label: 'Select Default Store'}, ...stores.map(s => ({ value: s.id, label: s.name }))];

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const success = await updateUserProfile(currentUser.id, { name, email });
    if (success) {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } else {
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    }
  };
  
  const handlePreferencesUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const success = await updateUserPreferences(currentUser.id, { avatarUrl, measurementSystem, defaultStoreId });
     if (success) {
      setMessage({ type: 'success', text: 'Preferences updated successfully!' });
    } else {
      setMessage({ type: 'error', text: 'Failed to update preferences.' });
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    // WARNING: Plaintext password comparison. DO NOT USE IN PRODUCTION.
    if (currentUser.passwordHash !== currentPassword) {
      setMessage({ type: 'error', text: 'Current password incorrect.' });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
       setMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    // WARNING: Storing plaintext password. DO NOT USE IN PRODUCTION.
    const success = await updateUserProfile(currentUser.id, { passwordHash: newPassword });
    if (success) {
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } else {
      setMessage({ type: 'error', text: 'Failed to change password.' });
    }
  };


  return (
    <div className="container mx-auto p-4 space-y-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-800">Your Profile</h1>
      {message && <Alert type={message.type} message={message.text} onClose={() => setMessage(null)} />}
      
      <Card>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Personal Information</h2>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <InputField label="Full Name" id="profileName" value={name} onChange={e => setName(e.target.value)} required />
          <InputField label="Email" id="profileEmail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Button type="submit" variant="primary">Save Personal Info</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Preferences</h2>
         <form onSubmit={handlePreferencesUpdate} className="space-y-4">
            <InputField label="Avatar URL" id="avatarUrl" type="url" placeholder="https://example.com/avatar.jpg" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} />
            <SelectField label="Measurement System" id="measurementSystem" options={MEASUREMENT_SYSTEM_OPTIONS} value={measurementSystem} onChange={e => setMeasurementSystem(e.target.value as MeasurementSystem)} />
            <SelectField label="Default Store" id="defaultStore" options={storeOptions} value={defaultStoreId} onChange={e => setDefaultStoreId(e.target.value)} />
            <Button type="submit" variant="primary">Save Preferences</Button>
        </form>
      </Card>
      
      <Card>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Change Password</h2>
        <p className="text-xs text-red-500 mb-3">Warning: For demonstration, passwords are not securely hashed.</p>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <InputField label="Current Password" id="currentPassword" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
          <InputField label="New Password" id="newPassword" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          <InputField label="Confirm New Password" id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} required />
          <Button type="submit" variant="primary">Change Password</Button>
        </form>
      </Card>
    </div>
  );
};


// --- Protected Route HOC ---
const ProtectedRoute: React.FC<{children: ReactNode}> = ({ children }) => {
  const { currentUser, isLoadingAuth } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-screen"><p>Loading authentication...</p></div>; // Or a spinner
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
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
      <AuthProvider>
        <AppStateProvider>
          <RecipesProvider>
            <InventoryProvider>
              <StoresProvider>
                <ShoppingListsProvider>
                    <AppLayout />
                </ShoppingListsProvider>
              </StoresProvider>
            </InventoryProvider>
          </RecipesProvider>
        </AppStateProvider>
      </AuthProvider>
    </HashRouter>
  );
}

export default App;
