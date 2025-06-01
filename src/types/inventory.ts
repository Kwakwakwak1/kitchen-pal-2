// src/types/inventory.ts
export enum Unit {
  // Common units, add more as needed
  PIECE = "piece",
  GRAM = "g",
  KILOGRAM = "kg",
  OUNCE = "oz",
  POUND = "lb",
  MILLILITER = "ml",
  LITER = "l",
  TEASPOON = "tsp",
  TABLESPOON = "tbsp",
  CUP = "cup",
  CAN = "can",
  BOTTLE = "bottle",
  BOX = "box",
  BAG = "bag",
}

export enum FrequencyOfUse {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  OCCASIONALLY = "occasionally",
  RARELY = "rarely",
}

export interface ItemCategory {
  id: string;
  name: string;
  description?: string;
  color: string; // Hex color for visual distinction
  icon: string;  // Emoji or icon identifier
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_CATEGORIES: Omit<ItemCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Produce', description: 'Fresh fruits and vegetables', color: '#10B981', icon: '🥬', sortOrder: 1, isDefault: true },
  { name: 'Meat & Seafood', description: 'Fresh and frozen proteins', color: '#EF4444', icon: '🥩', sortOrder: 2, isDefault: true },
  { name: 'Dairy & Eggs', description: 'Milk, cheese, yogurt, eggs', color: '#F59E0B', icon: '🥛', sortOrder: 3, isDefault: true },
  { name: 'Pantry Staples', description: 'Dry goods, oils, condiments', color: '#8B5CF6', icon: '🏺', sortOrder: 4, isDefault: true },
  { name: 'Canned Goods', description: 'Canned vegetables, soups, sauces', color: '#6B7280', icon: '🥫', sortOrder: 5, isDefault: true },
  { name: 'Frozen Items', description: 'Frozen foods and ingredients', color: '#06B6D4', icon: '❄️', sortOrder: 6, isDefault: true },
  { name: 'Beverages', description: 'Drinks and liquid ingredients', color: '#3B82F6', icon: '🥤', sortOrder: 7, isDefault: true },
  { name: 'Spices & Herbs', description: 'Seasonings and fresh herbs', color: '#84CC16', icon: '🌿', sortOrder: 8, isDefault: true },
  { name: 'Baking Supplies', description: 'Flour, sugar, baking ingredients', color: '#F97316', icon: '🧁', sortOrder: 9, isDefault: true },
  { name: 'Snacks', description: 'Chips, crackers, treats', color: '#EC4899', icon: '🍿', sortOrder: 10, isDefault: true },
  { name: 'Uncategorized', description: 'Items without specific category', color: '#9CA3AF', icon: '📦', sortOrder: 999, isDefault: true }
];

export interface EnhancedInventoryItem {
  id: string;
  ingredientName: string;
  quantity: number;
  unit: Unit; // Assuming Unit enum is defined
  lowStockThreshold?: number;
  expirationDate?: string;
  frequencyOfUse?: FrequencyOfUse; // Assuming FrequencyOfUse enum is defined
  defaultStoreId?: string;

  // NEW FIELDS
  categoryId: string;              // Required categorization
  customTags?: string[];           // Additional user-defined tags
  brand?: string;                  // Product brand
  notes?: string;                  // User notes about the item
  lastUpdated: string;             // Timestamp of last modification
  addedDate: string;               // When item was first added

  // ARCHIVE SYSTEM
  isArchived: boolean;             // Whether item is archived (zero quantity)
  archivedDate?: string;           // When item was archived
  originalQuantity?: number;       // Last known quantity before archiving
  timesRestocked: number;          // How many times item has been restocked

  // USAGE TRACKING
  totalConsumed: number;           // Total amount consumed over time
  averageConsumptionRate?: number; // Calculated consumption per day/week
  lastUsedDate?: string;           // When item was last used in recipe
}

export interface ItemTemplate {
  id: string;
  ingredientName: string;
  unit: Unit; // Assuming Unit enum is defined
  categoryId: string;
  defaultStoreId?: string;
  brand?: string;
  notes?: string;
  averageQuantity: number;         // Typical purchase quantity
  typicalLowStockThreshold?: number;
  frequencyOfUse?: FrequencyOfUse; // Assuming FrequencyOfUse enum is defined

  // METADATA
  timesUsed: number;               // How many times template was used
  lastUsedDate: string;
  createdFrom: 'manual' | 'archive'; // How template was created
  sourceItemId?: string;           // If created from archived item
}
