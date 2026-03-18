import { getDb, getMeta, setMeta } from '../storage/db';

export interface Shift {
  id: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  closingCash: number;
  totalSales: number;
  saleCount: number;
  cashDifference: number;
  status: 'open' | 'closed';
}

// Ensure shifts table exists
async function ensureTable(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY, cashier_name TEXT NOT NULL, opened_at TEXT NOT NULL,
      closed_at TEXT, opening_cash REAL NOT NULL DEFAULT 0, closing_cash REAL NOT NULL DEFAULT 0,
      total_sales REAL NOT NULL DEFAULT 0, sale_count INTEGER NOT NULL DEFAULT 0,
      cash_difference REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'open'
    );
  `);
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export async function openShift(cashierName: string, openingCash: number): Promise<Shift> {
  await ensureTable();
  const db = await getDb();
  const active = await getActiveShift();
  if (active) throw new Error(`Shift already open since ${active.openedAt}`);

  const shift: Shift = {
    id: uuid(), cashierName, openedAt: new Date().toISOString(),
    openingCash, closingCash: 0, totalSales: 0, saleCount: 0, cashDifference: 0, status: 'open',
  };

  await db.runAsync('INSERT INTO shifts (id, cashier_name, opened_at, opening_cash, status) VALUES (?, ?, ?, ?, ?)',
    shift.id, shift.cashierName, shift.openedAt, shift.openingCash, 'open');

  return shift;
}

export async function closeShift(closingCash: number): Promise<Shift> {
  await ensureTable();
  const db = await getDb();
  const active = await getActiveShift();
  if (!active) throw new Error('No active shift');

  // Calculate totals from sales during this shift
  const stats = await db.getFirstAsync(
    "SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as rev FROM local_sales WHERE sold_at >= ?",
    active.openedAt
  ) as any;

  const saleCount = stats?.cnt ?? 0;
  const totalSales = stats?.rev ?? 0;
  const cashDifference = closingCash - active.openingCash - totalSales;
  const closedAt = new Date().toISOString();

  await db.runAsync(
    'UPDATE shifts SET closed_at = ?, closing_cash = ?, total_sales = ?, sale_count = ?, cash_difference = ?, status = ? WHERE id = ?',
    closedAt, closingCash, totalSales, saleCount, cashDifference, 'closed', active.id
  );

  return { ...active, closedAt, closingCash, totalSales, saleCount, cashDifference, status: 'closed' };
}

export async function getActiveShift(): Promise<Shift | null> {
  await ensureTable();
  const db = await getDb();
  const row = await db.getFirstAsync("SELECT * FROM shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1") as any;
  if (!row) return null;
  return {
    id: row.id, cashierName: row.cashier_name, openedAt: row.opened_at, closedAt: row.closed_at,
    openingCash: row.opening_cash, closingCash: row.closing_cash, totalSales: row.total_sales,
    saleCount: row.sale_count, cashDifference: row.cash_difference, status: row.status,
  };
}

export async function getRecentShifts(limit = 10): Promise<Shift[]> {
  await ensureTable();
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT * FROM shifts ORDER BY opened_at DESC LIMIT ?', limit) as any[];
  return rows.map(r => ({
    id: r.id, cashierName: r.cashier_name, openedAt: r.opened_at, closedAt: r.closed_at,
    openingCash: r.opening_cash, closingCash: r.closing_cash, totalSales: r.total_sales,
    saleCount: r.sale_count, cashDifference: r.cash_difference, status: r.status,
  }));
}
