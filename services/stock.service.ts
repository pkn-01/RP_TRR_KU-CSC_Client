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

  async withdrawStockItem(id: number, data: { quantity: number; reference?: string; note?: string; userId?: number }): Promise<any> {
    return apiFetch(`/api/stock/${id}/withdraw`, "POST", data);
  },

  async getTransactions(stockItemId?: number): Promise<any[]> {
    const query = stockItemId ? `?stockItemId=${stockItemId}` : "";
    return apiFetch(`/api/stock/transactions${query}`);
  },

  async deleteStockItem(id: number): Promise<void> {
    return apiFetch(`/api/stock/${id}`, "DELETE");
  },
};
