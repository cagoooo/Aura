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
