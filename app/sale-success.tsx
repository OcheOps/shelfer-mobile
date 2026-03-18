import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { sendReceipt, skipReceipt } from '../src/lib/services/sales';
import { useTranslation } from '../src/lib/i18n';

function fmt(n: number) { return '₦' + n.toLocaleString(); }

export default function SaleSuccessScreen() {
  const { t } = useTranslation();
  const { saleId, ref, total, method, synced, tendered, change } = useLocalSearchParams<{
    saleId: string; ref: string; total: string; method: string; synced: string; tendered?: string; change?: string;
  }>();
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const handleSend = async () => {
    if (!phone.trim() || !saleId) return;
    setState('sending');
    try { await sendReceipt(saleId, phone.trim()); setState('sent'); } catch { setState('failed'); }
  };
  const handleSkip = async () => { if (saleId) await skipReceipt(saleId); router.replace('/pos'); };
  const done = () => router.replace('/pos');

  const totalNum = parseFloat(total || '0');
  const tenderedNum = parseFloat(tendered || '0');
  const changeNum = parseFloat(change || '0');

  return (
    <View style={s.container}>
      <View style={s.card}>
        <Text style={{ fontSize: 48 }}>✅</Text>
        <Text style={s.title}>{t('sale_complete')}</Text>
        <Text style={s.amount}>{fmt(totalNum)}</Text>
        <Text style={s.meta}>{method?.toUpperCase()} • {ref}</Text>
        {tenderedNum > 0 && (
          <View style={s.tenderRow}>
            <Text style={s.tenderLabel}>{t('checkout_tendered')}: {fmt(tenderedNum)}</Text>
            <Text style={s.changeLabel}>{t('checkout_change')}: <Text style={s.changeVal}>{fmt(changeNum)}</Text></Text>
          </View>
        )}
        {synced === 'false' && <Text style={s.queued}>{t('sale_queued')}</Text>}
        {synced === 'true' && <Text style={s.syncOk}>{t('sale_synced')}</Text>}
      </View>
      <View style={s.receipt}>
        <Text style={s.rTitle}>{t('receipt_title')}</Text>
        {state === 'idle' && <>
          <TextInput style={s.input} placeholder={t('receipt_phone_placeholder')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <View style={s.row}>
            <TouchableOpacity style={s.sendBtn} onPress={handleSend} disabled={!phone.trim()}><Text style={s.sendT}>{t('send')}</Text></TouchableOpacity>
            <TouchableOpacity style={s.skipBtn} onPress={handleSkip}><Text style={s.skipT}>{t('skip')}</Text></TouchableOpacity>
          </View>
        </>}
        {state === 'sending' && <Text style={s.ok}>{t('receipt_sending')}</Text>}
        {state === 'sent' && <><Text style={s.ok}>{t('receipt_sent')}</Text><TouchableOpacity style={s.doneBtn} onPress={done}><Text style={s.doneT}>{t('receipt_next')}</Text></TouchableOpacity></>}
        {state === 'failed' && <><Text style={s.fail}>{t('receipt_failed')}</Text>
          <View style={s.row}><TouchableOpacity style={s.sendBtn} onPress={handleSend}><Text style={s.sendT}>{t('retry')}</Text></TouchableOpacity>
            <TouchableOpacity style={s.skipBtn} onPress={done}><Text style={s.skipT}>{t('done')}</Text></TouchableOpacity></View></>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f9fafb' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', marginBottom: 24, elevation: 2 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8 }, amount: { fontSize: 28, fontWeight: '800', color: '#059669', marginTop: 4 },
  meta: { fontSize: 14, color: '#6b7280' },
  tenderRow: { marginTop: 12, alignItems: 'center' }, tenderLabel: { fontSize: 14, color: '#6b7280' },
  changeLabel: { fontSize: 16, fontWeight: '600', marginTop: 4 }, changeVal: { fontSize: 20, fontWeight: '800', color: '#059669' },
  queued: { fontSize: 13, color: '#d97706', marginTop: 8 }, syncOk: { fontSize: 13, color: '#059669', marginTop: 8 },
  receipt: { backgroundColor: '#fff', borderRadius: 12, padding: 20 }, rTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  sendBtn: { flex: 1, backgroundColor: '#059669', borderRadius: 8, padding: 14, alignItems: 'center' }, sendT: { color: '#fff', fontSize: 15, fontWeight: '600' },
  skipBtn: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, alignItems: 'center' }, skipT: { color: '#6b7280', fontSize: 15 },
  ok: { fontSize: 15, textAlign: 'center', marginBottom: 12, color: '#059669' }, fail: { fontSize: 15, textAlign: 'center', marginBottom: 12, color: '#dc2626' },
  doneBtn: { backgroundColor: '#059669', borderRadius: 8, padding: 14, alignItems: 'center' }, doneT: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
