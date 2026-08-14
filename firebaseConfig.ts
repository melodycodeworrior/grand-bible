import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import type { Persistence } from "firebase/auth";
import { getAuth, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore/lite";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyC_1dO1u-12lP1M0zqs1mEvlKWeLIRFklY",
  authDomain: "grandbook-89484.firebaseapp.com",
  projectId: "grandbook-89484",
  storageBucket: "grandbook-89484.firebasestorage.app",
  messagingSenderId: "759450468821",
  appId: "1:759450468821:web:d839eb08aecb3e2350fd5c",
};

export const firebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

type NativeAuthModule = {
  getReactNativePersistence(storage: typeof AsyncStorage): Persistence;
};
const nativeAuthModule =
  Platform.OS === "web" ? null : (require("firebase/auth") as NativeAuthModule);

// `initializeAuth` may run more than once during Fast Refresh. Reuse the
// existing Auth instance in that case so the app does not stop at launch.
function createAuth() {
  if (Platform.OS === "web") return getAuth(firebaseApp);

  try {
    return initializeAuth(firebaseApp, {
      persistence: nativeAuthModule!.getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

export const auth = createAuth();

// Firestore Lite uses REST instead of the full SDK's persistent WebChannel.
// That is a better fit for Expo Go because this app only uses reads and writes,
// not live snapshot listeners or Firestore's managed offline cache.
export const db = getFirestore(firebaseApp);
/** Firestore document stored at `users/{uid}` for every authenticated reader. */
export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: string[];
  createdAt: unknown;
  updatedAt?: unknown;
};

/** Backward-compatible name for the user document model. */
export type UserProfile = User;
export type GrandSearchResult = {
  book: string;
  chapter_no: number;
  chapter_title: string;
  sentence_no: number;
  sentense_detail: string;
};
export type GrandSearch = {
  term: string;
  generatedFrom: string;
  generatedAt: string | null;
  /** Original JSON metadata, retained verbatim in Firestore. */
  generated_from: string;
  generated_at: string | null;
  resultCount: number;
  results: GrandSearchResult[];
  updatedAt?: unknown;
};
