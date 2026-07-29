import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function parseServiceAccount(): FirebaseServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
  } catch {
    // Some secret stores export CSV-escaped JSON as "{""key"":""value""}".
    try {
      const unwrapped =
        raw.startsWith('"{') && raw.endsWith('}"') ? raw.slice(1, -1) : raw;
      parsed = JSON.parse(unwrapped.replaceAll('""', '"'));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }

  const value = parsed as Partial<FirebaseServiceAccount>;
  if (!value.project_id || !value.client_email || !value.private_key) {
    throw new Error('Firebase service account is missing required fields');
  }
  if (value.project_id !== 'sahara-6800a') {
    throw new Error(`Refusing unexpected Firebase project: ${value.project_id}`);
  }

  return value as FirebaseServiceAccount;
}

export function getSaharaFirebaseAdmin(): App {
  const existing = getApps().find((app) => app.name === 'sahara-customerio');
  if (existing) return existing;
  return initializeApp(
    { credential: cert(parseServiceAccount()) },
    'sahara-customerio'
  );
}

export function getSaharaFirebaseAuth() {
  return getAuth(getSaharaFirebaseAdmin());
}

export function getSaharaFirestore() {
  return getFirestore(getSaharaFirebaseAdmin());
}
