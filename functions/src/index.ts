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
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
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
            if (!res.headersSent) res.status(e.status).json({ ...(e.extra ?? {}), success: false, error: e.message });
          } else if (!res.headersSent) {
            res.status(500).json({ success: false, error: e?.message ?? 'Internal error' });
          }
        }
        resolve();
      });
    });

const SECRETS = [GEMINI_API_KEY, TURNSTILE_SECRET_KEY];
const AI_SECRETS = [...SECRETS, GOOGLE_CHAT_WEBHOOK_URL];

// ─── 每人每天 AI 次數上限（2026-11-17）────────────────────────────────
// 每位 Google 登入使用者（uid）每天最多 DAILY_AI_LIMIT 次，台北時間午夜重置。
// 計數放 Firestore `rateLimits/user_<uid>_<台北日期>`，用 transaction 扣次避免同時送出時超扣；
// 文件帶 expireAt（隔天午夜再加 1 天），搭配 Firestore TTL 自動清掉舊紀錄。
const DAILY_AI_LIMIT = 5;
const RATE_LIMIT_COLLECTION = 'rateLimits';
const QUOTA_EXCEEDED_MESSAGE = `今天的 ${DAILY_AI_LIMIT} 次已用完，明天（台北時間午夜後）再來`;
const TAIPEI_OFFSET_MS = 8 * 3600 * 1000; // 台灣沒有日光節約時間，固定 UTC+8
const DAY_MS = 24 * 3600 * 1000;

type QuotaInfo = { limit: number; used: number; remaining: number; date: string };

function taipeiDay(now = Date.now()): { date: string; nextMidnightMs: number } {
  const shifted = now + TAIPEI_OFFSET_MS;
  const dayStart = Math.floor(shifted / DAY_MS) * DAY_MS;
  return {
    date: new Date(dayStart).toISOString().slice(0, 10),
    nextMidnightMs: dayStart + DAY_MS - TAIPEI_OFFSET_MS,
  };
}

const quotaDoc = (uid: string, date: string) =>
  db.collection(RATE_LIMIT_COLLECTION).doc(`user_${uid}_${date}`);

const toQuota = (used: number, date: string): QuotaInfo => ({
  limit: DAILY_AI_LIMIT,
  used,
  remaining: Math.max(0, DAILY_AI_LIMIT - used),
  date,
});

/** 扣 1 次；超過上限回 allowed=false（不扣）。 */
async function reserveDailyQuota(uid: string): Promise<{ allowed: boolean; quota: QuotaInfo }> {
  const { date, nextMidnightMs } = taipeiDay();
  const ref = quotaDoc(uid, date);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const used = Number(snap.data()?.count ?? 0);
    if (used >= DAILY_AI_LIMIT) return { allowed: false, quota: toQuota(used, date) };
    tx.set(ref, {
      uid,
      date,
      count: used + 1,
      updatedAt: Timestamp.now(),
      expireAt: Timestamp.fromMillis(nextMidnightMs + DAY_MS),
    }, { merge: true });
    return { allowed: true, quota: toQuota(used + 1, date) };
  });
}

/** AI 失敗時退回 1 次（用扣次當下的日期，跨午夜也退回正確那天）。 */
async function refundDailyQuota(uid: string, date: string): Promise<QuotaInfo | null> {
  try {
    const ref = quotaDoc(uid, date);
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const used = Number(snap.data()?.count ?? 0);
      const next = Math.max(0, used - 1);
      if (snap.exists) tx.update(ref, { count: next, updatedAt: Timestamp.now() });
      return toQuota(next, date);
    });
  } catch (err) {
    console.warn('[quota] refund failed', err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function readDailyQuota(uid: string): Promise<QuotaInfo> {
  const { date } = taipeiDay();
  const snap = await quotaDoc(uid, date).get();
  return toQuota(Number(snap.data()?.count ?? 0), date);
}

// AI 端點共用外殼：登入 → Turnstile 人機驗證 → 扣每日次數 → 呼叫 AI → 回應前發 Google Chat 通知。
// AI 失敗會退回次數；通知最多等 2.5 秒且不會丟例外，所以不影響主功能回應。
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

    // 先過人機驗證才扣次數（被機器人驗證擋下不算次數）
    try {
      await verifyTurnstileToken((req.body ?? {}).turnstileToken);
    } catch (e) {
      await notifyAiUsage(SITE_NAME, { kind: 'failed', feature, user: chatUser, durationMs: Date.now() - startedAt, error: e });
      throw e;
    }

    const { allowed, quota } = await reserveDailyQuota(user.uid);
    if (!allowed) {
      await notifyAiUsage(SITE_NAME, {
        kind: 'quotaExceeded', feature, user: chatUser, limit: DAILY_AI_LIMIT, throttleKey: user.uid,
      });
      throw new HttpError(429, QUOTA_EXCEEDED_MESSAGE, { quota });
    }

    try {
      const data = await handler(req);
      await notifyAiUsage(SITE_NAME, {
        kind: 'success', feature, user: chatUser, durationMs: Date.now() - startedAt, remaining: quota.remaining,
      });
      res.json({ success: true, data, quota });
    } catch (e) {
      const refunded = await refundDailyQuota(user.uid, quota.date);
      await notifyAiUsage(SITE_NAME, {
        kind: 'failed', feature, user: chatUser, durationMs: Date.now() - startedAt, error: e,
        remaining: refunded?.remaining ?? quota.remaining,
      });
      if (e instanceof HttpError && refunded) e.extra = { ...(e.extra ?? {}), quota: refunded };
      throw e;
    }
  };

// 唯讀查詢今日剩餘次數：要登入，但不扣次、不發通知、不需要人機驗證。
export const aiQuota = onRequest(
  {},
  withCors(async (req, res) => {
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'GET or POST only' });
      return;
    }
    const user = await requireGoogleUser(req);
    res.json({ success: true, data: await readDailyQuota(user.uid) });
  })
);

const wrapFlow = <I extends { turnstileToken?: string }, O>(
  feature: string,
  fn: (input: I) => Promise<O>
) =>
  onRequest(
    { secrets: AI_SECRETS },
    withCors(aiEndpoint(feature, async (req) => fn((req.body ?? {}) as I)))
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
// Used by "全部隨機" (2026-11-17 起開頁不再自動呼叫) to avoid the latency of
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

    const items = Array.isArray(input.items) ? input.items : [];
    if (items.length === 0 || items.length > MAX_BULK_ITEMS) {
      throw new HttpError(400, `items must be 1..${MAX_BULK_ITEMS}`);
    }

    let failed = 0;
    const results = await Promise.all(
      items.map((item) =>
        runGrammarImprovement({
          ...item,
          style: input.style as any,
          gradeLevel: input.gradeLevel as any,
        }).catch((e) => {
          console.error('bulk grammar item failed:', item.elementType, e);
          failed++;
          return { refinedText: item.text };
        })
      )
    );
    // 按一次按鈕只算 1 次；全部失敗才算 AI 失敗（外殼會退回次數）
    if (failed === items.length) throw new Error('AI 暫時無法回應，請稍後再試');
    return { results };
  }))
);

export const randomElementBulk = onRequest(
  { secrets: AI_SECRETS },
  withCors(aiEndpoint('全部隨機', async (req) => {
    const input = (req.body ?? {}) as BulkInput;

    const items = Array.isArray(input.items) ? input.items : [];
    if (items.length === 0 || items.length > MAX_BULK_ITEMS) {
      throw new HttpError(400, `items must be 1..${MAX_BULK_ITEMS}`);
    }

    let failed = 0;
    const results = await Promise.all(
      items.map((item) =>
        runRandomElementGeneration({
          ...item,
          style: input.style as any,
          gradeLevel: input.gradeLevel as any,
        }).catch((e) => {
          console.error('bulk item failed:', item.elementType, e);
          failed++;
          return { generatedText: '' };
        })
      )
    );
    // 按一次按鈕只算 1 次；全部失敗才算 AI 失敗（外殼會退回次數）
    if (failed === items.length) throw new Error('AI 暫時無法回應，請稍後再試');
    return { results };
  }))
);
