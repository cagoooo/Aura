/**
 * Google Chat 使用通知（2026-11-15）
 *
 * 每次有人呼叫 AI 功能都發一則卡片到阿凱老師的 Google Chat 聊天室，
 * 方便即時發現有沒有人亂刷 Gemini 額度。
 *
 * - Webhook 網址放在 Secret Manager：GOOGLE_CHAT_WEBHOOK_URL
 *   （函式的 secrets 清單要加上它，執行時才會注入成環境變數）
 * - best-effort：最多等 2.5 秒，失敗只 console.warn，絕不丟例外、不影響主功能
 * - 卡片只放「誰、用了什麼功能、什麼時候、花多久」，不放使用者輸入或 AI 產出內容（隱私）
 * - 未登入被擋（401）的通知用「同一 IP 每 5 分鐘最多 1 則」節流，避免被狂打時洗版
 */

const CHAT_WEBHOOK_PREFIX = 'https://chat.googleapis.com/';
const SEND_TIMEOUT_MS = 2500;
const BLOCKED_THROTTLE_MS = 5 * 60 * 1000;
const lastBlockedByIp = new Map<string, number>();

export type ChatUser = { name?: string | null; email?: string | null };

export type AiUsageEvent =
  | { kind: 'success'; feature: string; user?: ChatUser; durationMs: number }
  | { kind: 'failed'; feature: string; user?: ChatUser; durationMs: number; error: unknown }
  | { kind: 'blocked'; feature: string; ip?: string; reason?: string };

function taipeiTime(): string {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

function escapeCardText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function errorSummary(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return (msg || '未知錯誤').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function seconds(ms: number): string {
  return `${(Math.max(0, ms) / 1000).toFixed(1)} 秒`;
}

function shouldSendBlocked(ip: string): boolean {
  const now = Date.now();
  const last = lastBlockedByIp.get(ip);
  if (last !== undefined && now - last < BLOCKED_THROTTLE_MS) return false;
  if (lastBlockedByIp.size > 500) {
    for (const [key, time] of lastBlockedByIp.entries()) {
      if (now - time >= BLOCKED_THROTTLE_MS) lastBlockedByIp.delete(key);
    }
  }
  lastBlockedByIp.set(ip, now);
  return true;
}

/** 從 HTTP 請求取出呼叫端 IP（Cloud Run 前面有代理，優先看 x-forwarded-for 第一個） */
export function clientIp(req: { ip?: string; headers?: Record<string, unknown> } | undefined): string {
  const fwd = req?.headers?.['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : typeof fwd === 'string' ? fwd : '').split(',')[0].trim();
  return first || req?.ip || '未知';
}

export async function notifyAiUsage(siteName: string, event: AiUsageEvent): Promise<void> {
  try {
    const webhookUrl = (process.env.GOOGLE_CHAT_WEBHOOK_URL || '').trim();
    if (!webhookUrl || !webhookUrl.startsWith(CHAT_WEBHOOK_PREFIX)) return;

    if (event.kind === 'blocked' && !shouldSendBlocked(event.ip || '未知')) return;

    let title: string;
    const fields: Array<[string, string]> = [['網站', siteName], ['功能', event.feature]];
    if (event.kind === 'success') {
      title = `✅ 有人使用了 ${siteName}`;
    } else if (event.kind === 'failed') {
      title = `❌ ${siteName} 失敗`;
    } else {
      title = '⚠️ 未登入呼叫被擋';
    }

    if (event.kind === 'blocked') {
      fields.push(['來源 IP', event.ip || '未知']);
      if (event.reason) fields.push(['原因', event.reason]);
      fields.push(['備註', '同一 IP 每 5 分鐘只通知 1 次']);
    } else {
      fields.push(['使用者', event.user?.name || '（未提供名稱）']);
      fields.push(['Email', event.user?.email || '（未提供 Email）']);
    }
    fields.push(['時間', taipeiTime()]);
    if (event.kind !== 'blocked') fields.push(['耗時', seconds(event.durationMs)]);
    if (event.kind === 'failed') fields.push(['錯誤摘要', errorSummary(event.error)]);

    const text = [title, ...fields.map(([k, v]) => `${k}：${v}`)].join('\n').slice(0, 4000);
    const body = {
      text,
      cardsV2: [
        {
          cardId: `ai-usage-${event.kind}`,
          card: {
            header: { title, subtitle: `${siteName}・AI 使用通知` },
            sections: [
              {
                widgets: fields.map(([label, value]) => ({
                  decoratedText: {
                    topLabel: escapeCardText(label),
                    text: escapeCardText(value),
                    wrapText: true,
                  },
                })),
              },
            ],
          },
        },
      ],
    };

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // 雙重保險：AbortController 取消連線，Promise.race 保證最多等 2.5 秒就放手
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(new Error(`timeout after ${SEND_TIMEOUT_MS}ms`));
      }, SEND_TIMEOUT_MS);
    });
    const send = (async () => {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        console.warn('[notify-google-chat] webhook failed', res.status, (await res.text()).slice(0, 200));
      }
    })();
    send.catch(() => undefined); // 逾時後才失敗的請求不要變成未處理的 rejection
    try {
      await Promise.race([send, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch (err) {
    console.warn('[notify-google-chat] send failed', err instanceof Error ? err.message : String(err));
  }
}
