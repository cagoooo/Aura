"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string;
          size?: 'normal' | 'compact' | 'invisible' | 'flexible';
          execution?: 'render' | 'execute';
          callback?: (token: string) => void;
          'error-callback'?: (code?: string) => void;
          'expired-callback'?: () => void;
          appearance?: 'always' | 'execute' | 'interaction-only';
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export interface TurnstileWidgetHandle {
  /** Get a fresh Turnstile token. Returns undefined only if Turnstile is not configured. */
  getToken: () => Promise<string | undefined>;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const ensureScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'));
    if (window.turnstile) return resolve();

    const existing = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('script error')), { once: true });
      return;
    }

    const s = document.createElement('script');
    s.id = TURNSTILE_SCRIPT_ID;
    s.src = TURNSTILE_SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('script error'));
    document.head.appendChild(s);
  });

const TurnstileWidget = forwardRef<TurnstileWidgetHandle>((_props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const pendingResolversRef = useRef<{
    resolve: (token: string) => void;
    reject: (err: Error) => void;
  }[]>([]);

  // Resolved once the widget is rendered & ready to execute().
  // getToken() awaits this before calling execute().
  const readyResolveRef = useRef<(() => void) | null>(null);
  const readyPromiseRef = useRef<Promise<void>>(
    new Promise<void>((resolve) => {
      readyResolveRef.current = resolve;
    })
  );

  // Serialization queue: at most one execute() call in-flight at a time.
  // Without this, parallel getToken() callers would all receive the SAME
  // token from the single shared widget, and the server's siteverify
  // would reject duplicates with `timeout-or-duplicate`.
  const tokenQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  // FIFO single-shot resolver — only the head pending resolver claims each
  // callback fire. Earlier flush-all behavior caused N parallel callers to
  // receive the same token (the bug above).
  const flushNextPending = (
    method: 'resolve' | 'reject',
    payload: string | Error
  ) => {
    const next = pendingResolversRef.current.shift();
    if (!next) return;
    if (method === 'resolve') next.resolve(payload as string);
    else next.reject(payload as Error);
  };

  useEffect(() => {
    if (!SITE_KEY) {
      // No site key configured — mark "ready" so getToken returns undefined
      // immediately instead of hanging.
      readyResolveRef.current?.();
      return;
    }
    let cancelled = false;

    ensureScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          size: 'invisible',
          execution: 'execute',
          appearance: 'interaction-only',
          callback: (token) => flushNextPending('resolve', token),
          'error-callback': (code) =>
            flushNextPending('reject', new Error(`Turnstile error: ${code ?? 'unknown'}`)),
          'expired-callback': () => {
            if (widgetIdRef.current && window.turnstile) {
              window.turnstile.reset(widgetIdRef.current);
            }
          },
        });
        // Widget is rendered — unblock pending getToken() callers.
        readyResolveRef.current?.();
      })
      .catch((e) => {
        console.warn('Turnstile script failed to load:', e);
        // Resolve anyway so getToken doesn't hang indefinitely; it will
        // return undefined and the server will reject the request.
        readyResolveRef.current?.();
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        try { window.turnstile.remove(id); } catch { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render widget into the current container. Used when Turnstile's
  // internal state references a stale container (after route changes etc).
  const rerenderWidget = useCallback(() => {
    if (!SITE_KEY || !window.turnstile || !containerRef.current) return false;
    try {
      // Best-effort cleanup of any stale widget id we might still hold
      if (widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        size: 'invisible',
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token) => flushNextPending('resolve', token),
        'error-callback': (code) =>
          flushNextPending('reject', new Error(`Turnstile error: ${code ?? 'unknown'}`)),
        'expired-callback': () => {
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      });
      return true;
    } catch (e) {
      console.warn('Turnstile re-render failed:', e);
      return false;
    }
  }, []);

  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!SITE_KEY) return undefined;

    // Wait until the widget has finished rendering. Bound by 10s so we don't
    // hang forever if the script is blocked by an extension.
    await Promise.race([
      readyPromiseRef.current,
      new Promise<void>((resolve) => setTimeout(resolve, 10_000)),
    ]);

    if (!window.turnstile || !widgetIdRef.current) {
      console.warn('Turnstile widget not ready after wait — skipping token.');
      return undefined;
    }

    // Chain onto the queue so concurrent callers each get a fresh token
    // (no shared/duplicated tokens that would 403 on the server).
    const myTurn = tokenQueueRef.current.then(
      () =>
        new Promise<string>((resolve, reject) => {
          pendingResolversRef.current.push({ resolve, reject });
          const tryExecute = (allowRetry: boolean) => {
            try {
              window.turnstile!.reset(widgetIdRef.current!);
              window.turnstile!.execute(widgetIdRef.current!);
            } catch (e: any) {
              // Stale-container error after route change — re-render once and retry
              const msg = e?.message ?? '';
              if (allowRetry && /Nothing to reset|invisible/i.test(msg)) {
                if (rerenderWidget() && widgetIdRef.current) {
                  return tryExecute(false);
                }
              }
              const err = e instanceof Error ? e : new Error('Turnstile execute failed');
              pendingResolversRef.current = pendingResolversRef.current.filter(
                (p) => p.reject !== reject
              );
              reject(err);
            }
          };
          tryExecute(true);
        })
    );

    // Update queue head; .catch so a single rejection doesn't break the chain.
    tokenQueueRef.current = myTurn.catch(() => {});

    return await myTurn;
  }, [rerenderWidget]);

  useImperativeHandle(ref, () => ({ getToken }), [getToken]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} aria-hidden="true" style={{ display: 'none' }} />;
});

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
