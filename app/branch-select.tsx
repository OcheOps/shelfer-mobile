import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { branchesApi } from '../src/lib/api/endpoints';
import { saveBranch } from '../src/lib/storage/session';
import { ensureDeviceRegistered } from '../src/lib/services/device';
import { refreshCatalog } from '../src/lib/services/catalog';
import { scheduleDailySummary } from '../src/lib/services/notifications';
import type { Branch } from '../src/types/models';

export default function BranchSelectScreen() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [setting, setSetting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await branchesApi.list();
        const list = res.data || [];
        setBranches(list);
        if (list.length === 1) await select(list[0]);
      } catch (err: any) { setError(err.message || 'Failed to load'); }
      finally { setLoading(false); }
    })();
  }, []);

  const select = async (branch: Branch) => {
    setSetting(true); setError(''); setStatus('Saving branch...');
    try {
      await saveBranch(branch.id, branch.name);
      setStatus('Registering device...');
      try { await ensureDeviceRegistered(); } catch {}
      setStatus('Loading catalog...');
      try { await refreshCatalog(); } catch {}
      try { await scheduleDailySummary(20, 0); } catch {} // 8 PM daily summary
      router.replace('/pos');
    } catch (err: any) { setError(err.message); setSetting(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color="#059669" /></View>;
  if (setting) return <View style={s.center}><ActivityIndicator size="large" color="#059669" /><Text style={s.status}>{status}</Text></View>;

  return (
    <View style={s.container}>
      <Text style={s.title}>Select Branch</Text>
      <Text style={s.sub}>Choose your operating branch</Text>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <FlatList data={branches} keyExtractor={b => b.id} contentContainerStyle={{ gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => select(item)}>
            <Text style={s.name}>{item.name}</Text><Text style={s.code}>{item.code}</Text>
          </TouchableOpacity>
        )} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 }, sub: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  err: { color: '#dc2626', marginBottom: 12 }, status: { color: '#6b7280', fontSize: 14, marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  name: { fontSize: 16, fontWeight: '600' }, code: { fontSize: 13, color: '#6b7280', marginTop: 2 },
});
