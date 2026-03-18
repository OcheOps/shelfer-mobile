import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../lib/network/status';
import { t } from '../lib/i18n';

export function NetworkBanner() {
  const network = useNetworkStatus();
  if (network === 'online') return null;

  return (
    <View style={[styles.banner, network === 'offline' ? styles.offline : styles.poor]}>
      <Text style={styles.text}>
        {network === 'offline' ? t('pos_offline') : t('pos_slow')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingVertical: 6, alignItems: 'center' },
  offline: { backgroundColor: '#fef2f2' },
  poor: { backgroundColor: '#fffbeb' },
  text: { fontSize: 12, fontWeight: '600', color: '#374151' },
});
