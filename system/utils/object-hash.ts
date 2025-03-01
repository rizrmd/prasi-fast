import stableHash from "stable-hash";
import { api } from "frontend/src/lib/generated/api";

const DB_NAME = "objectHashDB";
const STORE_NAME = "hashStore";
const savedHashes = new Set<String>();

let db: IDBDatabase | null = null;

const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (db) return resolve();

    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const generateHash = async (
  obj: Record<string, any>
): Promise<string> => {
  const hashValue = stableHash(obj);
  const finalHash = hash33(hashValue);
  const hashStr = finalHash + "";

  if (hashStr === "2903276304") throw new Error("asda");
  try {
    await initDB();
    const transaction = db!.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await new Promise((resolve, reject) => {
      const request = store.put(obj, hashStr);
      request.onsuccess = () => resolve(undefined);
      request.onerror = () => reject(request.error);
    });

    if (!savedHashes.has(hashStr)) {
      savedHashes.add(hashStr);
      api.objectHash(hashStr, obj);
    }
  } catch (error) {
    console.error("Error storing hash:", error);
  }

  return hashStr;
};

export const loadHash = async (hashStr: string): Promise<any> => {
  try {
    await initDB();
    const transaction = db!.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const localResult = await new Promise((resolve, reject) => {
      const request = store.get(hashStr);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (localResult) {
      return localResult;
    }

    // Fallback to API if not found in IndexedDB
    const apiResult = await api.objectHash(hashStr);
    if (apiResult) {
      // Store the API result in IndexedDB for future use
      const transaction = db!.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      await new Promise((resolve, reject) => {
        const request = store.put(apiResult, hashStr);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
      return apiResult;
    }

    return null;
  } catch (error) {
    console.error("Error loading hash:", error);
    return null;
  }
};

function hash33(text: string) {
  var hash = 5381,
    index = text.length;

  while (index) {
    hash = (hash * 33) ^ text.charCodeAt(--index);
  }

  return hash >>> 0;
}
