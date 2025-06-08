import apiService from './apiService';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenResponse,
  UserProfile,
  UpdateProfileRequest,
  UserPreferencesAPI,
  ChangePasswordRequest,
} from '../types/api';

class AuthService {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    console.log('AuthService register called with:', data);
    const response = await apiService.post<any>('/auth/register', data);
    console.log('Raw API response:', response);
    
    // Handle the actual API response format which has tokens nested
    const tokens = response.tokens || {};
    console.log('Extracted tokens:', tokens);
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    
    // Store tokens after successful registration
    if (accessToken && refreshToken) {
      apiService.setTokens(accessToken, refreshToken);
      console.log('Tokens stored successfully');
    } else {
      console.warn('Missing tokens in response:', { accessToken, refreshToken });
    }
    
    // Transform to expected format for compatibility
    const result = {
      message: response.message,
      user: response.user,
      accessToken,
      refreshToken,
    };
    console.log('Transformed result:', result);
    return result;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiService.post<any>('/auth/login', data);
    
    // Handle the actual API response format which has tokens nested
    const tokens = response.tokens || {};
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;
    
    // Store tokens after successful login
    if (accessToken && refreshToken) {
      apiService.setTokens(accessToken, refreshToken);
    }
    
    // Transform to expected format for compatibility
    return {
      message: response.message,
      user: response.user,
      accessToken,
      refreshToken,
    };
  }

  async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate tokens on server
      await apiService.post('/auth/logout');
    } catch (error) {
      // Even if server logout fails, clear local tokens
      console.warn('Server logout failed:', error);
    } finally {
      // Always clear local tokens
      apiService.clearTokens();
    }
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const tokens = apiService.getTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiService.post<any>('/auth/refresh', {
      refreshToken: tokens.refreshToken,
    });

    // Handle the actual API response format
    const newTokens = response.tokens || {};
    const accessToken = newTokens.access_token;
    const refreshToken = newTokens.refresh_token;

    // Update stored tokens
    if (accessToken && refreshToken) {
      apiService.setTokens(accessToken, refreshToken);
    }

    return {
      accessToken,
      refreshToken,
    };
  }

  async getCurrentUser(): Promise<UserProfile> {
    return apiService.get<{ user: UserProfile }>('/auth/me').then(response => response.user);
  }

  async getUserProfile(): Promise<UserProfile> {
    return apiService.get<{ user: UserProfile }>('/users/profile').then(response => response.user);
  }

  async updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    return apiService.put<{ user: UserProfile }>('/users/profile', data).then(response => response.user);
  }

  async getUserPreferences(): Promise<UserPreferencesAPI> {
    return apiService.get<{ preferences: UserPreferencesAPI }>('/users/preferences').then(response => response.preferences);
  }

  async updatePreferences(preferences: Partial<UserPreferencesAPI>): Promise<UserPreferencesAPI> {
    return apiService.put<{ preferences: UserPreferencesAPI }>('/users/preferences', preferences).then(response => response.preferences);
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiService.put('/users/change-password', data);
  }

  async deleteAccount(password: string): Promise<void> {
    await apiService.delete('/users/account', {
      data: { password }
    });
    
    // Clear tokens after account deletion
    apiService.clearTokens();
  }

  isAuthenticated(): boolean {
    return apiService.isAuthenticated();
  }

  getStoredUser(): UserProfile | null {
    // This would be used if we want to store user data locally
    // For now, we'll always fetch from server
    return null;
  }
}

export const authService = new AuthService();
export default authService;