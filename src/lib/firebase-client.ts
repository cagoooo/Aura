"use client";

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithPopup, signOut as fbSignOut,
  GoogleAuthProvider, type User, type Auth,
} from 'firebase/auth';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, query, where, orderBy, limit,
  serverTimestamp, onSnapshot, getDocs,
  type Firestore, type DocumentData, type QueryDocumentSnapshot, type Unsubscribe,
} from 'firebase/firestore';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FB_APP_ID,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function isFirebaseClientConfigured(): boolean {
  return !!(config.apiKey && config.authDomain && config.projectId && config.appId);
}

function ensureApp(): FirebaseApp {
  if (_app) return _app;
  if (!isFirebaseClientConfigured()) {
    throw new Error('Firebase Web SDK config missing. Set NEXT_PUBLIC_FB_* env vars.');
  }
  _app = getApps().length ? getApps()[0]! : initializeApp(config as any);
  return _app;
}

export function getFbAuth(): Auth {
  if (!_auth) _auth = getAuth(ensureApp());
  return _auth;
}

export function getDb(): Firestore {
  if (!_db) _db = getFirestore(ensureApp());
  return _db;
}

// ─── Auth helpers ────────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<User> {
  const auth = getFbAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut(): Promise<void> {
  await fbSignOut(getFbAuth());
}

export function onAuthChange(cb: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(getFbAuth(), cb);
}

// ─── Draft (auto-saved current 6 W1H state) ──────────────────────────────
// Singleton doc: users/{uid}/private/draft
export interface DraftDoc {
  w1h: { who: string; what: string; when: string; where: string; why: string; how: string };
  locks: { who: boolean; what: boolean; when: boolean; where: boolean; why: boolean; how: boolean };
  updatedAt?: any;
}

const DRAFT_DOC = (uid: string) => doc(getDb(), 'users', uid, 'private', 'draft');

export async function loadDraft(uid: string): Promise<DraftDoc | null> {
  const snap = await getDoc(DRAFT_DOC(uid));
  return snap.exists() ? (snap.data() as DraftDoc) : null;
}

export async function saveDraft(uid: string, d: Omit<DraftDoc, 'updatedAt'>): Promise<void> {
  await setDoc(DRAFT_DOC(uid), { ...d, updatedAt: serverTimestamp() });
}

// ─── Personal Story Library ──────────────────────────────────────────────
// Each saved story: users/{uid}/stories/{id}
export interface SavedStory {
  id: string;
  title: string;
  story: string;
  w1h: { who: string; what: string; when: string; where: string; why: string; how: string };
  createdAt?: any;  // Firestore Timestamp
  // Optional link to public share
  publicShareId?: string;
}

const STORIES_COL = (uid: string) => collection(getDb(), 'users', uid, 'stories');

export async function saveStoryToLibrary(
  uid: string,
  story: Omit<SavedStory, 'id' | 'createdAt'>
): Promise<string> {
  const id = crypto.randomUUID();
  await setDoc(doc(STORIES_COL(uid), id), {
    ...story,
    createdAt: serverTimestamp(),
  });
  return id;
}

export async function listLibrary(uid: string, max = 50): Promise<SavedStory[]> {
  const q = query(STORIES_COL(uid), orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    id: d.id,
    ...(d.data() as Omit<SavedStory, 'id'>),
  }));
}

export async function deleteFromLibrary(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(STORIES_COL(uid), id));
}

// ─── Public stories (Hall of Fame) — direct client read since rules allow ─
export interface PublicStory {
  id: string;
  title: string;
  story: string;
  w1h: { who: string; what: string; when: string; where: string; why: string; how: string };
  createdAt?: any;
  isPublic: boolean;
  ownerName?: string;
}

export async function listPublicStories(max = 30): Promise<PublicStory[]> {
  const q = query(
    collection(getDb(), 'sharedStories'),
    where('isPublic', '==', true),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PublicStory, 'id'>) }));
}

export type { User };
