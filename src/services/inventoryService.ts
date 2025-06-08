import apiService from './apiService';

// API interfaces that match backend
interface InventoryItemAPI {
  id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold?: number;
  expiration_date?: string;
  location?: string;
  brand?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CreateInventoryItemRequest {
  ingredient_name: string;
  quantity: number;
  unit: string;
  low_stock_threshold?: number;
  expiration_date?: string;
  location?: string;
  brand?: string;
  notes?: string;
}

interface UpdateInventoryItemRequest extends Partial<CreateInventoryItemRequest> {}

interface InventoryResponse {
  inventory: InventoryItemAPI[];
  count: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface InventorySearchParams {
  search?: string;
  location?: string;
  sortBy?: 'name' | 'quantity' | 'expiration_date' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

class InventoryService {
  async getInventory(params?: InventorySearchParams): Promise<InventoryResponse> {
    const url = apiService.buildURL('/inventory', params);
    return apiService.get<InventoryResponse>(url);
  }

  async getInventoryItemById(id: string): Promise<InventoryItemAPI> {
    return apiService.get<{ item: InventoryItemAPI }>(`/inventory/${id}`).then(response => response.item);
  }

  async createInventoryItem(data: CreateInventoryItemRequest): Promise<InventoryItemAPI> {
    return apiService.post<{ item: InventoryItemAPI }>('/inventory', data).then(response => response.item);
  }

  async updateInventoryItem(id: string, data: UpdateInventoryItemRequest): Promise<InventoryItemAPI> {
    return apiService.put<{ item: InventoryItemAPI }>(`/inventory/${id}`, data).then(response => response.item);
  }

  async deleteInventoryItem(id: string): Promise<void> {
    await apiService.delete(`/inventory/${id}`);
  }

  async getLowStockItems(): Promise<InventoryItemAPI[]> {
    return apiService.get<{ items: InventoryItemAPI[] }>('/inventory/low-stock').then(response => response.items);
  }

  async searchInventory(query: string, options?: {
    location?: string;
    sortBy?: 'name' | 'quantity' | 'expiration_date' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<InventoryItemAPI[]> {
    const params = {
      search: query,
      ...options,
    };
    
    const response = await this.getInventory(params);
    return response.inventory;
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;