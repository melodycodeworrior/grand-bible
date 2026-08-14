import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore/lite';
import { auth, db, GrandSearch, GrandSearchResult } from '@/config/firebase';
const searchData = require('../../../assets/json/grand_search.json') as { generated_from: string; generated_at?: string; results: Record<string, GrandSearchResult[]> };
const documentId = (term: string) => encodeURIComponent(term);

function requireSignedInUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before saving Grand Search data to Firestore.');
  return user;
}

async function prepareFirestoreWrite() {
  // Ensure the auth token is available before the first write after a native
  // sign-in. This avoids an intermittent permission-denied response on Expo.
  await requireSignedInUser().getIdToken();
}

export async function getGrandSearchResults(term: string): Promise<GrandSearchResult[]> {
  await prepareFirestoreWrite();
  const snapshot = await getDoc(doc(db, 'grandSearch', documentId(term)));
  return snapshot.exists() ? ((snapshot.data() as GrandSearch).results ?? []) : [];
}
export async function saveGrandSearchEntry(term: string, results: GrandSearchResult[]) {
  await prepareFirestoreWrite();
  const generatedAt = new Date().toISOString();
  const data: GrandSearch = { term, generatedFrom: 'grand_with_chapters.json', generatedAt, generated_from: 'grand_with_chapters.json', generated_at: generatedAt, resultCount: results.length, results };
  await setDoc(doc(db, 'grandSearch', documentId(term)), { ...data, updatedAt: serverTimestamp() });
}
export async function seedGrandSearchData(onProgress?: (percent: number) => void) {
  await prepareFirestoreWrite();
  const entries = Object.entries(searchData.results);
  // Firestore permits up to 500 writes in a batch. Every generated document is
  // below its 1 MiB document limit.
  for (let start = 0; start < entries.length; start += 450) {
    const batch = writeBatch(db);
    entries.slice(start, start + 450).forEach(([term, results]) => {
      const data: GrandSearch = { term, generatedFrom: searchData.generated_from, generatedAt: searchData.generated_at ?? null, generated_from: searchData.generated_from, generated_at: searchData.generated_at ?? null, resultCount: results.length, results };
      batch.set(doc(db, 'grandSearch', documentId(term)), { ...data, updatedAt: serverTimestamp() });
    });
    await batch.commit();
    onProgress?.(Math.round((Math.min(start + 450, entries.length) / entries.length) * 100));
  }
}

/** Stores every term and every result from assets/json/grand_search.json once. */
export async function ensureGrandSearchSeeded(): Promise<{ seeded: boolean; termCount: number }> {
  await prepareFirestoreWrite();
  const seedRef = doc(db, 'appData', 'grandSearchSeed');
  const seed = await getDoc(seedRef);
  const termCount = Object.keys(searchData.results).length;
  if (seed.exists()) return { seeded: false, termCount };
  await seedGrandSearchData();
  // This marker is written last, so a failed import can be safely retried.
  await setDoc(seedRef, { source: 'assets/json/grand_search.json', generated_from: searchData.generated_from, generated_at: searchData.generated_at ?? null, termCount, seededAt: serverTimestamp() });
  return { seeded: true, termCount };
}
