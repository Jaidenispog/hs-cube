import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import { storage } from './storage';
import type { AuthUser } from './types';

const TOKEN_KEY = 'onestack.token';
const USER_KEY = 'onestack.user';

interface LoginResponse {
  token: string;
  user: AuthUser;
  expiresInSeconds: number;
}

interface AuthState {
  ready: boolean; // finished restoring a persisted session
  user: AuthUser | null;
  /** Real login backed by Supabase Auth (email + password). */
  signIn: (email: string, password: string) => Promise<void>;
  signInDev: (opts?: { role?: 'OWNER' | 'STAFF' }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await storage.remove(TOKEN_KEY);
    await storage.remove(USER_KEY);
  }, []);

  // Restore a persisted session on launch.
  useEffect(() => {
    let active = true;
    (async () => {
      const [token, userJson] = await Promise.all([storage.get(TOKEN_KEY), storage.get(USER_KEY)]);
      if (active && token && userJson) {
        setAuthToken(token);
        try {
          setUser(JSON.parse(userJson) as AuthUser);
        } catch {
          await signOut();
        }
      }
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [signOut]);

  // A 401 from any request drops the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const persist = useCallback(async (res: LoginResponse) => {
    setAuthToken(res.token);
    setUser(res.user);
    await storage.set(TOKEN_KEY, res.token);
    await storage.set(USER_KEY, JSON.stringify(res.user));
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<LoginResponse>('/auth/login', { email: email.trim(), password });
      await persist(res);
    },
    [persist],
  );

  const signInDev = useCallback(
    async (opts?: { role?: 'OWNER' | 'STAFF' }) => {
      const res = await api.post<LoginResponse>('/auth/dev-login', opts?.role ? { role: opts.role } : {});
      await persist(res);
    },
    [persist],
  );

  const value = useMemo<AuthState>(
    () => ({ ready, user, signIn, signInDev, signOut }),
    [ready, user, signIn, signInDev, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
