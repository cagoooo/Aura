/**
 * Cloudflare Turnstile server-side verification (Cloud Functions edition).
 * No-op if TURNSTILE_SECRET_KEY isn't injected (dev / pre-launch).
 */
const TURNSTILE_VERIFY_URL =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export class TurnstileError extends Error {
  constructor(message: string, public codes: string[] = []) {
    super(message);
    this.name = 'TurnstileError';
  }
}

export async function verifyTurnstileToken(
  token: string | undefined
): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;

  if (!token || token.trim() === '') {
    throw new TurnstileError('缺少 Turnstile 驗證 token，請重新整理頁面再試。');
  }

  const body = new URLSearchParams({ secret, response: token });
  let res: Response;
  try {
    res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body });
  } catch (e) {
    console.error('Turnstile verify network error:', e);
    throw new TurnstileError('連線 Cloudflare 驗證服務失敗，請稍後再試。');
  }
  if (!res.ok) throw new TurnstileError(`Turnstile verify HTTP ${res.status}`);

  const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
  if (!data.success) {
    const codes = data['error-codes'] ?? [];
    console.warn('Turnstile verification failed:', codes);
    throw new TurnstileError('人機驗證未通過，請重新整理頁面再試。', codes);
  }
}
