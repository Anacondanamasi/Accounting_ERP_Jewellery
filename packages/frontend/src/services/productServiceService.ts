import { api } from "@/lib/axios";

export interface ProductService {
  id: number;
  companyId: number;
  code: string;
  name: string;
  description?: string;
  type: "PRODUCT" | "SERVICE";
  isTracked: boolean;
  isSold: boolean;
  salesDescription?: string;
  salesPrice: number;
  salesAccountId?: number;
  salesTaxRate: number;
  isPurchased: boolean;
  purchaseDescription?: string;
  purchasePrice: number;
  purchaseAccountId?: number;
  purchaseTaxRate: number;
  inventoryAssetAccountId?: number;
  openingQuantity: number;
  openingValue: number;
  quantityOnHand: number;
  averageCost: number;
  reorderLevel: number;
  unit?: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: number;
  date: string;
  movementType: string;
  referenceType?: string;
  referenceNo?: string;
  quantityIn: number;
  quantityOut: number;
  balanceQty: number;
  unitCost: number;
  totalValue: number;
  narration?: string;
}

export interface ListProductsParams {
  search?: string;
  type?: string;
  status?: string;
  tracked?: boolean;
  page?: number;
  limit?: number;
}

export const productServiceService = {
  async list(params: ListProductsParams = {}) {
    const response = await api.get("/product-services", { params });
    return response.data.data as {
      rows: ProductService[];
      pagination: { page: number; limit: number; total: number; pages: number };
    };
  },

  async getById(id: number) {
    const response = await api.get(`/product-services/${id}`);
    return response.data.data as ProductService & { stockMovements: StockMovement[] };
  },

  async create(payload: Partial<ProductService>) {
    const response = await api.post("/product-services", payload);
    return response.data.data as ProductService;
  },

  async update(id: number, payload: Partial<ProductService>) {
    const response = await api.put(`/product-services/${id}`, payload);
    return response.data.data as ProductService;
  },

  async archive(id: number) {
    const response = await api.post(`/product-services/${id}/archive`);
    return response.data.data as ProductService;
  },

  async bulkArchive(ids: number[]) {
    const response = await api.post("/product-services/bulk-archive", { ids });
    return response.data.data as { updated: number };
  },

  async getMovements(id: number) {
    const response = await api.get(`/product-services/${id}/movements`);
    return response.data.data as StockMovement[];
  },

  getExportUrl() {
    return `${api.defaults.baseURL}/product-services/export`;
  },
};
