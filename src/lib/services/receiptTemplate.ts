import { getMeta, setMeta } from '../storage/db';
import { t } from '../i18n';

export interface ReceiptConfig {
  storeName: string;
  branchName: string;
  footerText: string;
  showCashier: boolean;
  showDateTime: boolean;
  showItemSku: boolean;
  currency: string;
}

const DEFAULT_CONFIG: ReceiptConfig = {
  storeName: 'My Store',
  branchName: '',
  footerText: 'Thank you for shopping!',
  showCashier: true,
  showDateTime: true,
  showItemSku: false,
  currency: '₦',
};

export async function getReceiptConfig(): Promise<ReceiptConfig> {
  const raw = await getMeta('receipt_config');
  if (raw) {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }; } catch {}
  }
  return DEFAULT_CONFIG;
}

export async function saveReceiptConfig(config: Partial<ReceiptConfig>): Promise<ReceiptConfig> {
  const current = await getReceiptConfig();
  const merged = { ...current, ...config };
  await setMeta('receipt_config', JSON.stringify(merged));
  return merged;
}

export interface ReceiptData {
  ref: string;
  date: string;
  cashier?: string;
  items: { name: string; sku?: string; qty: number; price: number; total: number }[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  tenderedAmount?: number;
  changeDue?: number;
}

/**
 * Format a receipt as plain text using the stored template config.
 */
export async function formatReceipt(data: ReceiptData): Promise<string> {
  const cfg = await getReceiptConfig();
  const w = 40;
  const center = (s: string) => { const p = Math.max(0, Math.floor((w - s.length) / 2)); return ' '.repeat(p) + s; };
  const line = '-'.repeat(w);
  const fmt = (n: number) => `${cfg.currency}${n.toLocaleString()}`;

  let out = '';
  out += center(cfg.storeName.toUpperCase()) + '\n';
  if (cfg.branchName) out += center(cfg.branchName) + '\n';
  out += line + '\n';
  out += `Ref: ${data.ref}\n`;
  if (cfg.showDateTime) out += `Date: ${data.date}\n`;
  if (cfg.showCashier && data.cashier) out += `Cashier: ${data.cashier}\n`;
  out += line + '\n';

  for (const item of data.items) {
    const name = item.name.length > 20 ? item.name.slice(0, 20) : item.name;
    out += `${name}\n`;
    out += `  ${item.qty} x ${fmt(item.price)}`.padEnd(w - 8) + fmt(item.total).padStart(8) + '\n';
    if (cfg.showItemSku && item.sku) out += `  SKU: ${item.sku}\n`;
  }

  out += '='.repeat(w) + '\n';
  out += 'TOTAL'.padEnd(w - 10) + fmt(data.total).padStart(10) + '\n';
  out += `Payment: ${data.paymentMethod.toUpperCase()}\n`;

  if (data.tenderedAmount !== undefined && data.tenderedAmount > 0) {
    out += `Tendered: ${fmt(data.tenderedAmount)}\n`;
    out += `Change: ${fmt(data.changeDue ?? 0)}\n`;
  }

  out += line + '\n';
  out += center(cfg.footerText) + '\n';

  return out;
}
