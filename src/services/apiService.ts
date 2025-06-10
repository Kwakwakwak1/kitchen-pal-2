import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiError, TokenData } from '../types/api';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;
  private tokenData: TokenData | null = null;

  constructor() {
    // Use environment variable for API URL, fallback to same-origin for production
    this.baseURL = import.meta.env.VITE_API_URL || '';
    
    console.log('API Service initialized with baseURL:', this.baseURL || '(same-origin)');
    console.log('Environment VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('All environment variables:', import.meta.env);
    
    this.client = axios.create({
      baseURL: this.baseURL ? `${this.baseURL}/api` : '/api',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('Axios client baseURL:', this.client.defaults.baseURL);

    this.setupInterceptors();
    this.loadTokenFromStorage();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.tokenData?.accessToken) {
          config.headers.Authorization = `Bearer ${this.tokenData.accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If we get a 401 and haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshed = await this.refreshToken();
            if (refreshed) {
              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${this.tokenData?.accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            this.clearTokens();
            // Emit a custom event that the auth provider can listen to
            window.dispatchEvent(new CustomEvent('auth:tokenExpired'));
          }
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  private formatError(error: any): Error {
    if (error.response?.data) {
      const apiError: ApiError = error.response.data;
      const message = apiError.error?.message || 'An error occurred';
      const formattedError = new Error(message);
      (formattedError as any).statusCode = apiError.error?.statusCode || error.response.status;
      (formattedError as any).details = apiError.error?.details;
      return formattedError;
    }
    
    if (error.request) {
      return new Error('Network error - please check your connection');
    }
    
    return new Error(error.message || 'An unexpected error occurred');
  }

  // Token management methods
  setTokens(accessToken: string, refreshToken: string) {
    // Decode JWT to get expiration time (simple decode, not verification)
    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    const expiresAt = payload.exp * 1000; // Convert to milliseconds

    this.tokenData = {
      accessToken,
      refreshToken,
      expiresAt,
    };

    // Store in localStorage for persistence
    localStorage.setItem('kitchen_pal_tokens', JSON.stringify(this.tokenData));
  }

  getTokens(): TokenData | null {
    return this.tokenData;
  }

  clearTokens() {
    this.tokenData = null;
    localStorage.removeItem('kitchen_pal_tokens');
  }

  private loadTokenFromStorage() {
    try {
      const stored = localStorage.getItem('kitchen_pal_tokens');
      if (stored) {
        const tokenData: TokenData = JSON.parse(stored);
        
        // Check if token is still valid (with 5 minute buffer)
        const now = Date.now();
        const buffer = 5 * 60 * 1000; // 5 minutes
        
        if (tokenData.expiresAt > now + buffer) {
          this.tokenData = tokenData;
          console.log('API Service: Token loaded successfully, expires in', (tokenData.expiresAt - now) / 60000, 'minutes');
        } else {
          console.warn('API Service: Token expired or expiring soon, attempting refresh...');
          // Set the token temporarily to allow refresh call
          this.tokenData = tokenData;
          // Token is expired or about to expire, try to refresh
          this.refreshToken().catch(() => {
            console.warn('API Service: Token refresh failed, clearing tokens');
            this.clearTokens();
          });
        }
      } else {
        console.log('API Service: No tokens found in storage');
      }
    } catch (error) {
      console.warn('Failed to load tokens from storage:', error);
      this.clearTokens();
    }
  }

  private async refreshToken(): Promise<boolean> {
    if (!this.tokenData?.refreshToken) {
      return false;
    }

    try {
      const refreshURL = this.baseURL ? `${this.baseURL}/api/auth/refresh` : '/api/auth/refresh';
      const response = await axios.post(refreshURL, {
        refreshToken: this.tokenData.refreshToken,
      });

      const { accessToken, refreshToken } = response.data;
      this.setTokens(accessToken, refreshToken);
      return true;
    } catch (error) {
      console.warn('Token refresh failed:', error);
      return false;
    }
  }

  isAuthenticated(): boolean {
    if (!this.tokenData) return false;
    
    // Check if token is still valid (with 5 minute buffer)
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes
    
    return this.tokenData.expiresAt > now + buffer;
  }

  // HTTP method wrappers
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    console.log(`API POST ${url}:`, data);
    try {
      const response: AxiosResponse<T> = await this.client.post(url, data, config);
      console.log(`API POST ${url} response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`API POST ${url} error:`, error);
      throw error;
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  // URL builder helper
  buildURL(endpoint: string, params?: Record<string, any>): string {
    // For same-origin requests (production), build URL manually
    if (!this.baseURL) {
      let url = endpoint; // Don't add /api since the client already has it configured
      
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        
        if (searchParams.toString()) {
          url += `?${searchParams.toString()}`;
        }
      }
      
      return url;
    }
    
    // For cross-origin requests (development), use URL constructor
    const url = new URL(endpoint, `${this.baseURL}/api`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;