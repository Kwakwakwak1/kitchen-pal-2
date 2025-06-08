import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Store, StoresContextType } from '../../types';
import { generateId } from '../../constants';
import { useAuth } from './AuthProvider';

const StoresContext = createContext<StoresContextType | undefined>(undefined);

interface StoresProviderProps {
  children: ReactNode;
}

export const StoresProvider: React.FC<StoresProviderProps> = ({ children }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const { currentUser } = useAuth();

  const getStorageKey = () => `stores_${currentUser?.id || 'anonymous'}`;

  // Load stores from localStorage when user changes
  useEffect(() => {
    if (currentUser) {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setStores(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading stores from localStorage:', error);
          setStores([]);
        }
      } else {
        setStores([]);
      }
    } else {
      setStores([]);
    }
  }, [currentUser]);

  // Save stores to localStorage whenever they change
  useEffect(() => {
    if (currentUser) {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(stores));
    }
  }, [stores, currentUser]);

  const addStore = (store: Omit<Store, 'id'>): void => {
    const newStore: Store = {
      id: generateId(),
      ...store,
    };
    setStores(prev => [...prev, newStore]);
  };

  const updateStore = (store: Store): void => {
    setStores(prev => prev.map(s => s.id === store.id ? store : s));
  };

  const deleteStore = (storeId: string): void => {
    setStores(prev => prev.filter(s => s.id !== storeId));
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
    throw new Error('useStores must be used within a StoresProvider');
  }
  return context;
};