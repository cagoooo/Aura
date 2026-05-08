import { onRequest, type Request } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import corsLib from 'cors';
import type { Response } from 'express';

import { runRandomElementGeneration } from './flows/random-element-generation';
import { runGrammarImprovement, type GrammarImprovementInput } from './flows/grammar-improvement';
import { runConsistencyCheck } from './flows/consistency-check';
import { runStorySynthesis } from './flows/story-synthesis';
import { verifyTurnstileToken, TurnstileError } from './turnstile';

setGlobalOptions({
  region: 'asia-east1',
  maxInstances: 5,
  memory: '512MiB',
  timeoutSeconds: 30,
  concurrency: 1,
});

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const TURNSTILE_SECRET_KEY = defineSecret('TURNSTILE_SECRET_KEY');

const cors = corsLib({ origin: true });

type Handler = (req: Request, res: Response) => Promise<void>;
const withCors = (handler: Handler): Handler =>
  (req, res) =>
    new Promise<void>((resolve) => {
      cors(req as any, res as any, async () => {
        try {
          await handler(req, res);
        } catch (e: any) {
          console.error('Handler error:', e);
          if (e instanceof TurnstileError) {
            if (!res.headersSent) res.status(403).json({ success: false, error: e.message });
          } else if (!res.headersSent) {
            res.status(500).json({ success: false, error: e?.message ?? 'Internal error' });
          }
        }
        resolve();
      });
    });

const SECRETS = [GEMINI_API_KEY, TURNSTILE_SECRET_KEY];

const wrapFlow = <I extends { turnstileToken?: string }, O>(
  fn: (input: I) => Promise<O>
) =>
  onRequest(
    { secrets: SECRETS },
    withCors(async (req, res) => {
      if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
      if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'POST only' });
        return;
      }
      const input = (req.body ?? {}) as I;
      await verifyTurnstileToken(input.turnstileToken);
      const data = await fn(input);
      res.json({ success: true, data });
    })
  );

export const randomElement = wrapFlow(runRandomElementGeneration);
export const grammarImprove = wrapFlow(runGrammarImprovement);
export const checkConsistency = wrapFlow(runConsistencyCheck);
export const synthesizeStory = wrapFlow(runStorySynthesis);

// Bulk endpoint: one Turnstile token + parallel Gemini calls.
// Used by initial page load and "全部隨機" to avoid the latency of
// 6 sequential token-fetch + serial server requests.
type BulkItem = {
  elementType: 'who' | 'what' | 'when' | 'where' | 'why' | 'how';
  elementLabel: string;
  existingOptions: string[];
};
type BulkInput = { items?: BulkItem[]; turnstileToken?: string };
const MAX_BULK_ITEMS = 10;

// Bulk grammar improvement: 6 parallel Gemini calls + 1 Turnstile token.
// Speeds up "潤飾語法" from ~6s sequential to ~2-3s parallel.
type GrammarBulkItem = Omit<GrammarImprovementInput, 'turnstileToken'>;
type GrammarBulkInput = { items?: GrammarBulkItem[]; turnstileToken?: string };

export const grammarImproveBulk = onRequest(
  { secrets: SECRETS },
  withCors(async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'POST only' });
      return;
    }
    const input = (req.body ?? {}) as GrammarBulkInput;
    await verifyTurnstileToken(input.turnstileToken);

    const items = Array.isArray(input.items) ? input.items : [];
    if (items.length === 0 || items.length > MAX_BULK_ITEMS) {
      res.status(400).json({ success: false, error: `items must be 1..${MAX_BULK_ITEMS}` });
      return;
    }

    const results = await Promise.all(
      items.map((item) =>
        runGrammarImprovement(item).catch((e) => {
          console.error('bulk grammar item failed:', item.elementType, e);
          return { refinedText: item.text };  // fallback: return original on error
        })
      )
    );
    res.json({ success: true, data: { results } });
  })
);

export const randomElementBulk = onRequest(
  { secrets: SECRETS },
  withCors(async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'POST only' });
      return;
    }
    const input = (req.body ?? {}) as BulkInput;
    await verifyTurnstileToken(input.turnstileToken);

    const items = Array.isArray(input.items) ? input.items : [];
    if (items.length === 0 || items.length > MAX_BULK_ITEMS) {
      res.status(400).json({ success: false, error: `items must be 1..${MAX_BULK_ITEMS}` });
      return;
    }

    const results = await Promise.all(
      items.map((item) =>
        runRandomElementGeneration(item).catch((e) => {
          console.error('bulk item failed:', item.elementType, e);
          return { generatedText: '' };
        })
      )
    );
    res.json({ success: true, data: { results } });
  })
);
