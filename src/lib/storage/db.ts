import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('shelfer-pos.db');
  await migrate(_db);
  return _db;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS cached_products (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL,
      barcode TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      base_price REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_cp_barcode ON cached_products(barcode);
    CREATE INDEX IF NOT EXISTS idx_cp_name ON cached_products(name);

    CREATE TABLE IF NOT EXISTS local_sales (
      id TEXT PRIMARY KEY,
      external_ref TEXT NOT NULL,
      branch_id TEXT NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      items_json TEXT NOT NULL,
      sold_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_error TEXT NOT NULL DEFAULT '',
      receipt_status TEXT NOT NULL DEFAULT 'not_requested',
      customer_phone TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_ls_sync ON local_sales(sync_status);

    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// --- Product cache ---

export async function cacheProducts(products: { id: string; sku: string; barcode: string; name: string; category: string; base_price: number }[]): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM cached_products');
  for (const p of products) {
    await db.runAsync(
      'INSERT INTO cached_products (id, sku, barcode, name, category, base_price) VALUES (?, ?, ?, ?, ?, ?)',
      p.id, p.sku, p.barcode || '', p.name, p.category || '', p.base_price
    );
  }
}

export async function searchCachedProducts(query: string): Promise<{ id: string; sku: string; barcode: string; name: string; category: string; base_price: number }[]> {
  const db = await getDb();
  if (query.length < 2) return [];
  const rows = await db.getAllAsync(
    'SELECT id, sku, barcode, name, category, base_price FROM cached_products WHERE name LIKE ? OR sku LIKE ? OR barcode = ? ORDER BY name LIMIT 30',
    `%${query}%`, `%${query}%`, query
  );
  return rows as any[];
}

export async function getCachedProductCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM cached_products') as any;
  return row?.cnt ?? 0;
}

// --- Local sales ---

export async function insertLocalSale(sale: {
  id: string; externalRef: string; branchId: string; totalAmount: number;
  paymentMethod: string; items: unknown[]; soldAt: string;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO local_sales (id, external_ref, branch_id, total_amount, payment_method, items_json, sold_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    sale.id, sale.externalRef, sale.branchId, sale.totalAmount, sale.paymentMethod,
    JSON.stringify(sale.items), sale.soldAt
  );
}

export async function getLocalSales(limit = 50): Promise<{
  id: string; external_ref: string; branch_id: string; total_amount: number;
  payment_method: string; items_json: string; sold_at: string;
  sync_status: string; sync_error: string; receipt_status: string; customer_phone: string;
}[]> {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM local_sales ORDER BY sold_at DESC LIMIT ?', limit) as any[];
}

export async function getPendingSales(): Promise<{ id: string; external_ref: string; branch_id: string; total_amount: number; payment_method: string; items_json: string; sold_at: string }[]> {
  const db = await getDb();
  return await db.getAllAsync("SELECT * FROM local_sales WHERE sync_status IN ('pending', 'failed') ORDER BY sold_at ASC LIMIT 20") as any[];
}

export async function updateSaleSyncStatus(id: string, status: string, error = ''): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE local_sales SET sync_status = ?, sync_error = ? WHERE id = ?', status, error, id);
}

export async function updateSaleReceiptStatus(id: string, status: string, phone = ''): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE local_sales SET receipt_status = ?, customer_phone = ? WHERE id = ?', status, phone, id);
}

export async function getLocalSaleById(id: string): Promise<any> {
  const db = await getDb();
  return await db.getFirstAsync('SELECT * FROM local_sales WHERE id = ?', id);
}

export async function getSyncCounts(): Promise<{ pending: number; failed: number; synced: number; total: number }> {
  const db = await getDb();
  const pending = (await db.getFirstAsync("SELECT COUNT(*) as c FROM local_sales WHERE sync_status = 'pending'") as any)?.c ?? 0;
  const failed = (await db.getFirstAsync("SELECT COUNT(*) as c FROM local_sales WHERE sync_status = 'failed'") as any)?.c ?? 0;
  const synced = (await db.getFirstAsync("SELECT COUNT(*) as c FROM local_sales WHERE sync_status = 'synced'") as any)?.c ?? 0;
  const total = (await db.getFirstAsync('SELECT COUNT(*) as c FROM local_sales') as any)?.c ?? 0;
  return { pending, failed, synced, total };
}

export async function getDailySummary(): Promise<{ totalSales: number; totalRevenue: number; pendingSync: number; pendingReceipt: number }> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const stats = await db.getFirstAsync(
    "SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as rev FROM local_sales WHERE sold_at >= ?", today
  ) as any;
  const pendingSync = (await db.getFirstAsync("SELECT COUNT(*) as c FROM local_sales WHERE sync_status IN ('pending', 'failed')") as any)?.c ?? 0;
  const pendingReceipt = (await db.getFirstAsync("SELECT COUNT(*) as c FROM local_sales WHERE receipt_status = 'pending'") as any)?.c ?? 0;
  return { totalSales: stats?.cnt ?? 0, totalRevenue: stats?.rev ?? 0, pendingSync, pendingReceipt };
}

// --- App meta ---

export async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT value FROM app_meta WHERE key = ?', key) as any;
  return row?.value ?? null;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', key, value);
}
