import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Init services — never block app load on failure
    (async () => {
      try { const { initLanguage } = await import('../src/lib/i18n'); await initLanguage(); } catch {}
      try { const { initNotifications } = await import('../src/lib/services/notifications'); await initNotifications(); } catch {}
      setReady(true);
    })();
    // Safety: force ready after 3 seconds even if init hangs
    const t = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' }}><Text style={{ color: '#9ca3af' }}>Loading...</Text></View>;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#f9fafb' },
        }}
      />
    </QueryClientProvider>
  );
}
