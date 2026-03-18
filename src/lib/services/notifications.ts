import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

let initialized = false;

export async function initNotifications(): Promise<void> {
  if (initialized) return;
  initialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Device.isDevice) {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('sync', {
      name: 'Sync',
      importance: Notifications.AndroidImportance.LOW,
    });
  }
}

export async function notifySyncComplete(count: number): Promise<void> {
  if (count <= 0) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sales synced',
      body: `${count} sale${count > 1 ? 's' : ''} synced to cloud`,
      data: { type: 'sync' },
    },
    trigger: null,
  });
}

export async function notifyReceiptSent(phone: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Receipt sent',
      body: `WhatsApp receipt sent to ${phone}`,
      data: { type: 'receipt' },
    },
    trigger: null,
  });
}

export async function notifySyncError(failedCount: number): Promise<void> {
  if (failedCount <= 0) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sync issue',
      body: `${failedCount} sale${failedCount > 1 ? 's' : ''} failed to sync`,
      data: { type: 'sync_error' },
    },
    trigger: null,
  });
}

/**
 * Schedule a daily summary reminder at the specified hour (local time).
 * Call once after login. Cancels previous scheduled summaries first.
 */
export async function scheduleDailySummary(hour = 20, minute = 0): Promise<void> {
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of existing) {
    if (n.content.data?.type === 'daily_summary') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Daily Summary',
      body: 'Check your sales summary for today',
      data: { type: 'daily_summary' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}
