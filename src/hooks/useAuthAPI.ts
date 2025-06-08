import { useState, useCallback, useEffect } from 'react';
import { User, UserPreferences } from '../../types';
import { authService } from '../services';
import { UserProfile, LoginRequest, RegisterRequest } from '../types/api';

// Helper to convert API user profile to app User type
const convertApiUserToAppUser = (apiUser: UserProfile, preferences?: UserPreferences): User => {
  return {
    id: apiUser.id,
    name: `${apiUser.first_name} ${apiUser.last_name}`,
    email: apiUser.email,
    passwordHash: '', // Not exposed from API
    preferences: preferences || {
      defaultStoreId: undefined,
      measurementSystem: undefined,
      avatarUrl: undefined,
      autoArchiveCompletedLists: true,
      autoArchiveAfterDays: 30,
      deleteArchivedAfterDays: 365,
    }
  };
};

export const useAuthAPI = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoadingAuth(true);
      
      try {
        if (authService.isAuthenticated()) {
          // Try to get current user from API
          const apiUser = await authService.getCurrentUser();
          
          // Try to get preferences (optional)
          let preferences: UserPreferences | undefined;
          try {
            const apiPreferences = await authService.getUserPreferences();
            preferences = {
              defaultStoreId: undefined, // API doesn't have this yet
              measurementSystem: undefined, // API doesn't have this yet
              avatarUrl: undefined, // API doesn't have this yet
              autoArchiveCompletedLists: true,
              autoArchiveAfterDays: 30,
              deleteArchivedAfterDays: 365,
              // Could map API preferences here when available
            };
          } catch (prefError) {
            console.warn('Failed to load user preferences:', prefError);
          }
          
          const user = convertApiUserToAppUser(apiUser, preferences);
          setCurrentUser(user);
        }
      } catch (error) {
        console.warn('Failed to verify authentication:', error);
        // Clear any invalid tokens
        authService.logout();
      } finally {
        setIsLoadingAuth(false);
      }
    };

    checkAuthStatus();

    // Listen for token expiration events
    const handleTokenExpired = () => {
      setCurrentUser(null);
      // Could show a toast notification here
      console.warn('Session expired. Please log in again.');
    };

    window.addEventListener('auth:tokenExpired', handleTokenExpired);
    
    return () => {
      window.removeEventListener('auth:tokenExpired', handleTokenExpired);
    };
  }, []);

  const login = useCallback(async (email: string, passwordAttempt: string): Promise<boolean> => {
    try {
      const loginData: LoginRequest = {
        email: email.toLowerCase().trim(),
        password: passwordAttempt,
      };

      const response = await authService.login(loginData);
      
      if (response.user) {
        const user = convertApiUserToAppUser(response.user);
        setCurrentUser(user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, passwordPlain: string): Promise<boolean> => {
    try {
      // Split name into first and last name (simple split)
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const registerData: RegisterRequest = {
        email: email.toLowerCase().trim(),
        password: passwordPlain,
        first_name: firstName,
        last_name: lastName,
      };

      const response = await authService.register(registerData);
      
      if (response.user) {
        const user = convertApiUserToAppUser(response.user);
        setCurrentUser(user);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Signup failed:', error);
      return false;
    }
  }, []);

  const logout = useCallback((): void => {
    authService.logout()
      .catch(error => console.warn('Logout API call failed:', error))
      .finally(() => {
        setCurrentUser(null);
      });
  }, []);

  const updateUserProfile = useCallback(async (
    userId: string, 
    data: Partial<Pick<User, 'name' | 'email' | 'passwordHash'>>
  ): Promise<boolean> => {
    try {
      const updateData: any = {};
      
      if (data.email) {
        updateData.email = data.email;
      }
      
      if (data.name) {
        // Split name into first and last name
        const nameParts = data.name.trim().split(' ');
        updateData.first_name = nameParts[0] || '';
        updateData.last_name = nameParts.slice(1).join(' ') || '';
      }

      // Handle password change separately if needed
      if (data.passwordHash) {
        // This would need current password - not implemented in this version
        console.warn('Password change through updateUserProfile not implemented. Use separate password change method.');
      }

      if (Object.keys(updateData).length > 0) {
        const updatedApiUser = await authService.updateProfile(updateData);
        const updatedUser = convertApiUserToAppUser(updatedApiUser, currentUser?.preferences);
        setCurrentUser(updatedUser);
      }
      
      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      return false;
    }
  }, [currentUser?.preferences]);

  const updateUserPreferences = useCallback(async (
    userId: string, 
    preferences: Partial<UserPreferences>
  ): Promise<boolean> => {
    try {
      // Update local state immediately for better UX
      if (currentUser?.id === userId) {
        setCurrentUser(prev => prev ? {
          ...prev,
          preferences: { ...prev.preferences, ...preferences }
        } : null);
      }

      // TODO: When backend supports preferences, update via API
      // For now, we'll just update locally
      
      return true;
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }
  }, [currentUser?.id]);

  const isAuthenticated = useCallback((): boolean => {
    return authService.isAuthenticated() && currentUser !== null;
  }, [currentUser]);

  return {
    currentUser,
    users: [], // Empty in API mode, but kept for compatibility
    login,
    signup,
    logout,
    updateUserProfile,
    updateUserPreferences,
    isLoadingAuth,
    isAuthenticated,
    // Additional API-specific methods
    refreshToken: authService.refreshToken,
    getCurrentUser: authService.getCurrentUser,
  };
};