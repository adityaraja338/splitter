import { initializeApp } from 'firebase/app';
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';

const env = import.meta.env;
const useEmulator = env.VITE_USE_EMULATOR === 'true';

// Firebase web config is public by design (it ships in the bundle); Firestore rules protect the data.
// Any VITE_FIREBASE_* env var overrides these defaults, e.g. to point at a different project.
const config = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyD75wHBAi4vTodKceXttByqdLWqMPa8mN4',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'splitter-61a04.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || (useEmulator ? 'demo-splitter' : 'splitter-61a04'),
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'splitter-61a04.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '523496592517',
  appId: env.VITE_FIREBASE_APP_ID || '1:523496592517:web:d2e8ffcf2696262fb045ec',
};

export const isConfigured = Boolean(config.projectId);

const app = initializeApp(config);

let firestore;
try {
  // Offline cache so the trip still opens without network; syncs when back online.
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    // Plain HTTP long-polling instead of a streaming connection: slightly slower, but works on
    // mobile networks, proxies and antivirus software that silently break streaming.
    experimentalForceLongPolling: true,
  });
} catch {
  firestore = initializeFirestore(app, { experimentalForceLongPolling: true });
}
if (useEmulator) {
  connectFirestoreEmulator(firestore, '127.0.0.1', Number(env.VITE_EMULATOR_PORT || 8080));
}

export const db = firestore;
