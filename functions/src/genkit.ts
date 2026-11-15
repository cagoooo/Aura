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
      // 2026-11-15：本專案金鑰呼叫 2.5-flash-lite 會回 404「no longer available to new users」，
      // 改用實測可用、仍比 2.5-flash 便宜的 3.1-flash-lite（可用 thinkingBudget: 0 關閉思考）。
      model: 'googleai/gemini-3.1-flash-lite',
    });
  }
  return _ai;
}

// 明確關閉思考，避免多付思考字詞費用（日後模型預設改變也不受影響）。
// 每個 generate / definePrompt 的 config 都要帶上。
export const NO_THINKING = { thinkingConfig: { thinkingBudget: 0 } } as const;
