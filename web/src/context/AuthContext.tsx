import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { service } from '../services/beFitNowService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string, phone: string) => boolean;
  loginByPhone: (phone: string, code: string) => boolean;
  registerByPhone: (name: string, phone: string, code: string) => boolean;
  logout: () => void;
  rememberUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('befitnow_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved) as User;
      if (!parsed?.id) return null;
      return service.restoreSessionUser(parsed);
    } catch {
      return null;
    }
  });

  const persist = (u: User | null) => {
    if (u) {
      const synced = service.restoreSessionUser(u);
      setUser(synced);
      localStorage.setItem('befitnow_user', JSON.stringify(synced));
    } else {
      setUser(null);
      localStorage.removeItem('befitnow_user');
    }
  };

  const login = (email: string, password: string) => {
    const u = service.login(email, password);
    if (u) { persist(u); return true; }
    return false;
  };

  const register = (name: string, email: string, password: string, phone: string) => {
    const u = service.register(name, email, password, phone);
    if (u) { persist(u); return true; }
    return false;
  };

  const loginByPhone = (phone: string, code: string) => {
    const u = service.loginByPhone(phone, code);
    if (u) { persist(u); return true; }
    return false;
  };

  const registerByPhone = (name: string, phone: string, code: string) => {
    const u = service.registerByPhone(name, phone, code);
    if (u) { persist(u); return true; }
    return false;
  };

  const logout = () => persist(null);

  const rememberUser = (u: User) => persist(service.restoreSessionUser(u));

  return (
    <AuthContext.Provider value={{ user, login, register, loginByPhone, registerByPhone, logout, rememberUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
