// Main services export file
export { default as apiService } from './apiService';
export { default as authService } from './authService';
export { default as storesService } from './storesService';
export { default as shoppingListsService } from './shoppingListsService';
export { default as recipesService } from './recipesService';
export { default as inventoryService } from './inventoryService';

// Re-export for convenience
import apiService from './apiService';
import authService from './authService';
import storesService from './storesService';
import shoppingListsService from './shoppingListsService';
import recipesService from './recipesService';
import inventoryService from './inventoryService';

export {
  apiService as api,
  authService as auth,
  storesService as stores,
  shoppingListsService as shoppingLists,
  recipesService as recipes,
  inventoryService as inventory,
};