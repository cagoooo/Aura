import { onRequest, type Request } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import corsLib from 'cors';
import type { Response } from 'express';

import { runRandomElementGeneration } from './flows/random-element-generation';
import { runGrammarImprovement } from './flows/grammar-improvement';
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
