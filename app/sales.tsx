import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { getLocalSales, getDailySummary } from '../src/lib/storage/db';

function fmt(n: number) { return '₦' + n.toLocaleString(); }

const sc: Record<string, { bg: string; c: string }> = { synced: { bg: '#d1fae5', c: '#065f46' }, pending: { bg: '#fef3c7', c: '#92400e' }, failed: { bg: '#fee2e2', c: '#991b1b' }, syncing: { bg: '#dbeafe', c: '#1e40af' } };
const rc: Record<string, { bg: string; c: string }> = { sent: { bg: '#d1fae5', c: '#065f46' }, pending: { bg: '#fef3c7', c: '#92400e' }, failed: { bg: '#fee2e2', c: '#991b1b' }, skipped: { bg: '#f3f4f6', c: '#6b7280' }, not_requested: { bg: '#f3f4f6', c: '#9ca3af' } };

export default function SalesScreen() {
  const [sales, setSales] = useState<any[]>([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalRevenue: 0, pendingSync: 0, pendingReceipt: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => { setSales(await getLocalSales(50)); setSummary(await getDailySummary()); }, []);
  useEffect(() => { load(); }, [load]);
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <View style={s.container}>
      <View style={s.header}><Text style={s.title}>Sales</Text><TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity></View>
      <View style={s.sumRow}>
        <View style={s.sumCard}><Text style={s.sL}>Today</Text><Text style={s.sV}>{summary.totalSales} sales</Text></View>
        <View style={s.sumCard}><Text style={s.sL}>Revenue</Text><Text style={s.sV}>{fmt(summary.totalRevenue)}</Text></View>
        <View style={s.sumCard}><Text style={s.sL}>Pending</Text><Text style={[s.sV, summary.pendingSync > 0 && { color: '#d97706' }]}>{summary.pendingSync}</Text></View>
      </View>
      <FlatList data={sales} keyExtractor={i => i.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#059669" />}
        ListEmptyComponent={<Text style={s.empty}>No sales yet</Text>}
        renderItem={({ item }) => {
          const syncC = sc[item.sync_status] ?? sc.pending;
          const rcptC = rc[item.receipt_status] ?? rc.not_requested;
          return (
            <TouchableOpacity style={s.card} onPress={() => router.push({ pathname: '/sale-detail', params: { id: item.id } })}>
              <View style={{ flex: 1 }}>
                <Text style={s.ref}>{item.external_ref}</Text>
                <Text style={s.meta}>{new Date(item.sold_at).toLocaleString()} • {item.payment_method}</Text>
                <View style={s.badges}>
                  <Text style={[s.badge, { backgroundColor: syncC.bg, color: syncC.c }]}>{item.sync_status}</Text>
                  <Text style={[s.badge, { backgroundColor: rcptC.bg, color: rcptC.c }]}>{item.receipt_status}</Text>
                </View>
              </View>
              <Text style={s.amount}>{fmt(item.total_amount)}</Text>
            </TouchableOpacity>
          );
        }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 20, fontWeight: '700' }, back: { color: '#059669', fontSize: 15 },
  sumRow: { flexDirection: 'row', padding: 12, gap: 8 },
  sumCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center' },
  sL: { fontSize: 12, color: '#6b7280' }, sV: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  empty: { textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 15 },
  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 14, marginHorizontal: 12, marginTop: 6, borderRadius: 10, alignItems: 'center' },
  ref: { fontSize: 14, fontWeight: '600', fontFamily: 'monospace' }, meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  amount: { fontSize: 18, fontWeight: '700' },
});
