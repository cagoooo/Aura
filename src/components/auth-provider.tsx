"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  isFirebaseClientConfigured, onAuthChange,
  signInWithGoogle as fbSignIn, signOut as fbSignOut, type User,
} from '@/lib/firebase-client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: () => Promise<User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  configured: false,
  signIn: async () => null,
  signOut: async () => undefined,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseClientConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(configured);

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthChange(u => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, [configured]);

  const signIn = async (): Promise<User | null> => {
    if (!configured) return null;
    // App 內建瀏覽器（LINE／FB 等）：Google 禁止在此登入（403 disallowed_useragent）。
    // 頁首防護會自動跳轉／引導；使用者按「先不登入，繼續瀏覽」後又按登入時，在這裡再提醒一次，不開登入視窗。
    if (/FBAN|FBAV|FB_IAB|Instagram|Messenger|MicroMessenger|KAKAOTALK|\bLine\//i.test(navigator.userAgent || '')) {
        try { window.alert('您目前在 App 內建瀏覽器（LINE／FB 等）中，Google 基於安全政策禁止在此登入。\n\n請點右上／右下角「⋯」→ 選「用預設瀏覽器開啟」後再登入。'); } catch { }
        return null;
    }
    try {
      const u = await fbSignIn();
      setUser(u);
      return u;
    } catch (e) {
      console.error('Sign-in failed:', e);
      return null;
    }
  };

  const signOut = async (): Promise<void> => {
    if (!configured) return;
    await fbSignOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, configured, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
