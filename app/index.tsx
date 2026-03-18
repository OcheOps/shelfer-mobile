import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getSession } from '../src/lib/storage/session';

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        if (session?.accessToken && session.branchId) {
          router.replace('/pos');
        } else if (session?.accessToken) {
          router.replace('/branch-select');
        } else {
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
      setChecking(false);
    })();
    // Safety: force to login after 5s if stuck
    const t = setTimeout(() => { setChecking(false); try { router.replace('/login'); } catch {} }, 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}>
      <ActivityIndicator size="large" color="#059669" />
      <Text style={{ marginTop: 12, color: '#9ca3af' }}>Loading...</Text>
    </View>
  );
}
