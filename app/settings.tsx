import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { getSession, clearSession } from '../src/lib/storage/session';
import { getSyncCounts, getCachedProductCount } from '../src/lib/storage/db';
import { getDeviceInfo } from '../src/lib/services/device';
import { refreshCatalog, getLastCatalogSync } from '../src/lib/services/catalog';
import { processSyncQueue } from '../src/lib/services/sales';
import { useNetworkStatus } from '../src/lib/network/status';
import { useTranslation, getSupportedLanguages } from '../src/lib/i18n';
import type { Session } from '../src/types/models';

export default function SettingsScreen() {
  const { t, lang, setLanguage } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [counts, setCounts] = useState({ pending: 0, failed: 0, synced: 0, total: 0 });
  const [productCount, setProductCount] = useState(0);
  const [device, setDevice] = useState<{ id: string | null; code: string | null; registeredAt: string | null }>({ id: null, code: null, registeredAt: null });
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [busy, setBusy] = useState('');
  const network = useNetworkStatus();

  useEffect(() => {
    (async () => {
      setSession(await getSession()); setCounts(await getSyncCounts()); setProductCount(await getCachedProductCount());
      setDevice(await getDeviceInfo()); setLastSync(await getLastCatalogSync());
    })();
  }, []);

  const doRefresh = async () => { setBusy('cat'); try { const n = await refreshCatalog(); setProductCount(n); setLastSync(new Date().toISOString()); Alert.alert(t('success'), `${n} ${t('settings_products').toLowerCase()}`); } catch (e: any) { Alert.alert(t('error'), e.message); } finally { setBusy(''); } };
  const doSync = async () => { setBusy('sync'); try { const n = await processSyncQueue(); setCounts(await getSyncCounts()); Alert.alert(t('success'), `${n} sales synced`); } catch (e: any) { Alert.alert(t('error'), e.message); } finally { setBusy(''); } };
  const doLogout = () => Alert.alert(t('logout'), '?', [{ text: t('cancel'), style: 'cancel' }, { text: t('logout'), style: 'destructive', onPress: async () => { await clearSession(); router.replace('/login'); } }]);

  const nc = { online: '#059669', poor: '#d97706', offline: '#dc2626' }[network];
  const langs = getSupportedLanguages();

  return (
    <ScrollView style={s.container}>
      <View style={s.header}><Text style={s.title}>{t('settings_title')}</Text><TouchableOpacity onPress={() => router.back()}><Text style={s.back}>← {t('back')}</Text></TouchableOpacity></View>

      <Sec title={t('settings_account')}>
        <Row l={t('settings_role')} v={session?.role?.replace('_', ' ') || '-'} />
        <Row l={t('settings_branch')} v={session?.branchName || '-'} />
      </Sec>

      <Sec title={t('settings_device')}>
        <Row l="ID" v={device.id?.slice(0, 12) || '-'} mono />
        <Row l="Code" v={device.code || '-'} mono />
      </Sec>

      <Sec title={t('settings_sync')}>
        <View style={s.row}><Text style={s.label}>{t('settings_network')}</Text><Text style={[s.value, { color: nc, fontWeight: '600' }]}>● {network}</Text></View>
        <Row l={t('settings_pending_sync')} v={String(counts.pending)} />
        <Row l={t('settings_failed_sync')} v={String(counts.failed)} />
        <Row l={t('settings_synced')} v={String(counts.synced)} />
      </Sec>

      <Sec title={t('settings_data')}>
        <Row l={t('settings_products')} v={String(productCount)} />
        <Row l={t('settings_last_sync')} v={lastSync ? new Date(lastSync).toLocaleString() : '-'} />
      </Sec>

      <Sec title="Language">
        <View style={s.langRow}>
          {langs.map(l => (
            <TouchableOpacity key={l.code} style={[s.langBtn, lang === l.code && s.langActive]} onPress={() => setLanguage(l.code)}>
              <Text style={[s.langText, lang === l.code && { color: '#fff', fontWeight: '600' }]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Sec>

      <View style={s.actions}>
        <TouchableOpacity style={s.aBtn} onPress={doRefresh} disabled={!!busy}><Text style={s.aText}>{busy === 'cat' ? t('settings_refreshing') : t('settings_refresh')}</Text></TouchableOpacity>
        <TouchableOpacity style={s.aBtn} onPress={doSync} disabled={!!busy}><Text style={s.aText}>{busy === 'sync' ? t('settings_refreshing') : t('settings_sync_now')}</Text></TouchableOpacity>
      </View>
      <TouchableOpacity style={s.logout} onPress={doLogout}><Text style={s.logoutT}>{t('logout')}</Text></TouchableOpacity>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) { return <View style={s.sec}><Text style={s.secT}>{title}</Text>{children}</View>; }
function Row({ l, v, mono }: { l: string; v: string; mono?: boolean }) { return <View style={s.row}><Text style={s.label}>{l}</Text><Text style={[s.value, mono && { fontFamily: 'monospace' }]}>{v}</Text></View>; }

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 20, fontWeight: '700' }, back: { color: '#059669', fontSize: 15 },
  sec: { backgroundColor: '#fff', marginHorizontal: 12, marginTop: 12, borderRadius: 10, padding: 16 },
  secT: { fontSize: 14, fontWeight: '600', color: '#6b7280', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  label: { fontSize: 14, color: '#6b7280' }, value: { fontSize: 14, fontWeight: '500' },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  langActive: { backgroundColor: '#059669', borderColor: '#059669' },
  langText: { fontSize: 14, color: '#374151' },
  actions: { marginHorizontal: 12, marginTop: 12, gap: 8 },
  aBtn: { backgroundColor: '#fff', borderRadius: 10, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  aText: { fontSize: 15, fontWeight: '500' },
  logout: { backgroundColor: '#dc2626', marginHorizontal: 12, marginTop: 16, borderRadius: 10, padding: 16, alignItems: 'center' },
  logoutT: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
