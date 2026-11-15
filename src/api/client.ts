import type {
  FruitWithStock,
  PackagingSize,
  PaymentMethod,
  Purchase,
  RevenueSummary,
  Sale,
  StockLevelReportRow,
  StockRow,
  Supplier,
  TopFruitReportRow,
  TopVendorRow,
  Vendor,
  VendorBalanceRow,
} from '../types';

export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(status: number, message: string, details?: string[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error || `Request failed with status ${res.status}`,
      Array.isArray(body?.details) ? body.details : undefined
    );
  }
  return body as T;
}

export const api = {
  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    const res = await request<{ data: Supplier[] }>('/api/suppliers');
    return res.data;
  },
  async getSupplierById(id: number): Promise<Supplier> {
    const res = await request<{ data: Supplier }>(`/api/suppliers/${id}`);
    return res.data;
  },
  async createSupplier(payload: {
    business_name: string;
    contact_person: string;
    phone: string;
    province: string;
    address: string;
  }): Promise<Supplier> {
    const res = await request<{ data: Supplier }>('/api/suppliers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
  async updateSupplier(
    id: number,
    payload: Partial<{
      business_name: string;
      contact_person: string;
      phone: string;
      province: string;
      address: string;
    }>
  ): Promise<Supplier> {
    const res = await request<{ data: Supplier }>(`/api/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
  async deleteSupplier(id: number): Promise<void> {
    await request<{ message: string }>(`/api/suppliers/${id}`, {
      method: 'DELETE',
    });
  },

  // Fruits & Stock
  async getFruits(): Promise<FruitWithStock[]> {
    const res = await request<{ data: FruitWithStock[] }>('/api/fruits');
    return res.data;
  },
  async createFruit(payload: {
    fruit_name: string;
    description: string;
    status: 'ACTIVE' | 'INACTIVE';
    prices: { small: number; medium: number; large: number };
    initial_stock?: { small?: number; medium?: number; large?: number };
  }): Promise<FruitWithStock> {
    const res = await request<{ data: FruitWithStock }>('/api/fruits', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
  async updateFruit(
    id: number,
    payload: {
      fruit_name?: string;
      description?: string;
      status?: 'ACTIVE' | 'INACTIVE';
      prices?: { small?: number; medium?: number; large?: number };
    }
  ): Promise<FruitWithStock> {
    const res = await request<{ data: FruitWithStock }>(`/api/fruits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
  async getStock(): Promise<StockRow[]> {
    const res = await request<{ data: StockRow[] }>('/api/stock');
    return res.data;
  },
  async getLowStock(threshold = 10): Promise<StockRow[]> {
    const res = await request<{ data: StockRow[] }>(
      `/api/stock/low?threshold=${encodeURIComponent(threshold)}`
    );
    return res.data;
  },

  // Vendors
  async getVendors(search?: string): Promise<Vendor[]> {
    const url =
      search && search.trim()
        ? `/api/vendors/search?q=${encodeURIComponent(search.trim())}`
        : '/api/vendors';
    const res = await request<{ data: Vendor[] }>(url);
    return res.data;
  },
  async createVendor(payload: {
    vendor_name: string;
    phone_number: string;
    location: string;
    registration_date?: string;
  }): Promise<Vendor> {
    const res = await request<{ data: Vendor }>('/api/vendors', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
  async updateVendor(
    id: number,
    payload: Partial<{
      vendor_name: string;
      phone_number: string;
      location: string;
      registration_date: string;
    }>
  ): Promise<Vendor> {
    const res = await request<{ data: Vendor }>(`/api/vendors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // Purchases
  async getPurchases(): Promise<Purchase[]> {
    const res = await request<{ data: Purchase[] }>('/api/purchases');
    return res.data;
  },
  async createPurchase(payload: {
    supplier_id: number;
    purchase_date?: string;
    items: Array<{
      fruit_id: number;
      packaging_size: PackagingSize;
      quantity: number;
      unit_cost: number;
    }>;
  }): Promise<Purchase> {
    const res = await request<{ data: Purchase }>('/api/purchases', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // Sales & Payments
  async getSales(): Promise<Sale[]> {
    const res = await request<{ data: Sale[] }>('/api/sales');
    return res.data;
  },
  async createSale(payload: {
    vendor_id: number;
    payment_method: PaymentMethod;
    amount_paid?: number;
    sale_date?: string;
    items: Array<{
      fruit_id: number;
      packaging_size: PackagingSize;
      quantity: number;
    }>;
  }): Promise<Sale> {
    const res = await request<{ data: Sale }>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },
  async addSalePayment(
    saleId: number,
    payload: { amount: number; payment_method: 'CASH' | 'MOBILE_MONEY' }
  ): Promise<Sale> {
    const res = await request<{ data: Sale }>(`/api/sales/${saleId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // Reports
  async getTopFruits(): Promise<TopFruitReportRow[]> {
    const res = await request<{ data: TopFruitReportRow[] }>('/api/reports/top-fruits');
    return res.data;
  },
  async getRevenueReport(startDate: string, endDate: string): Promise<RevenueSummary> {
    const res = await request<{ data: RevenueSummary }>(
      `/api/reports/revenue?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    );
    return res.data;
  },
  async getTopVendorReport(): Promise<{
    top_vendor: TopVendorRow | null;
    rankings: TopVendorRow[];
  }> {
    const res = await request<{
      data: { top_vendor: TopVendorRow | null; rankings: TopVendorRow[] };
    }>('/api/reports/top-vendor');
    return res.data;
  },
  async getStockLevelsReport(): Promise<StockLevelReportRow[]> {
    const res = await request<{ data: StockLevelReportRow[] }>('/api/reports/stock-levels');
    return res.data;
  },
  async getVendorBalances(): Promise<VendorBalanceRow[]> {
    const res = await request<{ data: VendorBalanceRow[] }>('/api/reports/vendor-balances');
    return res.data;
  },
};
