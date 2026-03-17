import { useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signInWithGoogle as firebaseSignInWithGoogle, signOutUser as firebaseSignOutUser } from "@/lib/firebase";
import { useStore } from "@/store";

export function useAuth() {
  const { user, loading, setUser, setLoading } = useStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setLoading]);

  const signInWithGoogle = async () => {
    try {
      await firebaseSignInWithGoogle();
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        (error as { code?: string }).code === "auth/popup-closed-by-user"
      ) {
        return; // User dismissed the popup — nothing to do
      }
      console.error("Login failed", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOutUser();
    } catch (error) {
      console.error("Logout failed", error);
      throw error;
    }
  };

  return { user, loading, signInWithGoogle, signOut };
}
