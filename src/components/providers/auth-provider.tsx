"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiClientError } from "@/lib/api-client";
import type { User } from "@/types";

/**
 * Session context.
 *
 * The session itself lives in an HTTP-only cookie on the server; this context
 * only mirrors "who am I" for rendering purposes. Every protected API call is
 * still authorised again on the backend.
 */

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** True while a sign-in / sign-out / refresh is running. */
  busy: boolean;
  refresh: () => Promise<User | null>;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (): Promise<User | null> => {
    try {
      const data = await api.get<{ user: User | null }>("/auth/me");
      setUserState(data.user);
      return data.user;
    } catch (error) {
      // A 401 simply means "not signed in" - not an error worth showing.
      if (error instanceof ApiClientError && error.isAuthError) setUserState(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await api.post("/auth/logout");
    } catch {
      /* signing out locally regardless */
    } finally {
      setUserState(null);
      setBusy(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      busy,
      refresh,
      setUser: setUserState,
      signOut,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
    }),
    [user, loading, busy, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
