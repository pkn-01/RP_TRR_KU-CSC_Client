import { apiFetch } from "./api";

export interface StockItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  category: string;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number };
}

export interface StockTransaction {
  id: number;
  stockItemId: number;
  type: "IN" | "OUT";
  quantity: number;
  previousQty: number;
  newQty: number;
  reference?: string;
  note?: string;
  userId?: number;
  createdAt: string;
  stockItem?: StockItem;
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

  async withdrawStockItem(id: number, data: { quantity: number; reference?: string; note?: string; userId?: number }): Promise<StockTransaction> {
    return apiFetch(`/api/stock/${id}/withdraw`, "POST", data);
  },

  async addStockItem(id: number, data: { quantity: number; reference?: string; note?: string; userId?: number }): Promise<StockTransaction> {
    return apiFetch(`/api/stock/${id}/add-stock`, "POST", data);
  },

  async getTransactions(stockItemId?: number): Promise<StockTransaction[]> {
    const query = stockItemId ? `?stockItemId=${stockItemId}` : "";
    return apiFetch(`/api/stock/transactions${query}`);
  },

  async deleteStockItem(id: number): Promise<void> {
    return apiFetch(`/api/stock/${id}`, "DELETE");
  },

  async deleteCategory(name: string): Promise<any> {
    return apiFetch(`/api/stock/categories/${encodeURIComponent(name)}`, "DELETE");
  },

  async bulkImportStockItems(items: Partial<StockItem>[]): Promise<{ created: number; updated: number; total: number }> {
    return apiFetch("/api/stock/bulk-import", "POST", { items });
  },
};
