export enum Unit {
  GRAM = 'g',
  KILOGRAM = 'kg',
  MILLILITER = 'ml',
  LITER = 'l',
  TEASPOON = 'tsp',
  TABLESPOON = 'tbsp',
  CUP = 'cup',
  OUNCE = 'oz', // weight
  POUND = 'lb',
  PIECE = 'piece',
  PINCH = 'pinch',
  DASH = 'dash',
  NONE = '', // For items that don't have a unit e.g. 'a pinch of salt' quantity 1 unit none
}

export interface Ingredient {
  id: string;
  name: string;
}

export interface RecipeIngredient {
  ingredientName: string; // Name of the ingredient, not ID, for simplicity in forms. Will be normalized.
  quantity: number;
  unit: Unit;
  isOptional?: boolean; // New: For optional ingredients
}

export interface Recipe {
  id: string;
  name: string;
  sourceName?: string;
  sourceUrl?: string;
  defaultServings: number;
  ingredients: RecipeIngredient[];
  instructions: string; // Kept as a single string for simplicity, can be split by newlines
  prepTime?: string; // e.g., "30 minutes"
  cookTime?: string; // e.g., "1 hour"
  tags?: string[]; // e.g., ["vegetarian", "quick"]
  imageUrl?: string; 
}

export enum FrequencyOfUse {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  OCCASIONAL = 'occasional',
  RARELY = 'rarely',
  OTHER = 'other',
}

export enum ShoppingListStatus {
  ACTIVE = 'active',           // List is in progress
  COMPLETED = 'completed',     // All items purchased, but not archived
  ARCHIVED = 'archived'        // Completed list that has been archived
}

export interface InventoryItem {
  id: string;
  ingredientName: string; // Normalized name
  quantity: number;
  unit: Unit;
  lowStockThreshold?: number;
  expirationDate?: string; // New: YYYY-MM-DD
  frequencyOfUse?: FrequencyOfUse; // New
  defaultStoreId?: string; // New: ID of the default store for this item
}

export interface Store {
  id: string;
  name: string;
  location?: string;
  website?: string;
}

export interface ShoppingListItem {
  id: string;
  ingredientName: string;
  neededQuantity: number;
  unit: Unit;
  recipeSources: Array<{ recipeName: string; quantity: number }>; // From which recipe(s) and how much
  purchased: boolean;
  storeId?: string; // Optional: which store to buy from
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: string; // ISO date string
  items: ShoppingListItem[];
  notes?: string;
  status: ShoppingListStatus;        // NEW: Status tracking
  completedAt?: string;              // NEW: When list was completed (all items purchased)
  archivedAt?: string;               // NEW: When list was archived
}

// --- NEW: Authentication & User Types ---
export enum MeasurementSystem {
  METRIC = 'metric', // grams, ml, etc.
  IMPERIAL = 'imperial', // oz, lbs, cups, tsp, tbsp
}

export interface UserPreferences {
  defaultStoreId?: string;
  measurementSystem?: MeasurementSystem;
  avatarUrl?: string;
  autoArchiveCompletedLists?: boolean;           // NEW: Auto-archive setting
  autoArchiveAfterDays?: number;                 // NEW: Days before auto-archive (default: 30)
  deleteArchivedAfterDays?: number;              // NEW: Days before auto-delete archived (default: 365)
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // In a real app, this would be a hash. For localStorage, it's plaintext.
  preferences: UserPreferences;
}

// Context types
export interface AuthContextType {
  currentUser: User | null;
  users: User[]; // Primarily for admin or debugging locally; not typically exposed like this
  login: (email: string, passwordAttempt: string) => Promise<boolean>;
  signup: (name: string, email: string, passwordPlain: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (userId: string, data: Partial<Pick<User, 'name' | 'email' | 'passwordHash'>>) => Promise<boolean>;
  updateUserPreferences: (userId: string, preferences: Partial<UserPreferences>) => Promise<boolean>;
  isLoadingAuth: boolean;
}

export interface RecipesContextType {
  recipes: Recipe[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'imageUrl'>) => void;
  updateRecipe: (recipe: Recipe) => void;
  deleteRecipe: (recipeId: string) => void;
  getRecipeById: (recipeId: string) => Recipe | undefined;
}

export interface InventoryContextType {
  inventory: InventoryItem[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>, fromPurchase?: boolean) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  deleteInventoryItem: (itemId: string) => void;
  getInventoryItemByName: (name: string) => InventoryItem | undefined;
  deductFromInventory: (ingredientName: string, quantity: number, unit: Unit) => boolean; // Returns true if deduction happened
  validateRecipePreparation: (recipe: Recipe, requestedServings: number) => {
    canPrepare: boolean;
    missingIngredients: Array<{
      name: string;
      needed: number;
      available: number;
      unit: string;
    }>;
    warnings: string[];
  };
  deductIngredientsForPreparation: (recipe: Recipe, preparedServings: number) => {
    success: boolean;
    deductedIngredients: Array<{
      name: string;
      amountDeducted: number;
      unit: string;
      remainingInInventory: number;
    }>;
    errors: string[];
  };
}

export interface StoresContextType {
  stores: Store[];
  addStore: (store: Omit<Store, 'id'>) => void;
  updateStore: (store: Store) => void;
  deleteStore: (storeId: string) => void;
  getStoreById: (storeId: string) => Store | undefined;
}

export interface ShoppingListsContextType {
  shoppingLists: ShoppingList[];
  archivedShoppingLists: ShoppingList[];     // NEW: Separate archived lists
  addShoppingList: (list: Omit<ShoppingList, 'id' | 'createdAt' | 'status'>) => string; // returns new list ID
  updateShoppingList: (list: ShoppingList) => void;
  deleteShoppingList: (listId: string) => void;
  archiveShoppingList: (listId: string) => void;        // NEW: Archive a completed list
  unarchiveShoppingList: (listId: string) => void;      // NEW: Restore from archive
  deleteArchivedShoppingList: (listId: string) => void; // NEW: Permanently delete archived
  getShoppingListById: (listId: string) => ShoppingList | undefined;
  bulkDeleteShoppingLists: (listIds: string[]) => void;           // NEW: Bulk operations
  bulkArchiveShoppingLists: (listIds: string[]) => void;          // NEW: Bulk archive
  bulkDeleteArchivedShoppingLists: (listIds: string[]) => void;   // NEW: Bulk delete archived
}

export type ActiveView = 
  'dashboard' | 'recipes' | 'inventory' | 'shopping_lists' | 'stores' | 
  'recipe_detail' | 'shopping_list_detail' | 'generate_shopping_list' |
  'login' | 'signup' | 'profile'; // Added auth views

export interface AppStateContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView, params?: Record<string, string>) => void;
  viewParams: Record<string, string>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

// --- Recipe URL Import Types ---
export interface ScrapedIngredient {
  text: string; // Original text from recipe
  name?: string; // Parsed ingredient name
  quantity?: number; // Parsed quantity
  unit?: string; // Parsed unit
}

export interface ScrapedNutrition {
  calories?: number;
  servingSize?: string;
  // Additional nutrition info if available
}

export interface ScrapedRecipeData {
  name: string;
  description?: string;
  ingredients: ScrapedIngredient[];
  instructions: string | string[];
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: number;
  author?: string;
  sourceUrl: string;
  sourceName?: string;
  tags?: string[];
  imageUrl?: string;
  nutrition?: ScrapedNutrition;
}

export interface RecipeScrapingResult {
  success: boolean;
  data?: ScrapedRecipeData;
  error?: string;
  warnings?: string[];
}

export interface ParsedIngredient {
  originalText: string;
  quantity: number;
  unit: Unit;
  ingredientName: string;
  isOptional: boolean;
  notes?: string; // Additional preparation notes
}

// --- Recipe Inventory Analysis Types ---
export interface RecipeInventoryAnalysis {
  recipeId: string;
  totalIngredients: number;
  availableIngredients: number;
  missingIngredients: MissingIngredient[];
  completionPercentage: number; // 0-100
  maxPossibleServings: number;
  hasAllIngredients: boolean;
}

export interface MissingIngredient {
  ingredientName: string;
  neededQuantity: number;
  unit: Unit;
  availableQuantity?: number; // If partially available
  availableUnit?: Unit;
}

export interface InventoryMatch {
  ingredient: RecipeIngredient;
  inventoryItem?: InventoryItem;
  availableQuantity: number; // In recipe's unit
  isFullyAvailable: boolean;
  conversionSuccessful: boolean;
}
