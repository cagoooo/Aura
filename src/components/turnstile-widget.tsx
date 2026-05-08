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

  const flushPending = (
    method: 'resolve' | 'reject',
    payload: string | Error
  ) => {
    const queue = pendingResolversRef.current;
    pendingResolversRef.current = [];
    queue.forEach((p) => {
      if (method === 'resolve') p.resolve(payload as string);
      else p.reject(payload as Error);
    });
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
          callback: (token) => flushPending('resolve', token),
          'error-callback': (code) =>
            flushPending('reject', new Error(`Turnstile error: ${code ?? 'unknown'}`)),
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

    return new Promise<string>((resolve, reject) => {
      pendingResolversRef.current.push({ resolve, reject });
      try {
        window.turnstile!.reset(widgetIdRef.current!);
        window.turnstile!.execute(widgetIdRef.current!);
      } catch (e) {
        const err = e instanceof Error ? e : new Error('Turnstile execute failed');
        pendingResolversRef.current = pendingResolversRef.current.filter(
          (p) => p.reject !== reject
        );
        reject(err);
      }
    });
  }, []);

  useImperativeHandle(ref, () => ({ getToken }), [getToken]);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} aria-hidden="true" style={{ display: 'none' }} />;
});

TurnstileWidget.displayName = 'TurnstileWidget';

export default TurnstileWidget;
