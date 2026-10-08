"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchRoleByUserId } from "@/services/profile-service";
import { signOut as performSignOut } from "@/services/auth-service";
import type { AppRole, AuthContextState } from "@/types/auth";

export const AuthContext = createContext<AuthContextState | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const supabase = useMemo(() => createClient(), []);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole>("user");

  const loadSession = useCallback(async () => {
    setIsLoading(true);
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setUserId(null);
      setEmail(null);
      setRole("user");
      setIsLoading(false);
      return;
    }

    setUserId(session.user.id);
    setEmail(session.user.email ?? null);
    const nextRole = await fetchRoleByUserId(session.user.id);
    setRole(nextRole);
    setIsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadSession();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void loadSession();
    });
    return () => subscription.unsubscribe();
  }, [loadSession, supabase]);

  const signOut = useCallback(async () => {
    await performSignOut();
    await loadSession();
  }, [loadSession]);

  const value = useMemo<AuthContextState>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(userId),
      userId,
      email,
      role,
      refresh: loadSession,
      signOut
    }),
    [email, isLoading, loadSession, role, signOut, userId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
