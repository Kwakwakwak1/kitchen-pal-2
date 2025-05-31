import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, UserPreferences } from '../../types';
import { generateId, LOCAL_STORAGE_USERS_KEY, ACTIVE_USER_ID_KEY } from '../../constants';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Load users and current user from localStorage on mount
  useEffect(() => {
    const loadUsersFromStorage = () => {
      try {
        const storedUsers = localStorage.getItem(LOCAL_STORAGE_USERS_KEY);
        const activeUserId = localStorage.getItem(ACTIVE_USER_ID_KEY);

        if (storedUsers) {
          const parsedUsers: User[] = JSON.parse(storedUsers);
          setUsers(parsedUsers);

          if (activeUserId) {
            const activeUser = parsedUsers.find(user => user.id === activeUserId);
            if (activeUser) {
              setCurrentUser(activeUser);
            }
          }
        }
      } catch (error) {
        console.error('Error loading users from localStorage:', error);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    loadUsersFromStorage();
  }, []);

  // Save users to localStorage whenever users array changes
  useEffect(() => {
    if (!isLoadingAuth) {
      localStorage.setItem(LOCAL_STORAGE_USERS_KEY, JSON.stringify(users));
    }
  }, [users, isLoadingAuth]);

  // Save active user ID whenever current user changes
  useEffect(() => {
    if (!isLoadingAuth) {
      if (currentUser) {
        localStorage.setItem(ACTIVE_USER_ID_KEY, currentUser.id);
      } else {
        localStorage.removeItem(ACTIVE_USER_ID_KEY);
      }
    }
  }, [currentUser, isLoadingAuth]);

  const login = async (email: string, passwordAttempt: string): Promise<boolean> => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user && user.passwordHash === passwordAttempt) {
      setCurrentUser(user);
      return true;
    }
    
    return false;
  };

  const signup = async (name: string, email: string, passwordPlain: string): Promise<boolean> => {
    // Check if email already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return false;
    }

    const newUser: User = {
      id: generateId(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: passwordPlain, // In a real app, this would be hashed
      preferences: {
        defaultStoreId: undefined,
        measurementSystem: undefined,
        avatarUrl: undefined,
        autoArchiveCompletedLists: true,
        autoArchiveAfterDays: 30,
        deleteArchivedAfterDays: 365,
      }
    };

    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return true;
  };

  const logout = (): void => {
    setCurrentUser(null);
  };

  const updateUserProfile = async (
    userId: string, 
    data: Partial<Pick<User, 'name' | 'email' | 'passwordHash'>>
  ): Promise<boolean> => {
    try {
      setUsers(prev => prev.map(user => {
        if (user.id === userId) {
          const updatedUser = { ...user, ...data };
          // Update current user if it's the one being modified
          if (currentUser?.id === userId) {
            setCurrentUser(updatedUser);
          }
          return updatedUser;
        }
        return user;
      }));
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  };

  const updateUserPreferences = async (
    userId: string, 
    preferences: Partial<UserPreferences>
  ): Promise<boolean> => {
    try {
      setUsers(prev => prev.map(user => {
        if (user.id === userId) {
          const updatedUser = {
            ...user,
            preferences: { ...user.preferences, ...preferences }
          };
          // Update current user if it's the one being modified
          if (currentUser?.id === userId) {
            setCurrentUser(updatedUser);
          }
          return updatedUser;
        }
        return user;
      }));
      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }
  };

  const contextValue: AuthContextType = {
    currentUser,
    users,
    login,
    signup,
    logout,
    updateUserProfile,
    updateUserPreferences,
    isLoadingAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 