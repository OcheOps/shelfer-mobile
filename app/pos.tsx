import { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal } from 'react-native';
import { router } from 'expo-router';
import { searchProducts } from '../src/lib/services/catalog';
import { completeSale } from '../src/lib/services/sales';
import { useSyncWorker } from '../src/lib/services/syncWorker';
import { useNetworkStatus } from '../src/lib/network/status';
import { useTranslation } from '../src/lib/i18n';
import type { Product, CartItem, SaleItem } from '../src/types/models';

function fmt(n: number) { return '₦' + n.toLocaleString(); }

export default function POSScreen() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState('cash');
  const [completing, setCompleting] = useState(false);
  const [showTender, setShowTender] = useState(false);
  const [tendered, setTendered] = useState('');
  const inputRef = useRef<TextInput>(null);
  const network = useNetworkStatus();
  useSyncWorker();

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    const items = await searchProducts(q, network === 'online');
    if (items.length === 1 && items[0].barcode === q) { addToCart(items[0]); setQuery(''); setResults([]); }
    else setResults(items);
  }, [network]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const e = prev.find(i => i.product.id === product.id);
      if (e) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    setQuery(''); setResults([]);
  };

  const updateQty = (id: string, d: number) => setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, i.quantity + d) } : i));
  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));
  const total = cart.reduce((s, i) => s + i.product.base_price * i.quantity, 0);
  const tenderedNum = parseFloat(tendered) || 0;
  const changeDue = Math.max(0, tenderedNum - total);

  const initiateCheckout = () => {
    if (cart.length === 0) return;
    if (payMethod === 'cash') { setTendered(''); setShowTender(true); }
    else doCheckout();
  };

  const doCheckout = async () => {
    setShowTender(false);
    setCompleting(true);
    try {
      const items: SaleItem[] = cart.map(i => ({ product_id: i.product.id, product_name: i.product.name, quantity: i.quantity, unit_price: i.product.base_price, line_total: i.product.base_price * i.quantity }));
      const result = await completeSale({ items, paymentMethod: payMethod });
      const params: Record<string, string> = {
        saleId: result.saleId, ref: result.externalRef, total: result.totalAmount.toString(),
        method: payMethod, synced: result.synced ? 'true' : 'false',
      };
      if (payMethod === 'cash' && tenderedNum > 0) {
        params.tendered = tenderedNum.toString();
        params.change = changeDue.toString();
      }
      router.push({ pathname: '/sale-success', params });
      setCart([]);
    } catch {} finally { setCompleting(false); }
  };

  const payLabels: Record<string, string> = { cash: t('pos_cash'), card: t('pos_card'), mobile: t('pos_mobile') };

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <TextInput ref={inputRef} style={s.searchInput} placeholder={t('pos_search')} value={query} onChangeText={search} autoCapitalize="none" />
        <TouchableOpacity style={s.scanBtn} onPress={() => router.push('/scanner')}><Text style={{ fontSize: 22 }}>📷</Text></TouchableOpacity>
      </View>
      {results.length > 0 && <View style={s.results}>{results.slice(0, 8).map(p => (
        <TouchableOpacity key={p.id} style={s.resultItem} onPress={() => addToCart(p)}>
          <View><Text style={s.rName}>{p.name}</Text><Text style={s.rSku}>{p.sku}</Text></View>
          <Text style={s.rPrice}>{fmt(p.base_price)}</Text>
        </TouchableOpacity>
      ))}</View>}
      <FlatList data={cart} keyExtractor={i => i.product.id} style={s.cart}
        ListEmptyComponent={<Text style={s.empty}>{t('pos_cart_empty')}</Text>}
        renderItem={({ item }) => (
          <View style={s.cartItem}>
            <View style={{ flex: 1 }}><Text style={s.cName}>{item.product.name}</Text><Text style={s.cPrice}>{fmt(item.product.base_price)}</Text></View>
            <View style={s.qtyRow}>
              <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.product.id, -1)}><Text>−</Text></TouchableOpacity>
              <Text style={s.qtyText}>{item.quantity}</Text>
              <TouchableOpacity style={s.qtyBtn} onPress={() => updateQty(item.product.id, 1)}><Text>+</Text></TouchableOpacity>
            </View>
            <Text style={s.cTotal}>{fmt(item.product.base_price * item.quantity)}</Text>
            <TouchableOpacity onPress={() => removeItem(item.product.id)}><Text style={{ color: '#dc2626', fontSize: 18, paddingLeft: 8 }}>✕</Text></TouchableOpacity>
          </View>
        )} />
      <View style={s.footer}>
        <View style={s.totalRow}><Text style={s.totalLabel}>{t('pos_total')}</Text><Text style={s.totalAmt}>{fmt(total)}</Text></View>
        <View style={s.payRow}>{['cash', 'card', 'mobile'].map(m => (
          <TouchableOpacity key={m} style={[s.payBtn, payMethod === m && s.payActive]} onPress={() => setPayMethod(m)}>
            <Text style={[s.payText, payMethod === m && { color: '#fff', fontWeight: '600' }]}>{payLabels[m]}</Text>
          </TouchableOpacity>
        ))}</View>
        <TouchableOpacity style={[s.checkoutBtn, cart.length === 0 && { opacity: 0.4 }]} onPress={initiateCheckout} disabled={cart.length === 0 || completing}>
          <Text style={s.checkoutText}>{completing ? t('pos_processing') : `${t('pos_complete')} — ${fmt(total)}`}</Text>
        </TouchableOpacity>
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => router.push('/sales')}><Text style={s.navLink}>📋 {t('sales_title')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/shifts')}><Text style={s.navLink}>🕐 {t('shift_title')}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')}><Text style={s.navLink}>⚙️ {t('settings_title')}</Text></TouchableOpacity>
        </View>
      </View>

      {/* Cash tendered modal */}
      <Modal visible={showTender} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t('checkout_tendered')}</Text>
            <Text style={s.modalTotal}>{t('pos_total')}: {fmt(total)}</Text>
            <TextInput style={s.modalInput} value={tendered} onChangeText={setTendered}
              keyboardType="numeric" placeholder="0" autoFocus />
            {tenderedNum > 0 && (
              <View style={s.changeRow}>
                <Text style={s.changeLabel}>{t('checkout_change')}</Text>
                <Text style={[s.changeAmount, changeDue > 0 ? { color: '#059669' } : { color: '#dc2626' }]}>{fmt(changeDue)}</Text>
              </View>
            )}
            {tenderedNum > 0 && tenderedNum < total && (
              <Text style={s.changeWarn}>⚠ Amount is less than total</Text>
            )}
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowTender(false)}>
                <Text style={s.modalCancelText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirm, tenderedNum < total && { opacity: 0.4 }]}
                onPress={doCheckout} disabled={tenderedNum < total}>
                <Text style={s.modalConfirmText}>{t('pos_complete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  searchRow: { flexDirection: 'row', padding: 12, gap: 8 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 14, fontSize: 16, backgroundColor: '#fff' },
  scanBtn: { width: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db' },
  results: { marginHorizontal: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', maxHeight: 200 },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rName: { fontSize: 15, fontWeight: '500' }, rSku: { fontSize: 12, color: '#9ca3af' }, rPrice: { fontSize: 15, fontWeight: '700', color: '#059669' },
  cart: { flex: 1, paddingHorizontal: 12 }, empty: { textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 15 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 6, gap: 8 },
  cName: { fontSize: 14, fontWeight: '500' }, cPrice: { fontSize: 12, color: '#6b7280' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: 16, fontWeight: '600', width: 24, textAlign: 'center' },
  cTotal: { fontSize: 14, fontWeight: '600', width: 70, textAlign: 'right' },
  footer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb', padding: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontSize: 18, fontWeight: '600' }, totalAmt: { fontSize: 22, fontWeight: '700' },
  payRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  payBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  payActive: { backgroundColor: '#059669', borderColor: '#059669' }, payText: { fontSize: 14, color: '#374151' },
  checkoutBtn: { backgroundColor: '#059669', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 8 },
  checkoutText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  navRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingTop: 4 }, navLink: { fontSize: 14, color: '#6b7280' },
  // Tender modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalTotal: { fontSize: 15, color: '#6b7280', marginBottom: 16 },
  modalInput: { borderWidth: 2, borderColor: '#059669', borderRadius: 10, padding: 16, fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  changeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  changeLabel: { fontSize: 16, fontWeight: '600' },
  changeAmount: { fontSize: 28, fontWeight: '800' },
  changeWarn: { color: '#d97706', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 12 },
  modalCancel: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: '#6b7280' },
  modalConfirm: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#059669', alignItems: 'center' },
  modalConfirmText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
