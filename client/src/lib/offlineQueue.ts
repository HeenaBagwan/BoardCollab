import { Op } from '../types';

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
  } catch (err) {
    console.warn('Failed to save offline op to localStorage', err);
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(STORAGE_KEY);
}

export function removeOfflineOp(opId: string) {
  try {
    const queue = getOfflineQueue().filter(op => op.opId !== opId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {}
}
