import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";
import { auth, getRedirectResult, signInWithGoogle as firebaseSignInWithGoogle, signOutUser as firebaseSignOutUser } from "@/lib/firebase";
import { useStore } from "@/store";

export function useAuth() {
  const { user, loading, setUser, setLoading } = useStore();

  useEffect(() => {
    // Process redirect result (from signInWithRedirect flow)
    getRedirectResult(auth).catch(() => {});

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
      const code = (error as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      console.error("Login failed", error);
      toast.error(`Sign-in failed: ${code ?? String(error)}`);
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
