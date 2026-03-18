import { api } from '../api/client';
import { cacheProducts, getCachedProductCount, searchCachedProducts, setMeta, getMeta, getDb } from '../storage/db';
import type { PaginatedResponse } from '../../types/api';
import type { Product } from '../../types/models';

/**
 * Full catalog refresh — replaces entire local cache.
 */
export async function refreshCatalog(): Promise<number> {
  const res = await api.get<PaginatedResponse<Product>>('/products?per_page=5000');
  const products = res.data ?? [];
  await cacheProducts(products);
  await setMeta('catalog_last_sync', new Date().toISOString());
  return products.length;
}

/**
 * Incremental update — only fetches products changed since last sync.
 * Falls back to full refresh if no previous sync exists.
 */
export async function incrementalCatalogSync(): Promise<{ updated: number; total: number }> {
  const lastSync = await getMeta('catalog_last_sync');
  if (!lastSync) { const n = await refreshCatalog(); return { updated: n, total: n }; }

  const res = await api.get<PaginatedResponse<Product>>(`/products?updated_since=${encodeURIComponent(lastSync)}&per_page=5000`);
  const changed = res.data ?? [];

  if (changed.length > 0) {
    const db = await getDb();
    for (const p of changed) {
      await db.runAsync('INSERT OR REPLACE INTO cached_products (id, sku, barcode, name, category, base_price) VALUES (?, ?, ?, ?, ?, ?)',
        p.id, p.sku, p.barcode || '', p.name, p.category || '', p.base_price);
    }
  }

  await setMeta('catalog_last_sync', new Date().toISOString());
  const total = await getCachedProductCount();
  return { updated: changed.length, total };
}

export async function searchProducts(query: string, isOnline: boolean): Promise<Product[]> {
  const local = await searchCachedProducts(query);
  if (local.length > 0) return local;
  if (isOnline && query.length >= 2) {
    try { const res = await api.get<PaginatedResponse<Product>>(`/products?search=${encodeURIComponent(query)}&per_page=20`); return res.data ?? []; }
    catch { return []; }
  }
  return [];
}

export async function getLastCatalogSync(): Promise<string | null> { return getMeta('catalog_last_sync'); }
export { getCachedProductCount };
