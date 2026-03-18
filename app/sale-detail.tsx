import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { getLocalSaleById } from '../src/lib/storage/db';
import { sendReceipt } from '../src/lib/services/sales';
import type { SaleItem } from '../src/types/models';

function fmt(n: number) { return '₦' + n.toLocaleString(); }

const syncBadge = (s: string) => s === 'synced' ? { bg: '#d1fae5', color: '#065f46', label: 'Synced' } : s === 'pending' ? { bg: '#fef3c7', color: '#92400e', label: 'Pending' } : { bg: '#fee2e2', color: '#991b1b', label: 'Failed' };
const rcptBadge = (s: string) => s === 'sent' ? { bg: '#d1fae5', color: '#065f46', label: 'Sent' } : s === 'pending' ? { bg: '#fef3c7', color: '#92400e', label: 'Pending' } : s === 'failed' ? { bg: '#fee2e2', color: '#991b1b', label: 'Failed' } : s === 'skipped' ? { bg: '#f3f4f6', color: '#6b7280', label: 'Skipped' } : { bg: '#f3f4f6', color: '#6b7280', label: 'None' };

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [sale, setSale] = useState<any>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const row = await getLocalSaleById(id);
      if (row) { setSale(row); setItems(JSON.parse(row.items_json || '[]')); }
    })();
  }, [id]);

  const retryReceipt = async () => {
    if (!sale?.customer_phone || !id) return;
    setRetrying(true);
    try { await sendReceipt(id, sale.customer_phone); setSale({ ...sale, receipt_status: 'sent' }); }
    catch { setSale({ ...sale, receipt_status: 'failed' }); }
    finally { setRetrying(false); }
  };

  if (!sale) return <View style={s.center}><Text>Loading...</Text></View>;

  const sync = syncBadge(sale.sync_status);
  const rcpt = rcptBadge(sale.receipt_status);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
        <Text style={s.title}>Sale Detail</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.card}>
        <Text style={s.ref}>{sale.external_ref}</Text>
        <Text style={s.amount}>{fmt(sale.total_amount)}</Text>
        <Text style={s.meta}>{sale.payment_method.toUpperCase()} • {new Date(sale.sold_at).toLocaleString()}</Text>
        <View style={s.badges}>
          <Text style={[s.badge, { backgroundColor: sync.bg, color: sync.color }]}>Sync: {sync.label}</Text>
          <Text style={[s.badge, { backgroundColor: rcpt.bg, color: rcpt.color }]}>Receipt: {rcpt.label}</Text>
        </View>
        {sale.customer_phone ? <Text style={s.phone}>📱 {sale.customer_phone}</Text> : null}
        {sale.sync_error ? <Text style={s.error}>Error: {sale.sync_error}</Text> : null}
      </View>

      <Text style={s.itemsTitle}>Items</Text>
      <FlatList data={items} keyExtractor={(_, i) => String(i)} renderItem={({ item }) => (
        <View style={s.item}>
          <View style={{ flex: 1 }}><Text style={s.iName}>{item.product_name}</Text><Text style={s.iMeta}>{item.quantity} × {fmt(item.unit_price)}</Text></View>
          <Text style={s.iTotal}>{fmt(item.line_total)}</Text>
        </View>
      )} />

      {sale.receipt_status === 'failed' && sale.customer_phone && (
        <TouchableOpacity style={s.retryBtn} onPress={retryReceipt} disabled={retrying}>
          <Text style={s.retryText}>{retrying ? 'Sending...' : 'Retry Receipt Send'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  back: { color: '#059669', fontSize: 15 }, title: { fontSize: 18, fontWeight: '700' },
  card: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 20, alignItems: 'center' },
  ref: { fontFamily: 'monospace', fontSize: 16, fontWeight: '600' }, amount: { fontSize: 28, fontWeight: '800', color: '#059669', marginVertical: 4 },
  meta: { fontSize: 14, color: '#6b7280' }, phone: { fontSize: 13, color: '#374151', marginTop: 8 }, error: { fontSize: 12, color: '#dc2626', marginTop: 4 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: { fontSize: 12, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  itemsTitle: { fontSize: 16, fontWeight: '600', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  item: { flexDirection: 'row', backgroundColor: '#fff', padding: 14, marginHorizontal: 12, marginBottom: 4, borderRadius: 8 },
  iName: { fontSize: 14, fontWeight: '500' }, iMeta: { fontSize: 12, color: '#6b7280' }, iTotal: { fontSize: 14, fontWeight: '600' },
  retryBtn: { backgroundColor: '#059669', margin: 12, borderRadius: 10, padding: 14, alignItems: 'center' },
  retryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
