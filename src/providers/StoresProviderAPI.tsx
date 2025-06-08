import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, StoresContextType } from '../../types';
import { storesService } from '../services';
import { StoreAPI } from '../types/api';

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

  // Queries
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const response = await storesService.getStores();
      return response.stores.map(transformStoreFromAPI);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutations
  const addStoreMutation = useMutation({
    mutationFn: (store: Omit<Store, 'id'>) => storesService.createStore(store),
    onSuccess: (newStore) => {
      queryClient.setQueryData(['stores'], (oldStores: Store[] = []) => [
        ...oldStores,
        transformStoreFromAPI(newStore)
      ]);
    },
  });

  const updateStoreMutation = useMutation({
    mutationFn: (store: Store) => storesService.updateStore(store.id, {
      name: store.name,
      location: store.location,
      website: store.website,
    }),
    onSuccess: (updatedStore, originalStore) => {
      queryClient.setQueryData(['stores'], (oldStores: Store[] = []) =>
        oldStores.map(s => s.id === originalStore.id ? transformStoreFromAPI(updatedStore) : s)
      );
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