import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import type { NetworkStatus } from '../../types/models';

function deriveStatus(state: NetInfoState): NetworkStatus {
  if (!state.isConnected) return 'offline';
  if (state.isInternetReachable === false) return 'poor';
  return 'online';
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>('online');

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setStatus(deriveStatus(state));
    });
    return () => unsub();
  }, []);

  return status;
}
