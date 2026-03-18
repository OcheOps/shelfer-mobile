import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { initNotifications } from '../src/lib/services/notifications';
import { initLanguage } from '../src/lib/i18n';
import { NetworkBanner } from '../src/components/NetworkBanner';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initLanguage();
      await initNotifications();
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <NetworkBanner />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: '#fff' },
            headerTintColor: '#111',
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: '#f9fafb' },
          }}
        />
      </View>
    </QueryClientProvider>
  );
}
