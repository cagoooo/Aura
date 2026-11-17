"use client";

import React, { useEffect, useState } from 'react';
import { Gauge, LogIn } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import {
  DAILY_AI_LIMIT, getAiQuota, refreshAiQuota, setAiQuota, subscribeAiQuota, type AiQuota,
} from '@/lib/api';

/** 訂閱「今日剩餘 AI 次數」；登入後自動查一次（唯讀，不扣次）。 */
export function useAiQuota(): AiQuota | null {
  const { user, loading } = useAuth();
  const [quota, setQuota] = useState<AiQuota | null>(() => getAiQuota());

  useEffect(() => subscribeAiQuota(setQuota), []);

  useEffect(() => {
    if (loading) return;
    if (!user || user.isAnonymous) {
      setAiQuota(null);
      return;
    }
    void refreshAiQuota();
  }, [loading, user]);

  return quota;
}

/** 頁首說明下方的次數提示：每人每天 5 次＋今日剩餘次數。 */
export default function AiQuotaBadge() {
  const { user, loading, configured, signIn } = useAuth();
  const quota = useAiQuota();
  const signedIn = !!user && !user.isAnonymous;
  const remaining = quota?.remaining;
  const exhausted = signedIn && remaining === 0;

  if (!configured) return null;

  return (
    <div
      className={`no-print mx-auto mb-6 flex max-w-prose flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border px-4 py-2 text-center text-sm sm:text-base ${
        exhausted
          ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
          : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
      }`}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 font-semibold">
        <Gauge className="h-4 w-4 shrink-0" aria-hidden="true" />
        AI 功能需 Google 登入・每人每天 {DAILY_AI_LIMIT} 次
      </span>
      {loading ? null : signedIn ? (
        <span>
          {typeof remaining === 'number'
            ? exhausted
              ? `今天的 ${DAILY_AI_LIMIT} 次已用完，明天（台北時間午夜後）再來`
              : `今日剩餘 ${remaining} 次（台北時間午夜重置）`
            : '正在查詢今日剩餘次數…'}
        </span>
      ) : (
        <button
          type="button"
          onClick={() => { void signIn(); }}
          className="inline-flex items-center gap-1 underline underline-offset-2 hover:opacity-80"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          登入後即可使用
        </button>
      )}
    </div>
  );
}
