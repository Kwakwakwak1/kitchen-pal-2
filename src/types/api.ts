// API Response Types for Kitchen Pal Backend Integration

export interface ApiResponse {
  success?: boolean;
  message?: string;
  [key: string]: any; // For specific response fields like 'user', 'store', etc.
}

export interface ApiError {
  error: {
    message: string;
    statusCode: number;
    details?: {
      validation?: Array<{
        field: string;
        message: string;
        received?: any;
      }>;
    };
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth API Types
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

export interface AuthResponse {
  message: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
    updated_at: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// User API Types
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface UserPreferencesAPI {
  theme?: 'light' | 'dark';
  language?: string;
  notifications_enabled?: boolean;
  dietary_restrictions?: string[];
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// Store API Types
export interface StoreAPI {
  id: string;
  name: string;
  location?: string;
  website?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStoreRequest {
  name: string;
  location?: string;
  website?: string;
}

export interface UpdateStoreRequest {
  name?: string;
  location?: string;
  website?: string;
}

export interface StoresResponse extends PaginationResponse {
  stores: StoreAPI[];
  count: number;
}

// Shopping List API Types
export interface ShoppingListAPI {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  items_count?: number;
}

export interface ShoppingListItemAPI {
  id: string;
  ingredient_name: string;
  quantity?: number;
  unit?: string;
  is_purchased: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateShoppingListRequest {
  name: string;
  is_active?: boolean;
}

export interface UpdateShoppingListRequest {
  name?: string;
  is_active?: boolean;
}

export interface CreateShoppingListItemRequest {
  ingredient_name: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface UpdateShoppingListItemRequest {
  ingredient_name?: string;
  quantity?: number;
  unit?: string;
  is_purchased?: boolean;
  notes?: string;
}

export interface BulkUpdateItemsRequest {
  items: Array<{
    id: string;
    is_purchased: boolean;
  }>;
}

export interface ShoppingListsResponse extends PaginationResponse {
  shopping_lists: ShoppingListAPI[];
}

export interface ShoppingListItemsResponse {
  items: ShoppingListItemAPI[];
  count: number;
}

// Common Search/Filter Types
export interface SearchParams {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ShoppingListSearchParams extends SearchParams, PaginationParams {
  is_active?: boolean;
}

export interface StoreSearchParams extends SearchParams {
  // Store-specific search params can be added here
}

export interface ShoppingListItemSearchParams extends SearchParams {
  purchased?: boolean;
}

// Token Management Types
export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}