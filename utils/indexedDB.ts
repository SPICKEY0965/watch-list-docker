import { Contents } from '@/components/types';

export async function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('WatchListDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            db.createObjectStore('contents', { keyPath: 'content_id' });
        };
    });
}

export async function storeDataInIndexedDB(db: IDBDatabase, data: Contents[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('contents', 'readwrite');
        const store = transaction.objectStore('contents');
        data.forEach(item => store.put(item));
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

export async function getDataFromIndexedDB(db: IDBDatabase): Promise<Contents[]> {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('contents', 'readonly');
        const store = transaction.objectStore('contents');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}
