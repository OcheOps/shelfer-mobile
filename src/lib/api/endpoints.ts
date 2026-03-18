import { api } from './client';
import type { ApiSuccess, PaginatedResponse } from '../../types/api';
import type { Branch, Product, Sale } from '../../types/models';

export const authApi = {
  login: (email: string, password: string) => api.login(email, password),
};

export const branchesApi = {
  list: () => api.get<PaginatedResponse<Branch>>('/branches?per_page=50'),
};

export const productsApi = {
  search: (q: string) => api.get<PaginatedResponse<Product>>(`/products?search=${encodeURIComponent(q)}&per_page=30`),
  getByBarcode: (barcode: string) => api.get<PaginatedResponse<Product>>(`/products?search=${encodeURIComponent(barcode)}&per_page=1`),
};

export const salesApi = {
  create: (data: {
    branch_id: string;
    total_amount: number;
    payment_method: string;
    external_sale_ref: string;
    items: { product_id: string; quantity: number; unit_price: number; line_total: number }[];
  }) => api.post<ApiSuccess<Sale>>('/sales', data),

  list: (page = 1) => api.get<PaginatedResponse<Sale>>(`/sales?page=${page}&per_page=20`),
};

// Receipt sending via WhatsApp
export const receiptApi = {
  send: (data: { sale_ref: string; phone_number: string; total_amount: number; items_summary: string }) =>
    api.post<ApiSuccess<{ status: string }>>('/whatsapp/send-receipt', data),
};

// Sync events (alternative to direct sale creation)
export const syncApi = {
  send: (deviceId: string, events: unknown[]) =>
    api.post<ApiSuccess<{ results: { event_id: string; status: string }[] }>>('/sync/events', { device_id: deviceId, events }),
};
