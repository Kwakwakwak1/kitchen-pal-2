import apiService from './apiService';
import {
  StoreAPI,
  CreateStoreRequest,
  UpdateStoreRequest,
  StoresResponse,
  StoreSearchParams,
} from '../types/api';

class StoresService {
  async getStores(params?: StoreSearchParams): Promise<StoresResponse> {
    const url = apiService.buildURL('/stores', params);
    return apiService.get<StoresResponse>(url);
  }

  async getStoreById(id: string): Promise<StoreAPI> {
    return apiService.get<{ store: StoreAPI }>(`/stores/${id}`).then(response => response.store);
  }

  async createStore(data: CreateStoreRequest): Promise<StoreAPI> {
    return apiService.post<{ store: StoreAPI }>('/stores', data).then(response => response.store);
  }

  async updateStore(id: string, data: UpdateStoreRequest): Promise<StoreAPI> {
    return apiService.put<{ store: StoreAPI }>(`/stores/${id}`, data).then(response => response.store);
  }

  async deleteStore(id: string): Promise<void> {
    await apiService.delete(`/stores/${id}`);
  }

  async searchStores(query: string, options?: {
    sortBy?: 'name' | 'location' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }): Promise<StoreAPI[]> {
    const params = {
      search: query,
      ...options,
    };
    
    const response = await this.getStores(params);
    return response.stores;
  }
}

export const storesService = new StoresService();
export default storesService;