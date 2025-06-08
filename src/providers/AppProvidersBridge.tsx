// Bridge file to export API provider hooks with names expected by existing pages
// This allows existing pages to work with API providers without modification

export { useAuth } from './AuthProviderAPI';
export { useAppState } from './AppStateProvider';

// TODO: Add other provider hooks when they're ready
// export { useRecipes } from './RecipesProviderAPI';
// export { useInventory } from './InventoryProviderAPI';
// export { useStores } from './StoresProviderAPI';
// export { useShoppingLists } from './ShoppingListsProviderAPI';

// Temporary placeholder exports for compatibility
export const useRecipes = () => {
  throw new Error('Recipes API provider not yet implemented');
};

export const useInventory = () => {
  throw new Error('Inventory API provider not yet implemented');
};

export const useStores = () => {
  throw new Error('Stores API provider not yet implemented');
};

export const useShoppingLists = () => {
  throw new Error('Shopping Lists API provider not yet implemented');
}; 