import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

export const UserProfile = () => {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="p-4 bg-nous-surface/30 border border-nous-border rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
            {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} className="w-10 h-10 rounded-full border border-nous-border" />
            ) : (
                <div className="w-10 h-10 rounded-full bg-nous-accent/20 flex items-center justify-center text-nous-accent font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                </div>
            )}
            <div className="flex flex-col">
                <span className="font-medium text-nous-primary">{user.displayName || "User"}</span>
                <span className="text-xs text-nous-secondary">{user.email}</span>
            </div>
        </div>
        
        <Button variant="secondary" onClick={signOut} size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-500/20">
            Sign Out
        </Button>
    </div>
  );
};
