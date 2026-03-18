import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { authApi } from '../src/lib/api/endpoints';
import { saveSession } from '../src/lib/storage/session';

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(atob(base64));
  } catch { return null; }
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Email and password required'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { access_token, refresh_token } = res.data;
      const payload = decodeJwt(access_token);

      await saveSession({
        accessToken: access_token,
        refreshToken: refresh_token,
        userId: (payload?.sub as string) || '',
        role: (payload?.role as string) || '',
        tenantId: (payload?.tenant_id as string) || '',
      });

      router.replace('/branch-select');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.card}>
        <Text style={styles.brand}>Shelfer POS</Text>
        <Text style={styles.subtitle}>Sign in to start selling</Text>

        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword}
          secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handleLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f9fafb' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  brand: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 12, backgroundColor: '#fff' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  btn: { backgroundColor: '#059669', borderRadius: 8, padding: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
