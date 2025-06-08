import apiService from './apiService';
import {
  ShoppingListAPI,
  ShoppingListItemAPI,
  CreateShoppingListRequest,
  UpdateShoppingListRequest,
  CreateShoppingListItemRequest,
  UpdateShoppingListItemRequest,
  BulkUpdateItemsRequest,
  ShoppingListsResponse,
  ShoppingListItemsResponse,
  ShoppingListSearchParams,
  ShoppingListItemSearchParams,
} from '../types/api';

class ShoppingListsService {
  // Shopping Lists
  async getShoppingLists(params?: ShoppingListSearchParams): Promise<ShoppingListsResponse> {
    const url = apiService.buildURL('/shopping/lists', params);
    return apiService.get<ShoppingListsResponse>(url);
  }

  async getShoppingListById(id: string): Promise<ShoppingListAPI> {
    return apiService.get<{ shopping_list: ShoppingListAPI }>(`/shopping/lists/${id}`)
      .then(response => response.shopping_list);
  }

  async createShoppingList(data: CreateShoppingListRequest): Promise<ShoppingListAPI> {
    return apiService.post<{ shopping_list: ShoppingListAPI }>('/shopping/lists', data)
      .then(response => response.shopping_list);
  }

  async updateShoppingList(id: string, data: UpdateShoppingListRequest): Promise<ShoppingListAPI> {
    return apiService.put<{ shopping_list: ShoppingListAPI }>(`/shopping/lists/${id}`, data)
      .then(response => response.shopping_list);
  }

  async deleteShoppingList(id: string): Promise<void> {
    await apiService.delete(`/shopping/lists/${id}`);
  }

  // Shopping List Items
  async getShoppingListItems(
    listId: string, 
    params?: ShoppingListItemSearchParams
  ): Promise<ShoppingListItemsResponse> {
    const url = apiService.buildURL(`/shopping/lists/${listId}/items`, params);
    return apiService.get<ShoppingListItemsResponse>(url);
  }

  async addShoppingListItem(
    listId: string, 
    data: CreateShoppingListItemRequest
  ): Promise<ShoppingListItemAPI> {
    return apiService.post<{ item: ShoppingListItemAPI }>(`/shopping/lists/${listId}/items`, data)
      .then(response => response.item);
  }

  async updateShoppingListItem(
    itemId: string, 
    data: UpdateShoppingListItemRequest
  ): Promise<ShoppingListItemAPI> {
    return apiService.put<{ item: ShoppingListItemAPI }>(`/shopping/items/${itemId}`, data)
      .then(response => response.item);
  }

  async deleteShoppingListItem(itemId: string): Promise<void> {
    await apiService.delete(`/shopping/items/${itemId}`);
  }

  // Bulk Operations
  async bulkUpdateItems(
    listId: string, 
    data: BulkUpdateItemsRequest
  ): Promise<ShoppingListItemAPI[]> {
    return apiService.post<{ items: ShoppingListItemAPI[] }>(`/shopping/lists/${listId}/items/bulk-update`, data)
      .then(response => response.items);
  }

  async clearCheckedItems(listId: string): Promise<number> {
    return apiService.delete<{ deleted_count: number }>(`/shopping/lists/${listId}/items/clear-checked`)
      .then(response => response.deleted_count);
  }

  // Convenience methods
  async searchShoppingLists(query: string, options?: {
    is_active?: boolean;
    sortBy?: 'name' | 'created_at' | 'updated_at';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<ShoppingListAPI[]> {
    const params = {
      search: query,
      ...options,
    };
    
    const response = await this.getShoppingLists(params);
    return response.shopping_lists;
  }

  async getActiveShoppingLists(): Promise<ShoppingListAPI[]> {
    const response = await this.getShoppingLists({ is_active: true });
    return response.shopping_lists;
  }

  async getInactiveShoppingLists(): Promise<ShoppingListAPI[]> {
    const response = await this.getShoppingLists({ is_active: false });
    return response.shopping_lists;
  }

  async getPurchasedItems(listId: string): Promise<ShoppingListItemAPI[]> {
    const response = await this.getShoppingListItems(listId, { purchased: true });
    return response.items;
  }

  async getUnpurchasedItems(listId: string): Promise<ShoppingListItemAPI[]> {
    const response = await this.getShoppingListItems(listId, { purchased: false });
    return response.items;
  }

  async toggleItemPurchased(itemId: string, isPurchased: boolean): Promise<ShoppingListItemAPI> {
    return this.updateShoppingListItem(itemId, { is_purchased: isPurchased });
  }

  async markListAsCompleted(listId: string): Promise<ShoppingListAPI> {
    return this.updateShoppingList(listId, { is_active: false });
  }

  async markListAsActive(listId: string): Promise<ShoppingListAPI> {
    return this.updateShoppingList(listId, { is_active: true });
  }
}

export const shoppingListsService = new ShoppingListsService();
export default shoppingListsService;