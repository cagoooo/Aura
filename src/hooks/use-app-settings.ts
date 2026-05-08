"use client";

import { useEffect, useState } from 'react';

// Persisted user preferences. localStorage so they survive reload.
// Each setting also has a session-only default so SSR returns predictable state.

export type StoryStyle =
  | 'free'        // 自由（既有行為）
  | 'fairytale'   // 童話
  | 'wuxia'       // 武俠
  | 'scifi'       // 科幻
  | 'mystery'     // 推理
  | 'school'      // 校園
  | 'folklore';   // 民間故事

export type GradeLevel =
  | 'auto'        // 預設（既有行為，無對齊）
  | 'lower'       // 國小低年級（一二）
  | 'middle'      // 國小中年級（三四）
  | 'upper'       // 國小高年級（五六）
  | 'junior';     // 國中

export const STORY_STYLES: { value: StoryStyle; label: string; emoji: string }[] = [
  { value: 'free',      label: '自由風格',   emoji: '✨' },
  { value: 'fairytale', label: '童話',       emoji: '🧚' },
  { value: 'wuxia',     label: '武俠',       emoji: '🥋' },
  { value: 'scifi',     label: '科幻',       emoji: '🚀' },
  { value: 'mystery',   label: '推理',       emoji: '🔍' },
  { value: 'school',    label: '校園',       emoji: '🎒' },
  { value: 'folklore',  label: '民間故事',   emoji: '🏯' },
];

export const GRADE_LEVELS: { value: GradeLevel; label: string }[] = [
  { value: 'auto',   label: '預設（一般成人）' },
  { value: 'lower',  label: '國小低年級（1-2）' },
  { value: 'middle', label: '國小中年級（3-4）' },
  { value: 'upper',  label: '國小高年級（5-6）' },
  { value: 'junior', label: '國中（7-9）' },
];

interface AppSettings {
  style: StoryStyle;
  gradeLevel: GradeLevel;
  liveMode: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  style: 'free',
  gradeLevel: 'auto',
  liveMode: false,
};

const STORAGE_KEY = 'aura.settings.v1';

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      style: parsed.style ?? DEFAULT_SETTINGS.style,
      gradeLevel: parsed.gradeLevel ?? DEFAULT_SETTINGS.gradeLevel,
      liveMode: !!parsed.liveMode,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useAppSettings() {
  // Always start with defaults to keep SSR and first-paint stable. Then
  // hydrate from localStorage on the client.
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  // Apply liveMode → body class so global CSS can react
  useEffect(() => {
    if (!hydrated) return;
    document.body.classList.toggle('live-mode', settings.liveMode);
  }, [settings.liveMode, hydrated]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return { settings, update, hydrated };
}
