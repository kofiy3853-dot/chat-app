import { openDB } from 'idb';

const DB_NAME = 'campus_chat_db';
const DB_VERSION = 2; // Incremented for new 'auth' store

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            // Existing stores
            if (!db.objectStoreNames.contains('conversations')) {
                db.createObjectStore('conversations', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('messages')) {
                const store = db.createObjectStore('messages', { keyPath: 'id' });
                store.createIndex('conversationId', 'conversationId');
            }
            if (!db.objectStoreNames.contains('outbox')) {
                db.createObjectStore('outbox', { keyPath: 'tempId' });
            }
            
            // New store for auth token needed by Service Worker for background sync
            if (!db.objectStoreNames.contains('auth')) {
                db.createObjectStore('auth'); // generic keys like 'current'
            }
        },
    });
};

export const cacheMessages = async (conversationId, messages) => {
    const db = await initDB();
    const tx = db.transaction('messages', 'readwrite');
    for (const msg of messages) {
        await tx.store.put(msg);
    }
    await tx.done;
};

export const getCachedMessages = async (conversationId) => {
    const db = await initDB();
    return db.getAllFromIndex('messages', 'conversationId', conversationId);
};

export const queueMessage = async (message) => {
    const db = await initDB();
    return db.put('outbox', message);
};

export const getOutboxMessages = async () => {
    const db = await initDB();
    return db.getAll('outbox');
};

export const removeFromOutbox = async (tempId) => {
    const db = await initDB();
    return db.delete('outbox', tempId);
};

export const saveAuthToken = async (token) => {
    const db = await initDB();
    return db.put('auth', { token }, 'current');
};

export const getAuthToken = async () => {
    const db = await initDB();
    const data = await db.get('auth', 'current');
    return data?.token;
};
