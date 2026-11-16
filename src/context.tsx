import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { get, post } from './lib/api';
import type { Me, Meta } from './lib/types';

interface AppState {
  me: Me | null;
  meta: Meta | null;
  loading: boolean;
  dark: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchProfile: (id: string) => Promise<void>;
  toggleDark: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp außerhalb von Provider');
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('sw_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('sw_theme', dark ? 'dark' : 'light');
  }, [dark]);

  const refresh = useCallback(async () => {
    try {
      const [meData, metaData] = await Promise.all([
        get<Me>('/me').catch(() => null),
        get<Meta>('/meta').catch(() => null),
      ]);
      setMe(meData);
      if (metaData) setMeta(metaData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await post<Me>('/login', { email, password });
    setMe(data);
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const data = await post<Me>('/register', { email, password, name });
    setMe(data);
  }, []);

  const logout = useCallback(async () => {
    await post('/logout').catch(() => {});
    setMe(null);
  }, []);

  const switchProfile = useCallback(async (id: string) => {
    const data = await post<Me>(`/profiles/${id}/switch`);
    setMe(data);
  }, []);

  const toggleDark = useCallback(() => setDark((d) => !d), []);

  return (
    <Ctx.Provider value={{ me, meta, loading, dark, refresh, login, register, logout, switchProfile, toggleDark }}>
      {children}
    </Ctx.Provider>
  );
}
