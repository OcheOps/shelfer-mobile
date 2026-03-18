import { api } from '../api/client';
import { getSession } from '../storage/session';
import { insertLocalSale, updateSaleSyncStatus, getPendingSales, updateSaleReceiptStatus } from '../storage/db';
import type { SaleItem } from '../../types/models';
import type { ApiSuccess } from '../../types/api';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export interface CompleteSaleInput {
  items: SaleItem[];
  paymentMethod: string;
}

export interface CompleteSaleResult {
  saleId: string;
  externalRef: string;
  totalAmount: number;
  synced: boolean;
}

/**
 * Complete a sale: persist locally first, then attempt backend sync.
 * Sale is NEVER lost — always in local SQLite regardless of network.
 */
export async function completeSale(input: CompleteSaleInput): Promise<CompleteSaleResult> {
  const session = await getSession();
  if (!session?.branchId) throw new Error('No branch selected');

  const saleId = uuid();
  const externalRef = `MOB-${saleId.slice(0, 8).toUpperCase()}`;
  const totalAmount = input.items.reduce((sum, i) => sum + i.line_total, 0);
  const now = new Date().toISOString();

  // 1. Always persist locally first
  await insertLocalSale({
    id: saleId,
    externalRef,
    branchId: session.branchId,
    totalAmount,
    paymentMethod: input.paymentMethod,
    items: input.items,
    soldAt: now,
  });

  // 2. Try immediate backend sync
  let synced = false;
  try {
    await syncSaleToBackend(saleId, session, {
      external_sale_ref: externalRef,
      cashier_id: session.userId,  // Required by backend
      total_amount: totalAmount,
      payment_method: input.paymentMethod,
      sold_at: now,                // Required by backend
      items: input.items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.line_total,
      })),
    });
    await updateSaleSyncStatus(saleId, 'synced');
    synced = true;
  } catch {
    // Left as 'pending' — sync worker will retry
  }

  return { saleId, externalRef, totalAmount, synced };
}

/**
 * Sync payload shape matches backend SaleCreatedPayload exactly:
 * { external_sale_ref, cashier_id, total_amount, payment_method, sold_at, items[] }
 *
 * Branch and tenant context come from JWT + registered device, NOT from the payload.
 */
async function syncSaleToBackend(saleId: string, session: { deviceId?: string; userId: string }, payload: unknown): Promise<void> {
  const deviceId = session.deviceId || 'mobile-unknown';

  const events = [{
    event_id: `mob-${saleId}`,
    event_type: 'sale.created',
    aggregate_type: 'sale.created',
    aggregate_id: '',
    payload,
  }];

  await api.post<ApiSuccess<unknown>>('/sync/events', { device_id: deviceId, events });
}

/**
 * Process all pending/failed sales in the queue.
 */
export async function processSyncQueue(): Promise<number> {
  const pending = await getPendingSales();
  if (pending.length === 0) return 0;

  const session = await getSession();
  if (!session) return 0;

  let synced = 0;
  for (const sale of pending) {
    try {
      await updateSaleSyncStatus(sale.id, 'syncing');
      const items = JSON.parse(sale.items_json);

      // Reconstruct the exact payload backend expects
      await syncSaleToBackend(sale.id, session, {
        external_sale_ref: sale.external_ref,
        cashier_id: session.userId,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        sold_at: sale.sold_at,
        items: items.map((i: any) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          line_total: i.line_total,
        })),
      });
      await updateSaleSyncStatus(sale.id, 'synced');
      synced++;
    } catch (err: any) {
      await updateSaleSyncStatus(sale.id, 'failed', err.message || 'sync failed');
    }
  }
  return synced;
}

/**
 * Send receipt via WhatsApp.
 * Endpoint: POST /api/v1/receipts/send
 * Payload: { sale_ref: string, customer_phone: string }
 */
export async function sendReceipt(saleId: string, customerPhone: string): Promise<void> {
  // Get the sale ref from local DB
  const { getLocalSaleById } = await import('../storage/db');
  const sale = await getLocalSaleById(saleId);
  if (!sale) throw new Error('Sale not found locally');

  await updateSaleReceiptStatus(saleId, 'pending', customerPhone);

  try {
    await api.post<ApiSuccess<{ status: string }>>('/receipts/send', {
      sale_ref: sale.external_ref,
      customer_phone: customerPhone,
    });
    await updateSaleReceiptStatus(saleId, 'sent', customerPhone);
  } catch {
    await updateSaleReceiptStatus(saleId, 'failed', customerPhone);
    throw new Error('Receipt send failed');
  }
}

export async function skipReceipt(saleId: string): Promise<void> {
  await updateSaleReceiptStatus(saleId, 'skipped');
}

/**
 * Retry all failed receipt sends.
 */
export async function retryFailedReceipts(): Promise<number> {
  const { getDb } = await import('../storage/db');
  const db = await getDb();
  const failed = await db.getAllAsync(
    "SELECT id, external_ref, customer_phone FROM local_sales WHERE receipt_status = 'failed' AND customer_phone != '' LIMIT 10"
  ) as any[];

  let sent = 0;
  for (const sale of failed) {
    try {
      await api.post<ApiSuccess<{ status: string }>>('/receipts/send', {
        sale_ref: sale.external_ref,
        customer_phone: sale.customer_phone,
      });
      await updateSaleReceiptStatus(sale.id, 'sent', sale.customer_phone);
      sent++;
    } catch {
      // Leave as failed — will retry next cycle
    }
  }
  return sent;
}
