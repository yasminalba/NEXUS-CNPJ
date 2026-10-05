import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile } from '../types/index.ts';

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  isSwitchModalOpen: boolean;
  switchModalTargetRole: 'admin' | 'funcionario' | null;
  switchModalPrefillEmail: string;
  openSwitchModal: (targetRole?: 'admin' | 'funcionario', prefillEmail?: string) => void;
  closeSwitchModal: () => void;
  setSession: (token: string, user: UserProfile) => void;
  logout: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_KEY = 'nexuscnpj_auth_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState<boolean>(false);
  const [switchModalTargetRole, setSwitchModalTargetRole] = useState<'admin' | 'funcionario' | null>(
    null
  );
  const [switchModalPrefillEmail, setSwitchModalPrefillEmail] = useState<string>('');

  const setSession = useCallback((newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: newToken }));
    } catch {
      // ignore storage errors
    }
  }, []);

  const clearSessionLocal = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const restore = async () => {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) {
          setLoading(false);
          return;
        }
        const parsed = JSON.parse(raw);
        if (!parsed?.token) {
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${parsed.token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.user) {
            setToken(parsed.token);
            setUser(data.user);
          } else {
            clearSessionLocal();
          }
        } else {
          clearSessionLocal();
        }
      } catch {
        clearSessionLocal();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, [clearSessionLocal]);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, {
        ...options,
        headers,
      });
    },
    [token]
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch {
      // ignore network error on logout
    } finally {
      clearSessionLocal();
    }
  }, [token, clearSessionLocal]);

  const openSwitchModal = useCallback(
    (targetRole?: 'admin' | 'funcionario', prefillEmail?: string) => {
      setSwitchModalTargetRole(targetRole || null);
      setSwitchModalPrefillEmail(prefillEmail || '');
      setIsSwitchModalOpen(true);
    },
    []
  );

  const closeSwitchModal = useCallback(() => {
    setIsSwitchModalOpen(false);
    setSwitchModalTargetRole(null);
    setSwitchModalPrefillEmail('');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isSwitchModalOpen,
        switchModalTargetRole,
        switchModalPrefillEmail,
        openSwitchModal,
        closeSwitchModal,
        setSession,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return ctx;
}
