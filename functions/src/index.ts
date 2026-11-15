import { onRequest, type Request } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import corsLib from 'cors';
import type { Response } from 'express';

import { runRandomElementGeneration } from './flows/random-element-generation';
import { runGrammarImprovement, type GrammarImprovementInput } from './flows/grammar-improvement';
import { runConsistencyCheck } from './flows/consistency-check';
import { runStorySynthesis } from './flows/story-synthesis';
import { runAnalyzeImage } from './flows/analyze-image';
import { verifyTurnstileToken, TurnstileError } from './turnstile';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { notifyAiUsage, clientIp } from './notify-google-chat';

initializeApp();
const db = getFirestore();
const STORIES_COLLECTION = 'sharedStories';
const STORY_TTL_DAYS = 90;

setGlobalOptions({
  region: 'asia-east1',
  maxInstances: 5,
  memory: '512MiB',
  timeoutSeconds: 30,
  concurrency: 1,
});

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const TURNSTILE_SECRET_KEY = defineSecret('TURNSTILE_SECRET_KEY');
// 2026-11-15：每次使用 AI 功能都發 Google Chat 通知（網址存在 Secret Manager）
const GOOGLE_CHAT_WEBHOOK_URL = defineSecret('GOOGLE_CHAT_WEBHOOK_URL');
const SITE_NAME = '5W1H 靈感發射器 PRO版';

const cors = corsLib({ origin: true });

// 2026-11-15：AI 功能必須用 Google 帳號登入才能使用（避免公開網址被大量呼叫、燒 Gemini 費用）。
class AuthRequiredError extends Error {}
const LOGIN_REQUIRED_MESSAGE = '請先用 Google 帳號登入才能使用';
async function requireGoogleUser(req: Request): Promise<DecodedIdToken> {
  const header = req.get('Authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) throw new AuthRequiredError(LOGIN_REQUIRED_MESSAGE);
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(match[1]);
  } catch {
    throw new AuthRequiredError('登入已過期，請重新登入');
  }
  if (decoded.firebase?.sign_in_provider === 'anonymous') {
    throw new AuthRequiredError(LOGIN_REQUIRED_MESSAGE);
  }
  return decoded;
}

// 請求格式錯誤等「已知狀態碼」的錯誤，由 withCors 轉成對應的 HTTP 狀態
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Handler = (req: Request, res: Response) => Promise<void>;
const withCors = (handler: Handler): Handler =>
  (req, res) =>
    new Promise<void>((resolve) => {
      cors(req as any, res as any, async () => {
        try {
          await handler(req, res);
        } catch (e: any) {
          console.error('Handler error:', e);
          if (e instanceof AuthRequiredError) {
            if (!res.headersSent) res.status(401).json({ success: false, error: e.message });
          } else if (e instanceof TurnstileError) {
            if (!res.headersSent) res.status(403).json({ success: false, error: e.message });
          } else if (e instanceof HttpError) {
            if (!res.headersSent) res.status(e.status).json({ success: false, error: e.message });
          } else if (!res.headersSent) {
            res.status(500).json({ success: false, error: e?.message ?? 'Internal error' });
          }
        }
        resolve();
      });
    });

const SECRETS = [GEMINI_API_KEY, TURNSTILE_SECRET_KEY];
const AI_SECRETS = [...SECRETS, GOOGLE_CHAT_WEBHOOK_URL];

// AI 端點共用外殼：檢查登入 → 執行 → 回應前發 Google Chat 通知（成功／失敗／未登入被擋）。
// 通知最多等 2.5 秒且不會丟例外，所以不影響主功能回應。
type AiHandler = (req: Request) => Promise<unknown>;
const aiEndpoint = (feature: string, handler: AiHandler): Handler =>
  async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'POST only' });
      return;
    }
    let user: DecodedIdToken;
    try {
      user = await requireGoogleUser(req);
    } catch (e) {
      if (e instanceof AuthRequiredError) {
        await notifyAiUsage(SITE_NAME, { kind: 'blocked', feature, ip: clientIp(req), reason: e.message });
      }
      throw e;
    }
    const startedAt = Date.now();
    const chatUser = { name: user.name as string | undefined, email: user.email };
    try {
      const data = await handler(req);
      await notifyAiUsage(SITE_NAME, { kind: 'success', feature, user: chatUser, durationMs: Date.now() - startedAt });
      res.json({ success: true, data });
    } catch (e) {
      await notifyAiUsage(SITE_NAME, { kind: 'failed', feature, user: chatUser, durationMs: Date.now() - startedAt, error: e });
      throw e;
    }
  };

const wrapFlow = <I extends { turnstileToken?: string }, O>(
  feature: string,
  fn: (input: I) => Promise<O>
) =>
  onRequest(
    { secrets: AI_SECRETS },
    withCors(aiEndpoint(feature, async (req) => {
      const input = (req.body ?? {}) as I;
      await verifyTurnstileToken(input.turnstileToken);
      return fn(input);
    }))
  );

export const randomElement = wrapFlow('隨機產生', runRandomElementGeneration);
export const grammarImprove = wrapFlow('潤飾語法', runGrammarImprovement);
export const checkConsistency = wrapFlow('檢查一致性', runConsistencyCheck);
export const synthesizeStory = wrapFlow('合成故事', runStorySynthesis);

// Permanent share links — Firestore-backed.
// saveStory: returns { id }; client builds /Aura/#/s/<id> URL.
// getStory: read-only fetch by id; renders shared view page.
type SharedW1H = { who: string; what: string; when: string; where: string; why: string; how: string };
type SaveStoryInput = {
  title: string;
  story: string;
  w1h: SharedW1H;
  turnstileToken?: string;
  isPublic?: boolean;       // #33 Hall of Fame opt-in
  ownerName?: string;       // shown on the public listing
};

const SHORT_ID_LEN = 10;
const generateShortId = (): string => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < SHORT_ID_LEN; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
};

const MAX_STORY_BYTES = 50 * 1024;  // 50KB hard cap; typical stories are <2KB

export const saveStory = onRequest(
  { secrets: SECRETS },
  withCors(async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'POST only' }); return; }
    const input = (req.body ?? {}) as SaveStoryInput;
    await verifyTurnstileToken(input.turnstileToken);

    if (!input.title || !input.story || !input.w1h) {
      res.status(400).json({ success: false, error: 'title / story / w1h are required' });
      return;
    }
    const docSize = Buffer.byteLength(JSON.stringify(input), 'utf8');
    if (docSize > MAX_STORY_BYTES) {
      res.status(413).json({ success: false, error: 'Story too large to share.' });
      return;
    }

    // Retry on collision (extremely rare with 36^10 = 3.6 × 10^15 keyspace)
    let id = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateShortId();
      const docRef = db.collection(STORIES_COLLECTION).doc(candidate);
      const existing = await docRef.get();
      if (!existing.exists) {
        const expiresAt = Timestamp.fromMillis(Date.now() + STORY_TTL_DAYS * 24 * 3600 * 1000);
        await docRef.set({
          title: input.title,
          story: input.story,
          w1h: input.w1h,
          createdAt: Timestamp.now(),
          expiresAt,
          isPublic: input.isPublic === true,
          ownerName: input.ownerName?.slice(0, 50) || null,
        });
        id = candidate;
        break;
      }
    }
    if (!id) {
      res.status(500).json({ success: false, error: 'Could not allocate share id; please retry.' });
      return;
    }
    res.json({ success: true, data: { id } });
  })
);

export const getStory = onRequest(
  {},  // no secrets needed for read; no Turnstile (public read)
  withCors(async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    const id = (req.query.id as string | undefined)?.trim();
    if (!id || !/^[a-z0-9]{6,16}$/.test(id)) {
      res.status(400).json({ success: false, error: 'invalid id' });
      return;
    }
    const doc = await db.collection(STORIES_COLLECTION).doc(id).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: 'Story not found or expired.' });
      return;
    }
    const data = doc.data()!;
    res.json({
      success: true,
      data: {
        title: data.title,
        story: data.story,
        w1h: data.w1h,
        createdAt: data.createdAt?.toMillis?.() ?? null,
      },
    });
  })
);

// Multimodal: analyze an image and produce 5W1H story concept.
// Larger memory + timeout because Gemini vision is slower than text-only.
export const analyzeImage = onRequest(
  { secrets: AI_SECRETS, memory: '1GiB', timeoutSeconds: 60 },
  withCors(aiEndpoint('看圖編故事', async (req) => {
    const input = (req.body ?? {}) as { imageDataUrl?: string; turnstileToken?: string } & SettingsExtras;
    await verifyTurnstileToken(input.turnstileToken);
    if (!input.imageDataUrl || !input.imageDataUrl.startsWith('data:image/')) {
      throw new HttpError(400, 'imageDataUrl missing or not a data:image/* URL');
    }
    if (input.imageDataUrl.length > 1_500_000) {
      throw new HttpError(413, '圖片太大，請壓縮到 1MB 以下再上傳。');
    }
    return runAnalyzeImage({
      imageDataUrl: input.imageDataUrl,
      style: input.style as any,
      gradeLevel: input.gradeLevel as any,
    });
  }))
);

// Bulk endpoint: one Turnstile token + parallel Gemini calls.
// Used by initial page load and "全部隨機" to avoid the latency of
// 6 sequential token-fetch + serial server requests.
type BulkItem = {
  elementType: 'who' | 'what' | 'when' | 'where' | 'why' | 'how';
  elementLabel: string;
  existingOptions: string[];
};
type SettingsExtras = { style?: string; gradeLevel?: string };
type BulkInput = { items?: BulkItem[]; turnstileToken?: string } & SettingsExtras;
const MAX_BULK_ITEMS = 10;

// Bulk grammar improvement: 6 parallel Gemini calls + 1 Turnstile token.
// Speeds up "潤飾語法" from ~6s sequential to ~2-3s parallel.
type GrammarBulkItem = Omit<GrammarImprovementInput, 'turnstileToken' | 'style' | 'gradeLevel'>;
type GrammarBulkInput = { items?: GrammarBulkItem[]; turnstileToken?: string } & SettingsExtras;

export const grammarImproveBulk = onRequest(
  { secrets: AI_SECRETS },
  withCors(aiEndpoint('潤飾語法（全部）', async (req) => {
    const input = (req.body ?? {}) as GrammarBulkInput;
    await verifyTurnstileToken(input.turnstileToken);

    const items = Array.isArray(input.items) ? input.items : [];
    if (items.length === 0 || items.length > MAX_BULK_ITEMS) {
      throw new HttpError(400, `items must be 1..${MAX_BULK_ITEMS}`);
    }

    const results = await Promise.all(
      items.map((item) =>
        runGrammarImprovement({
          ...item,
          style: input.style as any,
          gradeLevel: input.gradeLevel as any,
        }).catch((e) => {
          console.error('bulk grammar item failed:', item.elementType, e);
          return { refinedText: item.text };
        })
      )
    );
    return { results };
  }))
);

export const randomElementBulk = onRequest(
  { secrets: AI_SECRETS },
  withCors(aiEndpoint('全部隨機', async (req) => {
    const input = (req.body ?? {}) as BulkInput;
    await verifyTurnstileToken(input.turnstileToken);

    const items = Array.isArray(input.items) ? input.items : [];
    if (items.length === 0 || items.length > MAX_BULK_ITEMS) {
      throw new HttpError(400, `items must be 1..${MAX_BULK_ITEMS}`);
    }

    const results = await Promise.all(
      items.map((item) =>
        runRandomElementGeneration({
          ...item,
          style: input.style as any,
          gradeLevel: input.gradeLevel as any,
        }).catch((e) => {
          console.error('bulk item failed:', item.elementType, e);
          return { generatedText: '' };
        })
      )
    );
    return { results };
  }))
);
