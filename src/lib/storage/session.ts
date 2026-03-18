import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '../../types/models';

const SESSION_KEY = 'shelfer_session';
const BRANCH_KEY = 'shelfer_branch';
const QUEUED_SALES_KEY = 'shelfer_queued_sales';

export async function saveSession(session: Session): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([SESSION_KEY, BRANCH_KEY, QUEUED_SALES_KEY]);
}

export async function saveBranch(branchId: string, branchName: string): Promise<void> {
  await AsyncStorage.setItem(BRANCH_KEY, JSON.stringify({ branchId, branchName }));
  const session = await getSession();
  if (session) {
    session.branchId = branchId;
    session.branchName = branchName;
    await saveSession(session);
  }
}

export async function getBranch(): Promise<{ branchId: string; branchName: string } | null> {
  const raw = await AsyncStorage.getItem(BRANCH_KEY);
  return raw ? JSON.parse(raw) : null;
}

// Queued sales for offline
interface QueuedSale {
  id: string;
  payload: unknown;
  createdAt: string;
  receiptPhone?: string;
}

export async function getQueuedSales(): Promise<QueuedSale[]> {
  const raw = await AsyncStorage.getItem(QUEUED_SALES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addQueuedSale(sale: QueuedSale): Promise<void> {
  const sales = await getQueuedSales();
  sales.push(sale);
  await AsyncStorage.setItem(QUEUED_SALES_KEY, JSON.stringify(sales));
}

export async function removeQueuedSale(id: string): Promise<void> {
  const sales = await getQueuedSales();
  await AsyncStorage.setItem(QUEUED_SALES_KEY, JSON.stringify(sales.filter(s => s.id !== id)));
}
