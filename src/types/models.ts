export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  base_price: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';
export type ReceiptStatus = 'not_requested' | 'pending' | 'sent' | 'failed' | 'skipped';

export interface LocalSale {
  id: string;
  externalRef: string;
  branchId: string;
  totalAmount: number;
  paymentMethod: string;
  items: SaleItem[];
  soldAt: string;
  syncStatus: SyncStatus;
  syncError?: string;
  receiptStatus: ReceiptStatus;
  customerPhone?: string;
}

export interface SaleItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

// Backend sale shape (from API responses)
export interface Sale {
  id: string;
  external_ref: string;
  total_amount: number;
  payment_method: string;
  status: string;
  sold_at: string;
}

export type NetworkStatus = 'online' | 'poor' | 'offline';

export interface Session {
  accessToken: string;
  refreshToken: string;
  userId: string;
  userName?: string;
  role: string;
  tenantId: string;
  branchId?: string;
  branchName?: string;
  deviceId?: string;
  deviceCode?: string;
}

export interface DeviceRegistration {
  id: string;
  code: string;
  branchId: string;
  registeredAt: string;
}

export interface DailySummary {
  totalSales: number;
  totalRevenue: number;
  pendingSyncCount: number;
  pendingReceiptCount: number;
}
