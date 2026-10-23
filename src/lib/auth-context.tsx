"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as auth from "./auth";
import { store } from "./store";
import type { PublicUser } from "./types";

interface AuthValue {
  user: PublicUser | null;
  /** False until the session has been read from storage. */
  ready: boolean;
  signup(input: auth.SignupInput): Promise<PublicUser>;
  login(email: string, password: string): Promise<PublicUser>;
  logout(): Promise<void>;
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setUser(await auth.currentUser(store));
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // Reading the session is async; this sync point is the effect itself.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      ready,
      refresh,
      async signup(input) {
        const u = await auth.signup(store, input);
        setUser(u);
        return u;
      },
      async login(email, password) {
        const u = await auth.login(store, email, password);
        setUser(u);
        return u;
      },
      async logout() {
        await auth.logout(store);
        setUser(null);
      },
    }),
    [user, ready, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
