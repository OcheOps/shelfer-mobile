import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { productsApi } from '../src/lib/api/endpoints';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [status, setStatus] = useState('');

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setStatus(`Scanned: ${data}`);

    try {
      const res = await productsApi.getByBarcode(data);
      const products = res.data || [];
      if (products.length > 0) {
        setStatus(`Found: ${products[0].name}`);
        setTimeout(() => router.back(), 500);
      } else {
        setStatus(`No product found for barcode: ${data}`);
        setTimeout(() => setScanned(false), 2000);
      }
    } catch {
      setStatus('Search failed — try again');
      setTimeout(() => setScanned(false), 2000);
    }
  };

  if (!permission) return <View style={styles.center}><Text>Requesting camera...</Text></View>;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access needed for barcode scanning</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
      />
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>{status || 'Point camera at barcode'}</Text>
      </View>
      <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeBtnText}>✕ Close</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  camera: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  frame: { width: 250, height: 250, borderWidth: 2, borderColor: '#059669', borderRadius: 12 },
  hint: { color: '#fff', fontSize: 14, marginTop: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  closeBtn: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  permText: { fontSize: 16, textAlign: 'center', marginBottom: 16, color: '#374151' },
  permBtn: { backgroundColor: '#059669', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
