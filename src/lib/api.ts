/**
 * Cloud Functions client — replaces the old `src/ai/flows/*` Server Actions.
 *
 * NEXT_PUBLIC_API_BASE is set at build time by GitHub Actions and points to
 * the Cloud Functions hostname (e.g. https://asia-east1-aura-2sg5o.cloudfunctions.net).
 * Each function name appended to it gives the full URL.
 */

import type { W1HKey } from '@/lib/constants';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  'https://asia-east1-aura-2sg5o.cloudfunctions.net';

// ─── Shared types (mirror functions/src/flows/* schemas) ───────────────────
export interface RandomElementGenerationInput {
  elementType: W1HKey;
  elementLabel: string;
  existingOptions: string[];
  turnstileToken?: string;
}
export interface RandomElementGenerationOutput {
  generatedText: string;
}

export interface GrammarImprovementInput {
  elementType: W1HKey;
  text: string;
  elementLabel: string;
  turnstileToken?: string;
}
export interface GrammarImprovementOutput {
  refinedText: string;
}

export interface ConsistencyCheckInput {
  who: string; what: string; when: string;
  where: string; why: string; how: string;
  turnstileToken?: string;
}
export interface ConsistencyCheckOutput {
  suggestions: string[];
  isConsistent: boolean;
}

export interface StorySynthesisInput {
  who: string; what: string; when: string;
  where: string; why: string; how: string;
  turnstileToken?: string;
}
export interface StorySynthesisOutput {
  title: string;
  story: string;
}

// ─── Fetch wrapper ──────────────────────────────────────────────────────────
async function callFunction<T>(name: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty / non-JSON */ }
  if (!res.ok || !json?.success) {
    const msg = json?.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.data as T;
}

// Bulk variant: one Turnstile token + parallel Gemini calls server-side.
export interface RandomElementBulkInput {
  items: Array<{
    elementType: W1HKey;
    elementLabel: string;
    existingOptions: string[];
  }>;
  turnstileToken?: string;
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
}
export interface GrammarImprovementBulkOutput {
  results: GrammarImprovementOutput[];
}
export const grammarImproveBulk = (input: GrammarImprovementBulkInput) =>
  callFunction<GrammarImprovementBulkOutput>('grammarImproveBulk', input);

export const grammarImprovement = (input: GrammarImprovementInput) =>
  callFunction<GrammarImprovementOutput>('grammarImprove', input);

export const consistencyCheck = (input: ConsistencyCheckInput) =>
  callFunction<ConsistencyCheckOutput>('checkConsistency', input);

export const storySynthesis = (input: StorySynthesisInput) =>
  callFunction<StorySynthesisOutput>('synthesizeStory', input);
