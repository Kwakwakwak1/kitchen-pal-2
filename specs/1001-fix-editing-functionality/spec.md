# Spec: 1001-FIX-EDITING – Fix Recipe, Inventory, and Store Editing Functionality

---

## 0. AI Prompt Flow

This spec addresses critical editing functionality issues affecting user experience across the application's core features.

---

## 1. Overview
*A brief description of what this ticket will achieve.*

* **Background / Why**
    Users are currently unable to edit recipes, inventory items, or stores in the Kitchen Pal application. This is a critical functionality issue that prevents users from maintaining and updating their data, severely impacting the app's usability and user experience.

* **Goal**
    Restore full editing functionality for recipes, inventory items, and stores by identifying and fixing the root cause of the editing failures. Users should be able to successfully edit and save changes to existing items across all three data types.

---

## 2. Context & Inputs
*So the AI knows what code & data is in scope.*

1.  **Attached Files**
    * `src/pages/recipes/RecipeForm.tsx` - Form component for recipe editing (to modify)
    * `src/pages/inventory/InventoryItemForm.tsx` - Form component for inventory editing (to modify)
    * `src/pages/stores/StoreForm.tsx` - Form component for store editing (to modify)
    * `src/providers/RecipesProviderAPI.tsx` - Recipe data provider with mutations (to modify)
    * `src/providers/InventoryProviderAPI.tsx` - Inventory data provider with mutations (to modify)
    * `src/providers/StoresProviderAPI.tsx` - Store data provider with mutations (to modify)

2.  **Existing Imports & Logic**
    * React Query for data mutations and caching
    * Modal components for edit dialogs
    * Form validation and submission logic
    * API service layer for backend communication

3.  **Variables / Data Models**
    * `Recipe` type with id, name, ingredients, instructions, etc.
    * `InventoryItem` type with id, ingredientName, quantity, unit, etc.
    * `Store` type with id, name, location, website

---

## 3. Requirements
*A detailed, prioritized list of fixes / features.*

| Priority | Type     | Description                                                  |
|:--------:|:---------|:-------------------------------------------------------------|
| High     | Bug      | Add error handling to mutation functions in all providers   |
| High     | Bug      | Add loading states and user feedback for edit operations    |
| High     | Bug      | Fix form validation to prevent silent failures              |
| High     | Bug      | Add optimistic updates with rollback on failure             |
| Medium   | Feature  | Add toast notifications for successful/failed operations    |
| Medium   | Dev      | Add error logging for debugging failed mutations            |
| Low      | UX       | Improve loading indicators during edit operations           |

---

## 4. Implementation Plan
*For each file that needs touching, exactly what to do. Include guidance for unit tests.*

### 4.1 `src/providers/RecipesProviderAPI.tsx`
* **Context**: Already has mutation setup with React Query
* **Changes**:
    1. Add error handling to `updateRecipeMutation`:
        ```diff
        const updateRecipeMutation = useMutation({
          mutationFn: (recipe: Recipe) => recipesService.updateRecipe(recipe),
        + onMutate: async (newRecipe) => {
        +   // Cancel outgoing refetches
        +   await queryClient.cancelQueries({ queryKey: ['recipes'] });
        +   
        +   // Snapshot previous value
        +   const previousRecipes = queryClient.getQueryData(['recipes']);
        +   
        +   // Optimistically update
        +   queryClient.setQueryData(['recipes'], (old: Recipe[] = []) =>
        +     old.map(r => r.id === newRecipe.id ? newRecipe : r)
        +   );
        +   
        +   return { previousRecipes };
        + },
        + onError: (err, newRecipe, context) => {
        +   // Roll back to previous value
        +   if (context?.previousRecipes) {
        +     queryClient.setQueryData(['recipes'], context.previousRecipes);
        +   }
        +   console.error('Failed to update recipe:', err);
        + },
        + onSettled: () => {
        +   queryClient.invalidateQueries({ queryKey: ['recipes'] });
        + },
          onSuccess: (updatedRecipe) => {
            queryClient.setQueryData(['recipes'], (oldRecipes: Recipe[] = []) =>
              oldRecipes.map(r => r.id === updatedRecipe.id ? updatedRecipe : r)
            );
          },
        });
        ```

### 4.2 `src/providers/InventoryProviderAPI.tsx`
* **Context**: Already has mutation setup but may lack proper error handling
* **Changes**:
    1. Add comprehensive error handling to `updateInventoryItemMutation`:
        ```diff
        const updateInventoryItemMutation = useMutation({
          mutationFn: async (item: InventoryItem) => {
            const updatedItem = await inventoryService.updateInventoryItem(item.id, {
              ingredient_name: normalizeIngredientName(item.ingredientName),
              quantity: item.quantity,
              unit: item.unit,
              low_stock_threshold: item.lowStockThreshold,
              expiry_date: item.expirationDate,
            });
            return transformInventoryItemFromAPI(updatedItem);
          },
        + onMutate: async (newItem) => {
        +   await queryClient.cancelQueries({ queryKey: ['inventory'] });
        +   const previousInventory = queryClient.getQueryData(['inventory']);
        +   
        +   queryClient.setQueryData(['inventory'], (old: InventoryItem[] = []) =>
        +     old.map(item => item.id === newItem.id ? newItem : item)
        +   );
        +   
        +   return { previousInventory };
        + },
        + onError: (err, newItem, context) => {
        +   if (context?.previousInventory) {
        +     queryClient.setQueryData(['inventory'], context.previousInventory);
        +   }
        +   console.error('Failed to update inventory item:', err);
        + },
        + onSettled: () => {
        +   queryClient.invalidateQueries({ queryKey: ['inventory'] });
        + },
          onSuccess: (updatedItem) => {
            queryClient.setQueryData(['inventory'], (oldInventory: InventoryItem[] = []) =>
              oldInventory.map(invItem => invItem.id === updatedItem.id ? updatedItem : invItem)
            );
          },
        });
        ```

### 4.3 `src/providers/StoresProviderAPI.tsx`
* **Context**: Already has mutation setup but may lack proper error handling
* **Changes**:
    1. Add error handling to `updateStoreMutation`:
        ```diff
        const updateStoreMutation = useMutation({
          mutationFn: (store: Store) => storesService.updateStore(store.id, {
            name: store.name,
            location: store.location,
            website: store.website,
          }),
        + onMutate: async (newStore) => {
        +   await queryClient.cancelQueries({ queryKey: ['stores'] });
        +   const previousStores = queryClient.getQueryData(['stores']);
        +   
        +   queryClient.setQueryData(['stores'], (old: Store[] = []) =>
        +     old.map(s => s.id === newStore.id ? newStore : s)
        +   );
        +   
        +   return { previousStores };
        + },
        + onError: (err, newStore, context) => {
        +   if (context?.previousStores) {
        +     queryClient.setQueryData(['stores'], context.previousStores);
        +   }
        +   console.error('Failed to update store:', err);
        + },
        + onSettled: () => {
        +   queryClient.invalidateQueries({ queryKey: ['stores'] });
        + },
          onSuccess: (updatedStore, originalStore) => {
            queryClient.setQueryData(['stores'], (oldStores: Store[] = []) =>
              oldStores.map(s => s.id === originalStore.id ? transformStoreFromAPI(updatedStore) : s)
            );
          },
        });
        ```

### 4.4 Add Mutation Status Context
* **Create new file**: `src/providers/MutationStatusProvider.tsx`
* **Purpose**: Provide global mutation status and error handling
* **Content**:
    ```typescript
    import React, { createContext, useContext, useState, ReactNode } from 'react';

    interface MutationStatus {
      isLoading: boolean;
      error: string | null;
      success: string | null;
    }

    interface MutationStatusContextType {
      status: MutationStatus;
      setLoading: (loading: boolean) => void;
      setError: (error: string | null) => void;
      setSuccess: (success: string | null) => void;
      clearStatus: () => void;
    }

    const MutationStatusContext = createContext<MutationStatusContextType | undefined>(undefined);

    export const MutationStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
      const [status, setStatus] = useState<MutationStatus>({
        isLoading: false,
        error: null,
        success: null,
      });

      const setLoading = (loading: boolean) => setStatus(prev => ({ ...prev, isLoading: loading }));
      const setError = (error: string | null) => setStatus(prev => ({ ...prev, error, isLoading: false }));  
      const setSuccess = (success: string | null) => setStatus(prev => ({ ...prev, success, isLoading: false }));
      const clearStatus = () => setStatus({ isLoading: false, error: null, success: null });

      return (
        <MutationStatusContext.Provider value={{ status, setLoading, setError, setSuccess, clearStatus }}>
          {children}
        </MutationStatusContext.Provider>
      );
    };

    export const useMutationStatus = () => {
      const context = useContext(MutationStatusContext);
      if (!context) throw new Error('useMutationStatus must be used within MutationStatusProvider');
      return context;
    };
    ```

---

## 5. Checklist

*Point-and-click completion checklist; see `checklist.md` for auto-updates.*

* [ ] Error handling added to RecipesProviderAPI updateRecipeMutation
* [ ] Error handling added to InventoryProviderAPI updateInventoryItemMutation  
* [ ] Error handling added to StoresProviderAPI updateStoreMutation
* [ ] Optimistic updates implemented with rollback functionality
* [ ] MutationStatusProvider created and integrated
* [ ] Toast notifications added for user feedback
* [ ] Error logging implemented for debugging
* [ ] Manual testing completed for all three edit functions
* [ ] Edge cases tested (network failures, validation errors) 