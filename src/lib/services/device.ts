import { api } from '../api/client';
import { getSession, saveSession } from '../storage/session';
import { getMeta, setMeta } from '../storage/db';
import type { ApiSuccess } from '../../types/api';

const APP_VERSION = '1.0.0';

/**
 * Register device with backend if not already registered.
 * Returns device ID.
 */
export async function ensureDeviceRegistered(): Promise<string> {
  // Check if already registered
  const existingId = await getMeta('device_id');
  if (existingId) return existingId;

  const session = await getSession();
  if (!session?.branchId) throw new Error('No branch selected');

  const deviceCode = `MOB-${session.userId.slice(0, 8)}`;

  const res = await api.post<ApiSuccess<{ id: string }>>('/devices/register', {
    branch_id: session.branchId,
    device_code: deviceCode,
    app_version: APP_VERSION,
  });

  const deviceId = res.data.id;

  // Persist
  await setMeta('device_id', deviceId);
  await setMeta('device_code', deviceCode);
  await setMeta('device_registered_at', new Date().toISOString());

  // Update session
  session.deviceId = deviceId;
  session.deviceCode = deviceCode;
  await saveSession(session);

  return deviceId;
}

export async function getDeviceInfo(): Promise<{ id: string | null; code: string | null; registeredAt: string | null }> {
  return {
    id: await getMeta('device_id'),
    code: await getMeta('device_code'),
    registeredAt: await getMeta('device_registered_at'),
  };
}

export async function clearDeviceRegistration(): Promise<void> {
  const { setMeta } = await import('../storage/db');
  await setMeta('device_id', '');
  await setMeta('device_code', '');
}
