/**
 * IndexedDB Persistence for Offline PWA Support
 * Manages pending offline CRDT operations queue and board snapshots.
 */

const DB_NAME = 'boardcollab_offline_db';
const DB_VERSION = 1;
const STORE_OPS = 'pending_ops';
const STORE_SNAPSHOTS = 'board_snapshots';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_OPS)) {
        db.createObjectStore(STORE_OPS, { keyPath: 'opId' });
      }
      if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
        db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'roomId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save an offline operation into IndexedDB
 */
export async function saveOfflineOp(op: any): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OPS, 'readwrite');
      const store = tx.objectStore(STORE_OPS);
      const req = store.put(op);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to save offline op:', err);
  }
}

/**
 * Retrieve all queued offline operations
 */
export async function getOfflineOps(): Promise<any[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OPS, 'readonly');
      const store = tx.objectStore(STORE_OPS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to get offline ops:', err);
    return [];
  }
}

/**
 * Remove a single offline operation once acknowledged
 */
export async function removeOfflineOp(opId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OPS, 'readwrite');
      const store = tx.objectStore(STORE_OPS);
      const req = store.delete(opId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to delete offline op:', err);
  }
}

/**
 * Clear all offline ops after bulk replay
 */
export async function clearOfflineOps(): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OPS, 'readwrite');
      const store = tx.objectStore(STORE_OPS);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to clear offline ops:', err);
  }
}

/**
 * Cache the latest snapshot of a room's whiteboard elements
 */
export async function saveBoardSnapshot(roomId: string, elements: any[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readwrite');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.put({
        roomId,
        elements,
        updatedAt: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to save board snapshot:', err);
  }
}

/**
 * Load the cached whiteboard snapshot for a room when opening while offline
 */
export async function getBoardSnapshot(roomId: string): Promise<any[] | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SNAPSHOTS, 'readonly');
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.get(roomId);
      req.onsuccess = () => {
        resolve(req.result ? req.result.elements : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to load board snapshot:', err);
    return null;
  }
}
