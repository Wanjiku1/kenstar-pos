import { openDB } from 'idb';

const DB_NAME = 'kenstar_terminal_offline_v2';
const STORE_NAME = 'pending_attendance';

export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

// --- ATTENDANCE SPECIFIC EXPORTS ---

export const saveAttendanceOffline = async (data: any) => {
  const db = await initDB();
  return db.add(STORE_NAME, {
    ...data,
    timestamp: new Date().toISOString(),
    status: 'offline_pending'
  });
};

export const getOfflineAttendance = async () => {
  const db = await initDB();
  return db.getAll(STORE_NAME);
};

export const removeSyncedAttendance = async (id: number) => {
  const db = await initDB();
  return db.delete(STORE_NAME, id);
};