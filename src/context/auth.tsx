import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { auth, db } from '../../firebaseConfig';
import { ensureGrandSearchSeeded } from '@/services/grand-search';
type AuthValue = { user: User | null; loading: boolean; logout: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMessage = (text: string, error = false) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage({ text, error });
    messageTimer.current = setTimeout(() => setMessage(null), 4200);
  };
  useEffect(() => () => { if (messageTimer.current) clearTimeout(messageTimer.current); }, []);
  useEffect(() => onAuthStateChanged(auth, async (next) => {
    setUser(next); setLoading(false);
    if (!next) return;
    try {
      const userData = {
        uid: next.uid,
        email: next.email,
        displayName: next.displayName,
        photoURL: next.photoURL,
        providerIds: next.providerData.map((provider) => provider.providerId),
        // Kept with the user document for a complete audit model. `merge` retains
        // the original value after the first sign-in.
      };
      await setDoc(doc(db, 'users', next.uid), { ...userData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
      const seed = await ensureGrandSearchSeeded();
      showMessage(seed.seeded ? `Firestore: GrandSearch saved (${seed.termCount} terms)` : 'Firestore: GrandSearch is ready');
    } catch (error) {
      // The in-app snackbar reports this; console.warn triggers Expo Go's overlay.
      console.log('Firestore profile/search seed could not be saved:', error);
      const code = (error as { code?: string }).code ?? 'unknown-error';
      const detail = error instanceof Error ? error.message : String(error);
      showMessage(`Firestore save failed (${code}): ${detail}`, true);
    }
  }), []);
  return <AuthContext.Provider value={{ user, loading, logout: () => signOut(auth) }}>{children}{message && <View pointerEvents="none" style={[s.snackbar, message.error && s.snackbarError]}><Text style={s.snackbarText}>{message.text}</Text></View>}</AuthContext.Provider>;
}
export const useAuth = () => { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; };
const s = StyleSheet.create({ snackbar: { position: 'absolute', left: 20, right: 20, bottom: 28, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 12, backgroundColor: '#245D35', elevation: 8, shadowColor: '#000', shadowOpacity: .22, shadowRadius: 10 }, snackbarError: { backgroundColor: '#A32D2D' }, snackbarText: { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center' } });
