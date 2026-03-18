import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getSession } from '../src/lib/storage/session';

export default function Index() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const session = await getSession();
      if (session?.accessToken) {
        if (session.branchId) {
          router.replace('/pos');
        } else {
          router.replace('/branch-select');
        }
      } else {
        router.replace('/login');
      }
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return null;
}
