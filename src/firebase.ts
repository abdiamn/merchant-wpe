import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Merchant } from './types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID if provided
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Collection reference
const MERCHANTS_COLLECTION = 'merchants';

/**
 * Test connectivity with Firestore server
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    // If doc not found, server reached and responded => connection is alive
    if (error?.code === 'not-found') {
      return true;
    }
    console.warn('Firestore connection check:', error);
    return false;
  }
}

/**
 * Fetch all merchants from Firestore
 */
export async function fetchMerchantsFromDb(): Promise<Merchant[]> {
  const querySnapshot = await getDocs(collection(db, MERCHANTS_COLLECTION));
  const list: Merchant[] = [];
  querySnapshot.forEach((document) => {
    const data = document.data();
    list.push({
      id: document.id,
      name: data.name || '',
      address: data.address || '',
      lat: typeof data.lat === 'number' ? data.lat : 0,
      lng: typeof data.lng === 'number' ? data.lng : 0,
      phone: data.phone || '',
      notes: data.notes || '',
      createdAt: data.createdAt || ''
    });
  });
  return list;
}

/**
 * Save or update a single merchant in Firestore
 */
export async function saveMerchantToDb(merchant: Merchant): Promise<void> {
  const docRef = doc(db, MERCHANTS_COLLECTION, merchant.id);
  await setDoc(docRef, {
    name: merchant.name,
    address: merchant.address || '',
    lat: merchant.lat,
    lng: merchant.lng,
    phone: merchant.phone || '',
    notes: merchant.notes || '',
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

/**
 * Delete a merchant from Firestore
 */
export async function deleteMerchantFromDb(id: string): Promise<void> {
  await deleteDoc(doc(db, MERCHANTS_COLLECTION, id));
}

/**
 * Batch save multiple merchants to Firestore (supports chunking for >500 items)
 */
export async function batchSaveMerchantsToDb(merchants: Merchant[]): Promise<number> {
  const chunkSize = 450; // Firestore batch limit is 500
  let savedCount = 0;

  for (let i = 0; i < merchants.length; i += chunkSize) {
    const chunk = merchants.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach(m => {
      const docRef = doc(db, MERCHANTS_COLLECTION, m.id);
      batch.set(docRef, {
        name: m.name,
        address: m.address || '',
        lat: m.lat,
        lng: m.lng,
        phone: m.phone || '',
        notes: m.notes || '',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });

    await batch.commit();
    savedCount += chunk.length;
  }

  return savedCount;
}

/**
 * Update single merchant coordinates (e.g. after address mapping)
 */
export async function updateMerchantCoordinates(id: string, lat: number, lng: number): Promise<void> {
  const docRef = doc(db, MERCHANTS_COLLECTION, id);
  await setDoc(docRef, {
    lat,
    lng,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}
