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