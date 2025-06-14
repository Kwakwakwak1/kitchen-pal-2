import { apiService } from './apiService';
import { User } from '../../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_verified: boolean;
    created_at: string;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_verified: boolean;
    created_at: string;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
}

export interface UserProfileResponse {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_verified: boolean;
    created_at: string;
    updated_at: string;
    user_preferences: {
      theme?: string;
      language?: string;
      notifications_enabled?: boolean;
      dietary_restrictions?: string[];
    }[];
  };
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface UpdatePreferencesRequest {
  theme?: string;
  language?: string;
  notifications_enabled?: boolean;
  dietary_restrictions?: string[];
}

class AuthApiService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiService.post<LoginResponse>('/auth/login', credentials);
      
      // Store tokens in the API service
      if (response.tokens) {
        apiService.setTokens(response.tokens.access_token, response.tokens.refresh_token);
      }
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<RegisterResponse> {
    try {
      const response = await apiService.post<RegisterResponse>('/auth/register', userData);
      
      // Store tokens in the API service
      if (response.tokens) {
        apiService.setTokens(response.tokens.access_token, response.tokens.refresh_token);
      }
      
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Always clear local tokens
      apiService.clearTokens();
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<UserProfileResponse> {
    try {
      return await apiService.get<UserProfileResponse>('/auth/me');
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UpdateProfileRequest): Promise<UserProfileResponse> {
    try {
      return await apiService.put<UserProfileResponse>('/users/profile', updates);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: UpdatePreferencesRequest): Promise<{ message: string }> {
    try {
      return await apiService.put<{ message: string }>('/users/preferences', preferences);
    } catch (error) {
      console.error('Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return apiService.isAuthenticated();
  }

  /**
   * Get current tokens
   */
  getTokens() {
    return apiService.getTokens();
  }

  /**
   * Convert API user to internal User type
   */
  transformApiUserToUser(apiUser: UserProfileResponse['user']): User {
    const preferences = apiUser.user_preferences?.[0] || {};
    
    return {
      id: apiUser.id,
      name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
      email: apiUser.email,
      passwordHash: '', // Not needed for API-based auth
      preferences: {
        defaultStoreId: undefined, // This will be set separately if needed
        measurementSystem: undefined, // This will be set separately if needed
        avatarUrl: undefined, // This will be set separately if needed
        autoArchiveCompletedLists: true, // Default values
        autoArchiveAfterDays: 30,
        deleteArchivedAfterDays: 365,
        // Add API preferences
        theme: preferences.theme as 'light' | 'dark' | undefined,
        language: preferences.language,
        notificationsEnabled: preferences.notifications_enabled,
        dietaryRestrictions: preferences.dietary_restrictions,
      }
    };
  }
}

export const authApiService = new AuthApiService();
export default authApiService;