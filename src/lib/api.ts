/**
 * Cloud Functions client — replaces the old `src/ai/flows/*` Server Actions.
 *
 * NEXT_PUBLIC_API_BASE is set at build time by GitHub Actions and points to
 * the Cloud Functions hostname (e.g. https://asia-east1-aura-2sg5o.cloudfunctions.net).
 * Each function name appended to it gives the full URL.
 */

import type { W1HKey } from '@/lib/constants';
import { getFbAuth, isFirebaseClientConfigured } from '@/lib/firebase-client';

export const LOGIN_REQUIRED_MESSAGE = '請先用 Google 帳號登入才能使用 AI 功能';

// ─── 每人每天 AI 次數（2026-11-17）──────────────────────────────────────
// 伺服器每位登入者每天最多 3 次（台北時間午夜重置）；每次 AI 回應會帶回 quota，
// 這裡存成全域狀態讓畫面上的「今日剩餘」即時更新。
export const DAILY_AI_LIMIT = 3;
export const QUOTA_EXCEEDED_MESSAGE = `今天的 ${DAILY_AI_LIMIT} 次已用完，明天（台北時間午夜後）再來`;

export interface AiQuota {
  limit: number;
  used: number;
  remaining: number;
  date: string;
}

export class QuotaExceededError extends Error {
  constructor(message: string = QUOTA_EXCEEDED_MESSAGE) {
    super(message);
    this.name = 'QuotaExceededError';
  }
}

export const isQuotaExceededError = (e: unknown): e is QuotaExceededError =>
  e instanceof QuotaExceededError;

let currentQuota: AiQuota | null = null;
const quotaListeners = new Set<(q: AiQuota | null) => void>();

function isAiQuota(v: any): v is AiQuota {
  return v && typeof v.remaining === 'number' && typeof v.limit === 'number';
}

export function setAiQuota(q: AiQuota | null) {
  currentQuota = q;
  quotaListeners.forEach((fn) => fn(q));
}

export function getAiQuota(): AiQuota | null {
  return currentQuota;
}

export function subscribeAiQuota(fn: (q: AiQuota | null) => void): () => void {
  quotaListeners.add(fn);
  return () => { quotaListeners.delete(fn); };
}

/** 取得目前 Google 登入者的憑證；沒登入（或匿名）回 null。 */
async function getIdTokenOrNull(): Promise<string | null> {
  if (!isFirebaseClientConfigured()) return null;
  const current = getFbAuth().currentUser;
  if (!current || current.isAnonymous) return null;
  return current.getIdToken();
}

// Style + grade are user prefs that get attached to ~every flow call.
export type StoryStyle = 'free' | 'fairytale' | 'wuxia' | 'scifi' | 'mystery' | 'school' | 'folklore';
export type GradeLevel = 'auto' | 'lower' | 'middle' | 'upper' | 'junior';
export interface SettingsExtras {
  style?: StoryStyle;
  gradeLevel?: GradeLevel;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  'https://asia-east1-aura-2sg5o.cloudfunctions.net';

// ─── Shared types (mirror functions/src/flows/* schemas) ───────────────────
export interface RandomElementGenerationInput {
  elementType: W1HKey;
  elementLabel: string;
  existingOptions: string[];
  turnstileToken?: string;
  style?: StoryStyle;
  gradeLevel?: GradeLevel;
}
export interface RandomElementGenerationOutput {
  generatedText: string;
}

export interface GrammarImprovementInput {
  elementType: W1HKey;
  text: string;
  elementLabel: string;
  turnstileToken?: string;
  style?: StoryStyle;
  gradeLevel?: GradeLevel;
}
export interface GrammarImprovementOutput {
  refinedText: string;
}

export interface ConsistencyCheckInput {
  who: string; what: string; when: string;
  where: string; why: string; how: string;
  turnstileToken?: string;
  style?: StoryStyle;
  gradeLevel?: GradeLevel;
}
export interface ConsistencyCheckOutput {
  suggestions: string[];
  isConsistent: boolean;
}

export interface StorySynthesisInput {
  who: string; what: string; when: string;
  where: string; why: string; how: string;
  turnstileToken?: string;
  style?: StoryStyle;
  gradeLevel?: GradeLevel;
}
export interface StorySynthesisOutput {
  title: string;
  story: string;
}

// ─── Fetch wrapper ──────────────────────────────────────────────────────────
async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // getStory / saveStory 不需要登入；其餘 AI 功能需要，伺服器會檢查。
  const idToken = await getIdTokenOrNull();
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const res = await fetch(`${API_BASE}/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty / non-JSON */ }
  if (isAiQuota(json?.quota)) setAiQuota(json.quota);
  if (res.status === 429) {
    throw new QuotaExceededError(json?.error ?? QUOTA_EXCEEDED_MESSAGE);
  }
  if (!res.ok || !json?.success) {
    const msg = json?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.data as T;
}

/** 查詢今日剩餘次數（唯讀：不扣次、不發通知）；沒登入回 null。 */
export async function refreshAiQuota(): Promise<AiQuota | null> {
  const idToken = await getIdTokenOrNull();
  if (!idToken) {
    setAiQuota(null);
    return null;
  }
  try {
    const res = await fetch(`${API_BASE}/aiQuota`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success && isAiQuota(json.data)) {
      setAiQuota(json.data);
      return json.data;
    }
  } catch (e) {
    console.warn('refreshAiQuota failed:', e);
  }
  return currentQuota;
}

// Bulk variant: one Turnstile token + parallel Gemini calls server-side.
export interface RandomElementBulkInput {
  items: Array<{
    elementType: W1HKey;
    elementLabel: string;
    existingOptions: string[];
  }>;
  turnstileToken?: string;
  style?: StoryStyle;
  gradeLevel?: GradeLevel;
}
export interface RandomElementBulkOutput {
  results: RandomElementGenerationOutput[];
}

// ─── Public API (drop-in replacements for old Server Action exports) ────────
export const randomElementGenerate = (input: RandomElementGenerationInput) =>
  callFunction<RandomElementGenerationOutput>('randomElement', input);

export const randomElementBulk = (input: RandomElementBulkInput) =>
  callFunction<RandomElementBulkOutput>('randomElementBulk', input);

export interface GrammarImprovementBulkInput {
  items: Array<{
    elementType: W1HKey;
    text: string;
    elementLabel: string;
  }>;
  turnstileToken?: string;
  style?: StoryStyle;
  gradeLevel?: GradeLevel;
}
export interface GrammarImprovementBulkOutput {
  results: GrammarImprovementOutput[];
}
export const grammarImproveBulk = (input: GrammarImprovementBulkInput) =>
  callFunction<GrammarImprovementBulkOutput>('grammarImproveBulk', input);

// ─── Multimodal: image → 5W1H ────────────────────────────────────────
export interface AnalyzeImageInput {
  imageDataUrl: string;
  turnstileToken?: string;
  style?: StoryStyle;
  gradeLevel?: GradeLevel;
}
export interface AnalyzeImageOutput {
  who: string; what: string; when: string;
  where: string; why: string; how: string;
}
export const analyzeImage = (input: AnalyzeImageInput) =>
  callFunction<AnalyzeImageOutput>('analyzeImage', input);

// ─── Permanent share links ──────────────────────────────────────────
export interface SaveStoryInput {
  title: string;
  story: string;
  w1h: { who: string; what: string; when: string; where: string; why: string; how: string };
  turnstileToken?: string;
  style?: StoryStyle;
  gradeLevel?: GradeLevel;
  isPublic?: boolean;
  ownerName?: string;
}
export const saveStory = (input: SaveStoryInput) =>
  callFunction<{ id: string }>('saveStory', input);

export interface SharedStory {
  title: string;
  story: string;
  w1h: { who: string; what: string; when: string; where: string; why: string; how: string };
  createdAt: number | null;
}
// getStory uses GET with ?id=, not POST. Inline this one.
export async function getStory(id: string): Promise<SharedStory> {
  const res = await fetch(`${API_BASE}/getStory?id=${encodeURIComponent(id)}`);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    throw new Error(json?.error ?? `HTTP ${res.status}`);
  }
  return json.data as SharedStory;
}

export const grammarImprovement = (input: GrammarImprovementInput) =>
  callFunction<GrammarImprovementOutput>('grammarImprove', input);

export const consistencyCheck = (input: ConsistencyCheckInput) =>
  callFunction<ConsistencyCheckOutput>('checkConsistency', input);

export const storySynthesis = (input: StorySynthesisInput) =>
  callFunction<StorySynthesisOutput>('synthesizeStory', input);
