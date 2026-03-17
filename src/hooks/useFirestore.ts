import { useCallback } from "react";
import { useStore } from "@/store";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  QueryDocumentSnapshot,
} from "firebase/firestore";

/**
 * useFirestore
 *
 * Provides stable, memoized Firestore CRUD helpers scoped to the
 * authenticated user's subcollection path: users/{uid}/{col}.
 *
 * IMPORTANT: All returned functions are wrapped in useCallback with [user]
 * as the only dependency. This means their references only change on
 * login/logout — not on every render. This prevents useEffect dependency
 * arrays from triggering re-subscriptions on every render, which was the
 * root cause of ~288K Firestore reads/day.
 */
export function useFirestore() {
  const { user } = useStore();

  // ─── Write ───────────────────────────────────────────────────────────────

  const saveDoc = useCallback(
    async (col: string, id: string, data: WithFieldValue<DocumentData>) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid, col, id);
      await setDoc(ref, data, { merge: true });
    },
    [user],
  );

  // ─── Read (one-time) ─────────────────────────────────────────────────────

  const getDocById = useCallback(
    async (col: string, id: string): Promise<DocumentData | null> => {
      if (!user) return null;
      const ref = doc(db, "users", user.uid, col, id);
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : null;
    },
    [user],
  );

  /**
   * queryDocs — one-time paginated/filtered read.
   * Returns the matching documents AND the last DocumentSnapshot so callers
   * can use it as a cursor for "load more" pagination via startAfter().
   */
  const queryDocs = useCallback(
    async <T>(
      col: string,
      ...queryConstraints: QueryConstraint[]
    ): Promise<T[]> => {
      if (!user) return [];
      const ref = collection(db, "users", user.uid, col);
      const q = query(ref, ...queryConstraints);
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as T);
    },
    [user],
  );

  /**
   * queryDocsWithCursor — like queryDocs but also returns the last snapshot
   * document for cursor-based pagination (startAfter).
   */
  const queryDocsWithCursor = useCallback(
    async <T>(
      col: string,
      ...queryConstraints: QueryConstraint[]
    ): Promise<{ data: T[]; lastDoc: QueryDocumentSnapshot | null }> => {
      if (!user) return { data: [], lastDoc: null };
      const ref = collection(db, "users", user.uid, col);
      const q = query(ref, ...queryConstraints);
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => d.data() as T);
      const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
      return { data, lastDoc };
    },
    [user],
  );

  // ─── Delete ──────────────────────────────────────────────────────────────

  const deleteDocument = useCallback(
    async (col: string, id: string) => {
      if (!user) return;
      const ref = doc(db, "users", user.uid, col, id);
      await deleteDoc(ref);
    },
    [user],
  );

  // ─── Real-time listener ───────────────────────────────────────────────────

  /**
   * subscribeCollection — opens an onSnapshot real-time listener.
   *
   * Returns the unsubscribe function. ALWAYS call it in the useEffect
   * cleanup: return () => unsub();
   *
   * Because this function is memoized with useCallback([user]), its
   * reference is stable across renders. Safe to include in useEffect
   * dependency arrays without causing re-subscription loops.
   */
  const subscribeCollection = useCallback(
    <T>(
      col: string,
      callback: (data: T[]) => void,
      ...queryConstraints: QueryConstraint[]
    ) => {
      if (!user) return () => {};
      const ref = collection(db, "users", user.uid, col);
      const q = query(ref, ...queryConstraints);
      return onSnapshot(
        q,
        (snap) => {
          const data = snap.docs.map((d) => d.data() as T);
          callback(data);
        },
        (error) => {
          console.error(`[useFirestore] onSnapshot error on "${col}":`, error);
        },
      );
    },
    [user],
  );

  return {
    saveDoc,
    getDocById,
    queryDocs,
    queryDocsWithCursor,
    deleteDocument,
    subscribeCollection,
  };
}
