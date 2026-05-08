"use client";

import React, { useEffect, useState } from 'react';
import { getStory, type SharedStory } from '@/lib/api';
import { W1H_ELEMENTS, ALL_W1H_KEYS } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Loader2, Home, Printer, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const W1H_CARD_COLORS: Record<string, string> = {
  who: 'bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800',
  what: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
  when: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  where: 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800',
  why: 'bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800',
  how: 'bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800',
};

interface Props {
  storyId: string;
  basePath: string;
}

export default function SharedStoryView({ storyId, basePath }: Props) {
  const { toast } = useToast();
  const [story, setStory] = useState<SharedStory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getStory(storyId);
        if (!cancelled) setStory(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? '載入失敗');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storyId]);

  const goHome = () => {
    window.location.href = `${basePath}/`;
  };

  const copyAll = async () => {
    if (!story) return;
    const text = `${story.title}\n\n${story.story}`;
    await navigator.clipboard.writeText(text);
    toast({ variant: "success", title: "已複製", description: "故事已複製到剪貼簿。" });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">載入故事中…</p>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">😢 找不到故事</h2>
        <p className="text-muted-foreground mb-6">{error ?? '此分享連結不存在或已過期（90 天後自動刪除）。'}</p>
        <Button onClick={goHome} className="bg-primary text-primary-foreground">
          <Home className="mr-2 h-4 w-4" />
          回首頁產生新故事
        </Button>
      </div>
    );
  }

  const createdAt = story.createdAt
    ? new Date(story.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-2 flex-wrap no-print">
        <Button onClick={goHome} variant="outline" size="sm">
          <Home className="mr-2 h-4 w-4" />
          回主頁
        </Button>
        <div className="flex gap-2">
          <Button onClick={copyAll} variant="outline" size="sm">
            <Copy className="mr-1 h-4 w-4" /> 複製
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <Printer className="mr-1 h-4 w-4" /> 列印
          </Button>
        </div>
      </div>

      <Card className="print-area mb-6 rounded-lg shadow-xl border border-primary/30">
        <CardHeader className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <CardTitle className="print-title text-2xl font-semibold text-primary">{story.title}</CardTitle>
          </div>
          {createdAt && (
            <p className="text-sm text-muted-foreground mt-2 no-print">分享於 {createdAt}</p>
          )}
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <p className="print-body text-base leading-relaxed text-foreground whitespace-pre-wrap">
            {story.story}
          </p>

          {/* Print-only: full W1H reference + source footer */}
          <div className="print-only">
            <h2 className="print-section-title">本故事的 5W1H 元素</h2>
            <dl>
              {ALL_W1H_KEYS.map(key => (
                <div key={key} className="print-w1h-row">
                  <dt>{W1H_ELEMENTS[key].label}</dt>
                  <dd>{story.w1h[key] || '—'}</dd>
                </div>
              ))}
            </dl>
            <p className="print-footer-info">
              由 5W1H 靈感發射器 產出　|　https://cagoooo.github.io/Aura/　|　桃園市石門國小資訊組 阿凱老師 設計
              {createdAt && <><br/>分享於 {createdAt}</>}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 no-print">
        {ALL_W1H_KEYS.map((key) => (
          <Card
            key={key}
            className={cn('shadow-sm', W1H_CARD_COLORS[key])}
          >
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-lg text-primary">{W1H_ELEMENTS[key].label}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-base leading-relaxed">{story.w1h[key] || '—'}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8 no-print">
        喜歡這個故事？
        <button
          onClick={goHome}
          className="text-primary hover:underline ml-1 font-semibold"
        >
          來產生你自己的故事
        </button>
      </p>
    </div>
  );
}
