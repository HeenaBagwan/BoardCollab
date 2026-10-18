import { Op } from '../types';
import { saveOfflineOp, removeOfflineOp as removeIdbOp, clearOfflineOps } from './indexedDb';

const STORAGE_KEY = 'boardcollab_offline_ops';

export function getOfflineQueue(): Op[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineOp(op: Op) {
  try {
    const queue = getOfflineQueue();
    queue.push(op);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    // Asynchronously mirror to IndexedDB
    saveOfflineOp(op).catch(() => {});
  } catch (err) {
    console.warn('Failed to save offline op to localStorage', err);
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(STORAGE_KEY);
  clearOfflineOps().catch(() => {});
}

export function removeOfflineOp(opId: string) {
  try {
    const queue = getOfflineQueue().filter(op => op.opId !== opId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    removeIdbOp(opId).catch(() => {});
  } catch {}
}
