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
} from "firebase/firestore";

export function useFirestore() {
  const { user } = useStore();

  const getCollectionRef = (col: string) => {
    if (!user) throw new Error("User not authenticated");
    return collection(db, "users", user.uid, col);
  };

  const getDocRef = (col: string, id: string) => {
    if (!user) throw new Error("User not authenticated");
    return doc(db, "users", user.uid, col, id);
  };

  const saveDoc = async (col: string, id: string, data: WithFieldValue<DocumentData>) => {
    if (!user) return;
    const ref = getDocRef(col, id);
    await setDoc(ref, data, { merge: true });
  };

  const getDocById = async (col: string, id: string) => {
    if (!user) return null;
    const ref = getDocRef(col, id);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  };

  const queryDocs = async <T>(col: string, ...queryConstraints: QueryConstraint[]): Promise<T[]> => {
    if (!user) return [];
    const ref = getCollectionRef(col);
    const q = query(ref, ...queryConstraints);
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as T);
  };

  const deleteDocument = async (col: string, id: string) => {
    if (!user) return;
    const ref = getDocRef(col, id);
    await deleteDoc(ref);
  };

  const subscribeCollection = <T>(
    col: string,
    callback: (data: T[]) => void,
    ...queryConstraints: QueryConstraint[]
  ) => {
    if (!user) return () => {};
    const ref = getCollectionRef(col);
    const q = query(ref, ...queryConstraints);
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => d.data() as T);
      callback(data);
    });
  };

  return { saveDoc, getDocById, queryDocs, deleteDocument, subscribeCollection };
}
