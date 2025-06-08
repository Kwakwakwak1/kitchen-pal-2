import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { authService, storesService, shoppingListsService } from '../services';
import {
  UserProfile,
  StoreAPI,
  ShoppingListAPI,
  ShoppingListItemAPI,
  CreateStoreRequest,
  UpdateStoreRequest,
  CreateShoppingListRequest,
  UpdateShoppingListRequest,
  CreateShoppingListItemRequest,
  UpdateShoppingListItemRequest,
  BulkUpdateItemsRequest,
  StoreSearchParams,
  ShoppingListSearchParams,
  ShoppingListItemSearchParams,
} from '../types/api';

// Query Keys
export const queryKeys = {
  auth: {
    user: ['auth', 'user'] as const,
    profile: ['auth', 'profile'] as const,
    preferences: ['auth', 'preferences'] as const,
  },
  stores: {
    all: ['stores'] as const,
    list: (params?: StoreSearchParams) => ['stores', 'list', params] as const,
    detail: (id: string) => ['stores', 'detail', id] as const,
  },
  shoppingLists: {
    all: ['shoppingLists'] as const,
    list: (params?: ShoppingListSearchParams) => ['shoppingLists', 'list', params] as const,
    detail: (id: string) => ['shoppingLists', 'detail', id] as const,
    items: (listId: string, params?: ShoppingListItemSearchParams) => 
      ['shoppingLists', 'items', listId, params] as const,
  },
} as const;

// Auth Hooks
export const useCurrentUser = (options?: UseQueryOptions<UserProfile>) => {
  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: authService.getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

export const useUserProfile = (options?: UseQueryOptions<UserProfile>) => {
  return useQuery({
    queryKey: queryKeys.auth.profile,
    queryFn: authService.getUserProfile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
};

// Store Hooks
export const useStores = (params?: StoreSearchParams, options?: UseQueryOptions<StoreAPI[]>) => {
  return useQuery({
    queryKey: queryKeys.stores.list(params),
    queryFn: async () => {
      const response = await storesService.getStores(params);
      return response.stores;
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

export const useStore = (id: string, options?: UseQueryOptions<StoreAPI>) => {
  return useQuery({
    queryKey: queryKeys.stores.detail(id),
    queryFn: () => storesService.getStoreById(id),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

export const useCreateStore = (options?: UseMutationOptions<StoreAPI, Error, CreateStoreRequest>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: storesService.createStore,
    onSuccess: (newStore) => {
      // Invalidate stores list
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all });
      
      // Add to cache
      queryClient.setQueryData(queryKeys.stores.detail(newStore.id), newStore);
    },
    ...options,
  });
};

export const useUpdateStore = (options?: UseMutationOptions<StoreAPI, Error, { id: string; data: UpdateStoreRequest }>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => storesService.updateStore(id, data),
    onSuccess: (updatedStore) => {
      // Update cache
      queryClient.setQueryData(queryKeys.stores.detail(updatedStore.id), updatedStore);
      
      // Invalidate stores list
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all });
    },
    ...options,
  });
};

export const useDeleteStore = (options?: UseMutationOptions<void, Error, string>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: storesService.deleteStore,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.stores.detail(deletedId) });
      
      // Invalidate stores list
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all });
    },
    ...options,
  });
};

// Shopping List Hooks
export const useShoppingLists = (params?: ShoppingListSearchParams, options?: UseQueryOptions<ShoppingListAPI[]>) => {
  return useQuery({
    queryKey: queryKeys.shoppingLists.list(params),
    queryFn: async () => {
      const response = await shoppingListsService.getShoppingLists(params);
      return response.shopping_lists;
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

export const useShoppingList = (id: string, options?: UseQueryOptions<ShoppingListAPI>) => {
  return useQuery({
    queryKey: queryKeys.shoppingLists.detail(id),
    queryFn: () => shoppingListsService.getShoppingListById(id),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
};

export const useShoppingListItems = (
  listId: string, 
  params?: ShoppingListItemSearchParams, 
  options?: UseQueryOptions<ShoppingListItemAPI[]>
) => {
  return useQuery({
    queryKey: queryKeys.shoppingLists.items(listId, params),
    queryFn: async () => {
      const response = await shoppingListsService.getShoppingListItems(listId, params);
      return response.items;
    },
    enabled: !!listId,
    staleTime: 15 * 1000, // 15 seconds (shorter for interactive shopping)
    ...options,
  });
};

export const useCreateShoppingList = (options?: UseMutationOptions<ShoppingListAPI, Error, CreateShoppingListRequest>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: shoppingListsService.createShoppingList,
    onSuccess: (newList) => {
      // Invalidate shopping lists
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.all });
      
      // Add to cache
      queryClient.setQueryData(queryKeys.shoppingLists.detail(newList.id), newList);
    },
    ...options,
  });
};

export const useUpdateShoppingList = (options?: UseMutationOptions<ShoppingListAPI, Error, { id: string; data: UpdateShoppingListRequest }>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => shoppingListsService.updateShoppingList(id, data),
    onSuccess: (updatedList) => {
      // Update cache
      queryClient.setQueryData(queryKeys.shoppingLists.detail(updatedList.id), updatedList);
      
      // Invalidate shopping lists
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.all });
    },
    ...options,
  });
};

export const useDeleteShoppingList = (options?: UseMutationOptions<void, Error, string>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: shoppingListsService.deleteShoppingList,
    onSuccess: (_, deletedId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.shoppingLists.detail(deletedId) });
      queryClient.removeQueries({ queryKey: queryKeys.shoppingLists.items(deletedId) });
      
      // Invalidate shopping lists
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.all });
    },
    ...options,
  });
};

export const useAddShoppingListItem = (options?: UseMutationOptions<ShoppingListItemAPI, Error, { listId: string; data: CreateShoppingListItemRequest }>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ listId, data }) => shoppingListsService.addShoppingListItem(listId, data),
    onSuccess: (_, { listId }) => {
      // Invalidate items for this list
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.items(listId) });
      
      // Invalidate shopping lists (to update item counts)
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.all });
    },
    ...options,
  });
};

export const useUpdateShoppingListItem = (options?: UseMutationOptions<ShoppingListItemAPI, Error, { itemId: string; data: UpdateShoppingListItemRequest; listId?: string }>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ itemId, data }) => shoppingListsService.updateShoppingListItem(itemId, data),
    onSuccess: (_, { listId }) => {
      if (listId) {
        // Invalidate items for this list
        queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.items(listId) });
      }
    },
    ...options,
  });
};

export const useBulkUpdateItems = (options?: UseMutationOptions<ShoppingListItemAPI[], Error, { listId: string; data: BulkUpdateItemsRequest }>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ listId, data }) => shoppingListsService.bulkUpdateItems(listId, data),
    onSuccess: (_, { listId }) => {
      // Invalidate items for this list
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.items(listId) });
    },
    ...options,
  });
};

export const useClearCheckedItems = (options?: UseMutationOptions<number, Error, string>) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: shoppingListsService.clearCheckedItems,
    onSuccess: (_, listId) => {
      // Invalidate items for this list
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingLists.items(listId) });
    },
    ...options,
  });
};