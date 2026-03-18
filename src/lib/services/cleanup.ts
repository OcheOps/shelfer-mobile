import { getDb } from '../storage/db';

/**
 * Remove synced sales older than the given number of days.
 * Never deletes pending or failed sales.
 */
export async function cleanupOldSales(olderThanDays: number): Promise<number> {
  const db = await getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);

  const result = await db.runAsync(
    "DELETE FROM local_sales WHERE sync_status = 'synced' AND receipt_status IN ('sent', 'skipped', 'not_requested') AND sold_at < ?",
    cutoff.toISOString()
  );

  return result.changes;
}
