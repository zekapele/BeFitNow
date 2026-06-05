import { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { service } from '../services/beFitNowService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string, phone: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('befitnow_user');
    return saved ? JSON.parse(saved) : null;
  });

  const persist = (u: User | null) => {
    setUser(u);
    if (u) localStorage.setItem('befitnow_user', JSON.stringify(u));
    else localStorage.removeItem('befitnow_user');
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

  const logout = () => persist(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
