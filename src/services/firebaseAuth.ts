import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

// Standard provider for general authentication (no sensitive scopes, no 403 blocks)
const baseProvider = new GoogleAuthProvider();

// Dedicated provider requesting Google Sheets & Drive permissions
const sheetsProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => sheetsProvider.addScope(scope));

const TOKEN_STORAGE_KEY = 'water_monitoring_google_token';

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
})();

export const initAuth = (
  onAuthChange: (user: User | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        try {
          cachedAccessToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
        } catch {
          cachedAccessToken = null;
        }
      }
      onAuthChange(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {}
      onAuthChange(null, null);
    }
  });
};

/**
 * Standard Google Sign-In for all users.
 * Does not require sensitive scopes, ensuring any Google account (supervisors & operators)
 * can log in without encountering Google OAuth 403 access_denied in Testing mode.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, baseProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;

    if (token) {
      cachedAccessToken = token;
      try {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
      } catch {}
    }

    return { user: result.user, accessToken: token };
  } catch (error: unknown) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Explicit authorization request for Google Sheets & Google Drive access.
 */
export const requestGoogleSheetsAccess = async (): Promise<string | null> => {
  try {
    const result = await signInWithPopup(auth, sheetsProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Sheets.');
    }
    cachedAccessToken = credential.accessToken;
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, cachedAccessToken);
    } catch {}
    return cachedAccessToken;
  } catch (error: unknown) {
    console.error('Sheets authorization error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {}
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {}
};
