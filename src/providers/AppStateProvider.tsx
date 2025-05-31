import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ActiveView, AppStateContextType } from '../../types';

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider: React.FC<AppStateProviderProps> = ({ children }) => {
  const [activeView, setActiveViewState] = useState<ActiveView>('dashboard');
  const [viewParams, setViewParams] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');

  const setActiveView = (view: ActiveView, params?: Record<string, string>): void => {
    setActiveViewState(view);
    setViewParams(params || {});
    // Clear search when changing views
    setSearchTerm('');
  };

  const contextValue: AppStateContextType = {
    activeView,
    setActiveView,
    viewParams,
    searchTerm,
    setSearchTerm,
  };

  return (
    <AppStateContext.Provider value={contextValue}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}; 