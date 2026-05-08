import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Lazy-init: Firebase Functions injects GEMINI_API_KEY into process.env at
// invocation time (not module load), so we delay genkit creation until first
// flow call. Otherwise the SDK reads an empty key during cold-start import.
let _ai: ReturnType<typeof genkit> | null = null;

export function getAi() {
  if (!_ai) {
    _ai = genkit({
      plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
      // gemini-2.0-flash was deprecated 2026-04 ("not available to new users").
      // 2.5-flash is current free-tier default.
      model: 'googleai/gemini-2.5-flash',
    });
  }
  return _ai;
}
