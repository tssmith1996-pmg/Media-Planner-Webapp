import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

export type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
};

let services: FirebaseServices | undefined;
let appCheckInitialized = false;

function readConfig() {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const senderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

  if (!projectId || !appId || !apiKey) {
    throw new Error('Missing Firebase configuration. Ensure VITE_FIREBASE_* env vars are defined.');
  }

  return {
    apiKey,
    appId,
    projectId,
    authDomain,
    storageBucket,
    messagingSenderId: senderId,
    measurementId,
  } satisfies Parameters<typeof initializeApp>[0];
}

function maybeConnectEmulators(app: FirebaseApp, auth: Auth, firestore: Firestore, storage: FirebaseStorage, functions: Functions) {
  const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST;
  const authPort = import.meta.env.VITE_FIREBASE_AUTH_PORT;
  const firestorePort = import.meta.env.VITE_FIREBASE_FIRESTORE_PORT;
  const storagePort = import.meta.env.VITE_FIREBASE_STORAGE_PORT;
  const functionsPort = import.meta.env.VITE_FIREBASE_FUNCTIONS_PORT;

  if (!host) return;

  if (authPort) {
    connectAuthEmulator(auth, `http://${host}:${authPort}`, { disableWarnings: true });
  }
  if (firestorePort) {
    connectFirestoreEmulator(firestore, host, Number.parseInt(firestorePort, 10));
  }
  if (storagePort) {
    connectStorageEmulator(storage, host, Number.parseInt(storagePort, 10));
  }
  if (functionsPort) {
    connectFunctionsEmulator(functions, host, Number.parseInt(functionsPort, 10));
  }

  const appCheckDebugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (appCheckDebugToken && typeof window !== 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = appCheckDebugToken;
  }

  if (appCheckInitialized || !import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY) return;

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
  appCheckInitialized = true;
}

export function getFirebaseServices(): FirebaseServices {
  if (services) return services;

  const config = readConfig();
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(config);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);
  const functions = getFunctions(app);

  if (import.meta.env.MODE !== 'production') {
    maybeConnectEmulators(app, auth, firestore, storage, functions);
  } else {
    const siteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
    if (!siteKey) {
      console.warn('App Check site key missing. Production deployments must configure VITE_FIREBASE_APPCHECK_SITE_KEY.');
    } else {
      if (!appCheckInitialized) {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
        appCheckInitialized = true;
      }
    }
  }

  services = { app, auth, firestore, storage, functions };
  return services;
}
