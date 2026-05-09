"use client";

import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Lightbulb, Lock, Shuffle, Wand2, CheckCircle2, BookText, Keyboard } from 'lucide-react';

const STORAGE_KEY = 'aura.onboarding.v1.dismissed';

const STEPS = [
  {
    icon: Lightbulb,
    title: '歡迎使用 5W1H 靈感發射器 Pro 🚀',
    desc: '一鍵產生 6 個故事元素，搭配 AI 潤飾、檢查一致性、自動合成故事。',
  },
  {
    icon: Shuffle,
    title: '隨機產生靈感',
    desc: '按「全部隨機」一次重新生成 6 張卡片；或按單張卡的「隨機產生」只換那一張。',
  },
  {
    icon: Lock,
    title: '鎖定喜歡的內容',
    desc: '看到喜歡的元素？點卡片右上角鎖頭把它鎖住，下次「全部隨機」不會被覆蓋。',
  },
  {
    icon: Wand2,
    title: '工具列三大功能',
    desc: '「潤飾語法」修台灣中文用詞、「檢查一致性」找劇情漏洞、「合成內容」產出完整故事。',
  },
  {
    icon: Keyboard,
    title: '鍵盤快捷鍵（熟練後超快）',
    list: [
      ['Space', '全部隨機'],
      ['G', '潤飾語法'],
      ['C', '檢查一致性'],
      ['S', '合成內容'],
      ['1 ~ 6', '鎖定 / 解鎖對應卡片'],
    ],
  },
];

export default function OnboardingDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const dismissed = localStorage.getItem(STORAGE_KEY) === '1';
      if (!dismissed) setOpen(true);
    } catch {
      // localStorage might be disabled (private mode); skip
    }
  }, []);

  const close = (markDismissed = true) => {
    setOpen(false);
    if (markDismissed) {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* ignore */ }
    }
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(true); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-3">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{current.title}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                第 {step + 1} 步，共 {STEPS.length} 步
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 min-h-[120px]">
          {current.desc && (
            <p className="text-base leading-relaxed text-foreground">{current.desc}</p>
          )}
          {current.list && (
            <ul className="space-y-2 mt-2">
              {current.list.map(([k, label]) => (
                <li key={k} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                  <span className="text-sm">{label}</span>
                  <kbd className="font-mono text-xs px-2 py-1 rounded bg-background border border-border shadow-sm">
                    {k}
                  </kbd>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-2 bg-muted'}`}
            />
          ))}
        </div>

        <DialogFooter className="flex flex-row sm:justify-between gap-2">
          <Button
            variant="ghost"
            onClick={() => close(true)}
            className="text-muted-foreground"
          >
            略過
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))}>
                上一步
              </Button>
            )}
            {!isLast ? (
              <Button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}>
                下一步
              </Button>
            ) : (
              <Button onClick={() => close(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                開始使用
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Imperative trigger — re-show the dialog from a "?" help button.
 * Call from a parent component to clear localStorage and reopen.
 */
export function useResetOnboarding() {
  return () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    window.location.reload();
  };
}
