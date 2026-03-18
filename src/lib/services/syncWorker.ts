import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useNetworkStatus } from '../network/status';
import { processSyncQueue, retryFailedReceipts } from './sales';
import { cleanupOldSales } from './cleanup';
import { notifySyncComplete } from './notifications';

export function useSyncWorker() {
  const network = useNetworkStatus();
  const prevNetwork = useRef(network);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trySync = useCallback(async () => {
    if (network === 'offline') return;
    try {
      const synced = await processSyncQueue();
      if (synced > 0) notifySyncComplete(synced).catch(() => {});
    } catch {}
    try { await retryFailedReceipts(); } catch {}
  }, [network]);

  useEffect(() => {
    if (prevNetwork.current !== 'online' && network === 'online') trySync();
    prevNetwork.current = network;
  }, [network, trySync]);

  useEffect(() => {
    const h = (s: AppStateStatus) => { if (s === 'active') trySync(); };
    const sub = AppState.addEventListener('change', h);
    return () => sub.remove();
  }, [trySync]);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      await trySync();
      try { await cleanupOldSales(7); } catch {}
    }, 60000);
    trySync();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [trySync]);

  return { triggerSync: trySync };
}
