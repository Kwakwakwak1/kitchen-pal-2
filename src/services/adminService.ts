import apiService from './apiService';

interface AdminStats {
  stats: {
    users: number;
    recipes: number;
    inventoryItems: number;
    shoppingLists: number;
    stores: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    createdAt: string;
  }>;
  systemHealth: {
    database: string;
    uptime: number;
    memory: any;
    timestamp: string;
  };
}

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    recipes: number;
    inventoryItems: number;
    shoppingLists: number;
    stores: number;
  };
}

interface AdminUsersResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface AdminUserDetails {
  user: AdminUser & {
    recipes: Array<{
      id: string;
      name: string;
      createdAt: string;
      _count: { ingredients: number };
    }>;
    inventoryItems: Array<{
      id: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      createdAt: string;
    }>;
    shoppingLists: Array<{
      id: string;
      name: string;
      isActive: boolean;
      createdAt: string;
      _count: { items: number };
    }>;
    stores: Array<{
      id: string;
      name: string;
      location?: string;
      createdAt: string;
    }>;
  };
}

class AdminService {
  async getDashboardStats(): Promise<AdminStats> {
    return apiService.get<AdminStats>('/admin/dashboard');
  }

  async getAllUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<AdminUsersResponse> {
    const url = apiService.buildURL('/admin/users', params);
    return apiService.get<AdminUsersResponse>(url);
  }

  async getUserDetails(userId: string): Promise<AdminUserDetails> {
    return apiService.get<AdminUserDetails>(`/admin/users/${userId}`);
  }

  async deleteUser(userId: string): Promise<{ message: string }> {
    return apiService.delete<{ message: string }>(`/admin/users/${userId}`);
  }

  async exportSystemData(options?: {
    format?: 'json' | 'csv';
    includeUserData?: boolean;
  }): Promise<any> {
    const params = {
      format: options?.format || 'json',
      includeUserData: options?.includeUserData ? 'true' : 'false'
    };
    const url = apiService.buildURL('/admin/export', params);
    return apiService.get(url);
  }
}

export const adminService = new AdminService();
export default adminService;