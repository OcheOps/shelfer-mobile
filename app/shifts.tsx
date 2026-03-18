import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { getSession } from '../src/lib/storage/session';
import { openShift, closeShift, getActiveShift, getRecentShifts, Shift } from '../src/lib/services/shift';
import { formatCurrency, formatDate, getErrorMessage } from '../src/lib/utils/strings';

export default function ShiftsScreen() {
  const [active, setActive] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [openCash, setOpenCash] = useState('');
  const [closeCash, setCloseCash] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setActive(await getActiveShift());
    setShifts(await getRecentShifts(10));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleOpen = async () => {
    setBusy(true);
    try {
      const session = await getSession();
      await openShift(session?.userName || session?.role || 'Cashier', parseFloat(openCash) || 0);
      setOpenCash('');
      await load();
    } catch (e) { Alert.alert('Error', getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  const handleClose = async () => {
    setBusy(true);
    try {
      const result = await closeShift(parseFloat(closeCash) || 0);
      setCloseCash('');
      Alert.alert('Shift Closed', `Sales: ${result.saleCount}\nRevenue: ${formatCurrency(result.totalSales)}\nDifference: ${formatCurrency(result.cashDifference)}`);
      await load();
    } catch (e) { Alert.alert('Error', getErrorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Shifts</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← Back</Text></TouchableOpacity>
      </View>

      {!active ? (
        <View style={s.section}>
          <Text style={s.secTitle}>Open New Shift</Text>
          <Text style={s.label}>Opening Cash</Text>
          <TextInput style={s.input} value={openCash} onChangeText={setOpenCash} keyboardType="numeric" placeholder="0" />
          <TouchableOpacity style={s.btn} onPress={handleOpen} disabled={busy}>
            <Text style={s.btnText}>{busy ? 'Opening...' : 'Open Shift'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.section}>
          <Text style={s.secTitle}>Active Shift</Text>
          <Row l="Cashier" v={active.cashierName} />
          <Row l="Opened" v={formatDate(active.openedAt)} />
          <Row l="Opening Cash" v={formatCurrency(active.openingCash)} />
          <Text style={[s.label, { marginTop: 12 }]}>Closing Cash</Text>
          <TextInput style={s.input} value={closeCash} onChangeText={setCloseCash} keyboardType="numeric" placeholder="0" />
          <TouchableOpacity style={[s.btn, { backgroundColor: '#dc2626' }]} onPress={handleClose} disabled={busy}>
            <Text style={s.btnText}>{busy ? 'Closing...' : 'Close Shift'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {shifts.length > 0 && (
        <View style={s.section}>
          <Text style={s.secTitle}>Recent Shifts</Text>
          {shifts.map(sh => (
            <View key={sh.id} style={s.shiftCard}>
              <View style={s.shiftRow}>
                <Text style={s.shiftName}>{sh.cashierName}</Text>
                <Text style={[s.badge, sh.status === 'open' ? s.badgeGreen : s.badgeGray]}>{sh.status}</Text>
              </View>
              <Text style={s.shiftMeta}>{formatDate(sh.openedAt)}{sh.closedAt ? ` → ${formatDate(sh.closedAt)}` : ''}</Text>
              {sh.status === 'closed' && (
                <View style={s.shiftStats}>
                  <Text style={s.statItem}>{sh.saleCount} sales</Text>
                  <Text style={s.statItem}>{formatCurrency(sh.totalSales)}</Text>
                  <Text style={[s.statItem, { color: sh.cashDifference < 0 ? '#dc2626' : '#059669' }]}>
                    {sh.cashDifference >= 0 ? '+' : ''}{formatCurrency(sh.cashDifference)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Row({ l, v }: { l: string; v: string }) {
  return <View style={s.row}><Text style={s.rowLabel}>{l}</Text><Text style={s.rowValue}>{v}</Text></View>;
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 20, fontWeight: '700' }, back: { color: '#059669', fontSize: 15 },
  section: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 10, padding: 16 },
  secTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  label: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  btn: { backgroundColor: '#059669', borderRadius: 8, padding: 14, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: '#6b7280' }, rowValue: { fontSize: 14, fontWeight: '500' },
  shiftCard: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingVertical: 10 },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shiftName: { fontSize: 14, fontWeight: '600' },
  shiftMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  shiftStats: { flexDirection: 'row', gap: 12, marginTop: 4 },
  statItem: { fontSize: 13, fontWeight: '500' },
  badge: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  badgeGreen: { backgroundColor: '#d1fae5', color: '#065f46' },
  badgeGray: { backgroundColor: '#f3f4f6', color: '#6b7280' },
});
