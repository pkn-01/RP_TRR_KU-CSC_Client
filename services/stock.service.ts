import { apiFetch } from "./api";

export interface StockItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  category: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export const stockService = {
  async getStockItems(): Promise<StockItem[]> {
    return apiFetch("/api/stock");
  },

  async getStockItem(id: number): Promise<StockItem> {
    return apiFetch(`/api/stock/${id}`);
  },

  async createStockItem(data: Partial<StockItem>): Promise<StockItem> {
    return apiFetch("/api/stock", "POST", data);
  },

  async updateStockItem(id: number, data: Partial<StockItem>): Promise<StockItem> {
    return apiFetch(`/api/stock/${id}`, "PUT", data);
  },

  async deleteStockItem(id: number): Promise<void> {
    return apiFetch(`/api/stock/${id}`, "DELETE");
  },
};
