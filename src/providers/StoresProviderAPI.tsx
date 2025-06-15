import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, StoresContextType } from '../../types';
import { storesService } from '../services';
import { StoreAPI } from '../types/api';
import { useToast } from './ToastProvider';
import { useAuthAPI } from './AuthProviderAPI';

const StoresContext = createContext<StoresContextType | undefined>(undefined);

interface StoresProviderProps {
  children: ReactNode;
}

// Transform function
const transformStoreFromAPI = (apiStore: StoreAPI): Store => ({
  id: apiStore.id,
  name: apiStore.name,
  location: apiStore.location,
  website: apiStore.website,
});

export const StoresProviderAPI: React.FC<StoresProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { currentUser, isLoadingAuth } = useAuthAPI();

  // Compute a stable authentication state
  const isAuthenticated = !!currentUser && !isLoadingAuth;

  // Queries - only run when user is authenticated
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      console.log('Fetching stores...');
      const response = await storesService.getStores();
      console.log('Stores API response:', response);
      return response.stores.map(transformStoreFromAPI);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if ((error as any)?.status === 401) return false;
      return failureCount < 3;
    },
    enabled: isAuthenticated, // Use the computed stable state
  });

  // Log authentication state changes for debugging
  React.useEffect(() => {
    console.log('Stores Provider - Auth state:', { 
      currentUser: !!currentUser, 
      isLoadingAuth, 
      isAuthenticated 
    });
  }, [currentUser, isLoadingAuth, isAuthenticated]);

  // Mutations
  const addStoreMutation = useMutation({
    mutationFn: (store: Omit<Store, 'id'>) => {
      console.log('Creating store:', store);
      return storesService.createStore(store);
    },
    onSuccess: (newStore) => {
      console.log('Store created successfully:', newStore);
      queryClient.setQueryData(['stores'], (oldStores: Store[] = []) => [
        ...oldStores,
        transformStoreFromAPI(newStore)
      ]);
      showToast('success', `Store "${newStore.name}" created successfully!`);
    },
    onError: (err, newStore) => {
      console.error('Failed to create store:', newStore.name, err);
      const errorMessage = (err as any)?.message || 'Unknown error occurred';
      showToast('error', `Failed to create store "${newStore.name}": ${errorMessage}`);
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: (store: Store) => storesService.updateStore(store.id, {
      name: store.name,
      location: store.location,
      website: store.website,
    }),
    onMutate: async (newStore) => {
      await queryClient.cancelQueries({ queryKey: ['stores'] });
      const previousStores = queryClient.getQueryData(['stores']);
      
      queryClient.setQueryData(['stores'], (old: Store[] = []) =>
        old.map(s => s.id === newStore.id ? newStore : s)
      );
      
      return { previousStores };
    },
    onError: (err, newStore, context) => {
      if (context?.previousStores) {
        queryClient.setQueryData(['stores'], context.previousStores);
      }
      console.error('Failed to update store:', newStore.name, err);
      showToast('error', `Failed to update store "${newStore.name}". Please try again.`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
    onSuccess: (updatedStore, originalStore) => {
      queryClient.setQueryData(['stores'], (oldStores: Store[] = []) =>
        oldStores.map(s => s.id === originalStore.id ? transformStoreFromAPI(updatedStore) : s)
      );
      showToast('success', `Store "${updatedStore.name}" updated successfully!`);
    },
  });

  const deleteStoreMutation = useMutation({
    mutationFn: (storeId: string) => storesService.deleteStore(storeId),
    onSuccess: (_, deletedStoreId) => {
      queryClient.setQueryData(['stores'], (oldStores: Store[] = []) =>
        oldStores.filter(s => s.id !== deletedStoreId)
      );
    },
  });

  // Context methods
  const addStore = (store: Omit<Store, 'id'>): void => {
    addStoreMutation.mutate(store);
  };

  const updateStore = (store: Store): void => {
    updateStoreMutation.mutate(store);
  };

  const deleteStore = (storeId: string): void => {
    deleteStoreMutation.mutate(storeId);
  };

  const getStoreById = (storeId: string): Store | undefined => {
    return stores.find(s => s.id === storeId);
  };

  const contextValue: StoresContextType = {
    stores,
    addStore,
    updateStore,
    deleteStore,
    getStoreById,
  };

  return (
    <StoresContext.Provider value={contextValue}>
      {children}
    </StoresContext.Provider>
  );
};

export const useStores = (): StoresContextType => {
  const context = useContext(StoresContext);
  if (context === undefined) {
    throw new Error('useStores must be used within a StoresProviderAPI');
  }
  return context;
};