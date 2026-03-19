import { api } from '../api/client';
import { getSession, saveSession } from '../storage/session';
import { getMeta, setMeta } from '../storage/db';

const APP_VERSION = '1.0.0';

export async function ensureDeviceRegistered(): Promise<string> {
  const existingId = await getMeta('device_id');
  if (existingId && existingId !== '' && existingId !== 'undefined') return existingId;

  const session = await getSession();
  if (!session?.branchId) throw new Error('No branch selected');

  const deviceCode = `MOB-${session.userId.slice(0, 8)}`;

  const res: any = await api.post('/devices/register', {
    branch_id: session.branchId,
    device_code: deviceCode,
    app_version: APP_VERSION,
  });

  // fetch client returns JSON directly: { data: { id: "..." } }
  const deviceId = res?.data?.id;
  if (!deviceId) throw new Error('Device registration failed');

  await setMeta('device_id', deviceId);
  await setMeta('device_code', deviceCode);
  await setMeta('device_registered_at', new Date().toISOString());

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
  await setMeta('device_id', '');
  await setMeta('device_code', '');
  await setMeta('device_registered_at', '');
}
