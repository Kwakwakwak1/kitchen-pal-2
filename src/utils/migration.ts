import {
  EnhancedInventoryItem,
  ItemCategory,
  Unit,
  FrequencyOfUse,
  DEFAULT_CATEGORIES
} from '../types'; // Assuming types/index.ts exports these
import { generateId } from '../constants';

// Define OldInventoryItem locally for migration purposes
interface OldInventoryItem {
  id: string;
  ingredientName: string;
  quantity: number;
  unit: Unit;
  lowStockThreshold?: number;
  expirationDate?: string;
  frequencyOfUse?: FrequencyOfUse;
  defaultStoreId?: string;
}

// Regex patterns for category auto-assignment
const categoryPatterns: { [key: string]: RegExp } = {
  produce: /\b(apple|banana|orange|grape|strawberry|blueberry|raspberry|avocado|lemon|lime|tomato|potato|onion|garlic|carrot|broccoli|spinach|lettuce|cabbage|cucumber|pepper|zucchini|eggplant|corn|mushroom|celery|asparagus|kale|pea|bean|herb|basil|parsley|cilantro|mint|rosemary|thyme|dill|ginger)\b/i,
  'meat & seafood': /\b(chicken|beef|pork|lamb|turkey|fish|salmon|tuna|shrimp|crab|lobster|sausage|bacon|ham|steak|ground meat|cod|tilapia|halibut|scallop|mussel|clam)\b/i,
  'dairy & eggs': /\b(milk|cheese|yogurt|butter|cream|egg|sour cream|cottage cheese|cream cheese|parmesan|cheddar|mozzarella|feta|brie|gouda|swiss|provolone|ice cream)\b/i,
  'pantry staples': /\b(flour|sugar|salt|pepper|oil|vinegar|pasta|rice|cereal|oatmeal|bread|baking soda|baking powder|yeast|honey|syrup|jam|jelly|peanut butter|nut|seed|lentil|chickpea|quinoa|couscous|broth|stock|bouillon|soy sauce|worcestershire|hot sauce|ketchup|mustard|mayonnaise|relish|pickle|olive|cracker|pretzel|popcorn|chip|coffee|tea|cocoa)\b/i,
  'canned goods': /\b(canned|can of|jar of|beans|tomatoes|soup|sauce|corn|peas|tuna|salmon|fruit|vegetable|broth|stock|chili)\b/i, // More specific for "canned" prefix
  'frozen items': /\b(frozen|ice cream|pizza|vegetable|fruit|meal|dinner|burger|fries|nugget|waffle|dumpling|spring roll)\b/i,
  beverages: /\b(water|juice|soda|tea|coffee|milk|wine|beer|spirit|liquor|coke|pepsi|sprite|fanta|gatorade|powerade|smoothie|kombucha|la croix)\b/i,
  'spices & herbs': /\b(spice|herb|cinnamon|cumin|paprika|oregano|turmeric|curry|chili powder|garlic powder|onion powder|bay leaf|nutmeg|clove|cardamom|coriander|fennel|sage|tarragon|marjoram|allspice|cayenne)\b/i, // More specific for "spice" or "herb"
  'baking supplies': /\b(flour|sugar|baking powder|baking soda|yeast|chocolate chip|vanilla extract|sprinkle|frosting|icing|cocoa powder|cornstarch|shortening|margarine|sweetener|molasses)\b/i,
  snacks: /\b(chip|cracker|cookie|biscuit|candy|chocolate|gum|nut|fruit snack|granola bar|energy bar|popcorn|pretzel|jerky|pudding|jello)\b/i,
};

export const autoAssignCategoryId = (itemName: string, categories: ItemCategory[]): string => {
  const lowerItemName = itemName.toLowerCase();
  for (const categoryName in categoryPatterns) {
    if (categoryPatterns[categoryName].test(lowerItemName)) {
      const foundCategory = categories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
      if (foundCategory) {
        return foundCategory.id;
      }
    }
  }
  // Fallback to 'Uncategorized'
  const uncategorized = categories.find(cat => cat.name.toLowerCase() === 'uncategorized');
  return uncategorized ? uncategorized.id : generateId(); // Should always find Uncategorized if defaults are set
};

export const migrateInventoryData = (userId: string): boolean => {
  const MIGRATION_FLAG_KEY = `migration_enhanced_inventory_v1_completed_${userId}`;
  const OLD_INVENTORY_STORAGE_KEY = `inventory_${userId}`;
  const NEW_INVENTORY_STORAGE_KEY = `enhanced_inventory_${userId}`;
  const CATEGORIES_STORAGE_KEY = `categories_${userId}`;

  // (A) Check Migration Flag
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') {
    console.log("Inventory migration to EnhancedInventoryItem already completed for user:", userId);
    return false;
  }

  console.log("Starting inventory migration for user:", userId);

  // (B) Backup Old Inventory (Conceptual, actual backup to a different key)
  const oldInventoryJsonBackup = localStorage.getItem(OLD_INVENTORY_STORAGE_KEY);
  if (oldInventoryJsonBackup) {
    const backupKey = `inventory_backup_${new Date().toISOString()}_${userId}`;
    localStorage.setItem(backupKey, oldInventoryJsonBackup);
    console.log(`Backed up old inventory to ${backupKey}`);
  }

  // (C) Load Categories
  let loadedCategories: ItemCategory[] = [];
  try {
    const categoriesJson = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (categoriesJson) {
      loadedCategories = JSON.parse(categoriesJson);
    }
    if (loadedCategories.length === 0) {
      // This case implies CategoriesProvider hasn't run or saved defaults yet.
      // For robustness, the migration can initialize default categories if missing.
      console.warn(`Categories not found in localStorage for user ${userId}. Initializing with defaults for migration.`);
      loadedCategories = DEFAULT_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: generateId(), // Generate new IDs for these
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sortOrder: cat.sortOrder || index + 1,
        isDefault: cat.isDefault !== undefined ? cat.isDefault : false,
      }));
      // Save these generated categories so CategoriesProvider can pick them up if it hasn't run yet
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(loadedCategories));
    }
  } catch (error) {
    console.error("Error loading or initializing categories from localStorage:", error);
    // If categories can't be loaded/initialized, we can't reliably assign categoryIds.
    // Depending on requirements, either halt or proceed with all items as 'Uncategorized'.
    // For now, we'll try to ensure 'Uncategorized' at least exists.
    const uncategorizedDefault = DEFAULT_CATEGORIES.find(c => c.name === 'Uncategorized');
    if (uncategorizedDefault) {
        loadedCategories.push({
            ...uncategorizedDefault,
            id: generateId(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
    }
    if (loadedCategories.length === 0) {
        console.error("Critical: Could not load or create default categories. Migration cannot reliably proceed with category assignment.");
        // Optionally, throw an error or return false, as category assignment is a key part.
        // For this implementation, we will attempt to continue, but most items will be 'Uncategorized' by fallback in autoAssign.
    }
  }


  // (D) Load Old Inventory
  const oldInventoryJson = localStorage.getItem(OLD_INVENTORY_STORAGE_KEY);
  if (!oldInventoryJson) {
    console.log("No old inventory data found to migrate for user:", userId);
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true'); // Set flag even if no data, to avoid re-running
    return false;
  }

  let oldInventory: OldInventoryItem[] = [];
  try {
    oldInventory = JSON.parse(oldInventoryJson);
  } catch (error) {
    console.error("Error parsing old inventory data:", error);
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true'); // Set flag to avoid re-running on corrupted data
    return false;
  }

  if (oldInventory.length === 0) {
    console.log("Old inventory data is empty for user:", userId);
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
    return false;
  }

  // (E) Transform Items
  const now = new Date().toISOString();
  const newInventory: EnhancedInventoryItem[] = oldInventory.map(item => {
    // Ensure unit and frequencyOfUse are valid or provide defaults
    const validUnit = Object.values(Unit).includes(item.unit) ? item.unit : Unit.PIECE;
    const validFrequency = item.frequencyOfUse && Object.values(FrequencyOfUse).includes(item.frequencyOfUse)
                           ? item.frequencyOfUse
                           : undefined;

    return {
      ...item, // Spread old item properties (id, ingredientName, quantity, etc.)
      unit: validUnit,
      frequencyOfUse: validFrequency,
      // New fields for EnhancedInventoryItem
      categoryId: autoAssignCategoryId(item.ingredientName, loadedCategories),
      customTags: [],
      brand: undefined, // Old data model did not have brand
      notes: undefined, // Old data model did not have notes
      lastUpdated: now,
      addedDate: now, // Assuming all migrated items are "newly added" in terms of this field
      isArchived: false,
      archivedDate: undefined,
      originalQuantity: undefined,
      timesRestocked: 0,
      totalConsumed: 0,
      averageConsumptionRate: undefined,
      lastUsedDate: undefined,
    };
  });

  // (F) Save New Inventory
  try {
    localStorage.setItem(NEW_INVENTORY_STORAGE_KEY, JSON.stringify(newInventory));
  } catch (error) {
    console.error("Error saving new inventory data:", error);
    // Not setting migration flag here, so it can be retried.
    // Or, consider a more robust error handling/rollback strategy.
    return false;
  }

  // (G) Set Migration Flag
  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  console.log("Inventory migration completed successfully for user:", userId);
  // Optional: Remove old inventory data after successful migration + backup
  // localStorage.removeItem(OLD_INVENTORY_STORAGE_KEY);
  // console.log("Old inventory data removed after successful migration.");

  return true;
};

export const runMigrationIfNeeded = (userId: string | null | undefined): boolean => {
  if (!userId) {
    console.warn("User ID not available, skipping migration check.");
    return false;
  }
  try {
    return migrateInventoryData(userId);
  } catch (error) {
    console.error("An unexpected error occurred during the migration process:", error);
    return false;
  }
};
