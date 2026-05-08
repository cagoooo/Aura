"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import { ToastAction } from '@/components/ui/toast';

const POLL_INTERVAL_MS = 5 * 60 * 1000;  // 5 min
// Use NEXT_PUBLIC_BUILD_ID baked at build time as the anchor — what THIS tab is running.
const RUNNING_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
const VERSION_URL =
  (process.env.NEXT_PUBLIC_BASE_PATH ?? '') + '/version.json';

/**
 * Polls /version.json every few minutes. If buildId differs from the one
 * baked into this tab's bundle, shows a one-time toast inviting the user
 * to refresh. Visible refresh prompt is much better UX than silently
 * forcing reload — students mid-edit shouldn't lose their work.
 */
export default function VersionWatcher() {
  const { toast } = useToast();
  const promptedRef = useRef(false);
  const [, setTick] = useState(0);  // force re-render on visibility change

  useEffect(() => {
    if (RUNNING_BUILD_ID === 'dev') return;  // skip in local dev

    const check = async () => {
      if (promptedRef.current) return;
      try {
        const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as { buildId?: string };
        if (data.buildId && data.buildId !== RUNNING_BUILD_ID) {
          promptedRef.current = true;
          toast({
            variant: "default",
            title: "🚀 有新版本可用",
            description: "我們剛剛部署了改進。重新整理以載入最新版（你的內容會保留）。",
            duration: 1000 * 60 * 30,  // sticky 30 min so user doesn't miss it
            action: (
              <ToastAction altText="立即重新整理" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                立即更新
              </ToastAction>
            ),
          });
        }
      } catch {
        // Network blip — try again next interval
      }
    };

    // First check ~10s after mount so we don't double-fetch on first paint
    const initialTimer = setTimeout(check, 10_000);
    const interval = setInterval(check, POLL_INTERVAL_MS);

    // Check immediately on tab visibility regain (catches users returning
    // from coffee break to find a new deploy waiting)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        check();
        setTick(t => t + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [toast]);

  return null;
}
