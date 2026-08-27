import { doc, serverTimestamp, setDoc } from 'firebase/firestore/lite';
import { auth, db } from '@/config/firebase';
import type { Category, SpiritualEntitiesMetadata } from '@/core/models';

function requireSignedInUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before saving app data to Firestore.');
  return user;
}

/** Stores editable Discover metadata outside the grandSearch term collection. */
export async function saveSpiritualEntities(categories: Category[], metadata: SpiritualEntitiesMetadata) {
  await requireSignedInUser().getIdToken();
  await setDoc(doc(db, 'appData', 'spiritualEntities'), {
    categories,
    metadata,
    updatedAt: serverTimestamp(),
  });
}
