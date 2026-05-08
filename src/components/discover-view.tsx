"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, Home, Sparkles, ArrowRight } from 'lucide-react';
import { isFirebaseClientConfigured, listPublicStories, type PublicStory } from '@/lib/firebase-client';

interface Props {
  basePath: string;
}

export default function DiscoverView({ basePath }: Props) {
  const [stories, setStories] = useState<PublicStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseClientConfigured()) {
      setError('此功能需要 Firebase 設定，請聯絡網站管理員。');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await listPublicStories(30);
        if (!cancelled) setStories(list);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? '載入失敗');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
            <Globe className="h-7 w-7" />
            故事瀏覽館
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            使用者公開分享的 5W1H 故事。每個故事 90 天後自動過期。
          </p>
        </div>
        <Button onClick={() => { window.location.href = `${basePath}/`; }} variant="outline" size="sm">
          <Home className="mr-2 h-4 w-4" />
          回主頁編輯故事
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-destructive">
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && stories.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-10 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <h2 className="text-lg font-semibold mb-2">還沒有公開故事</h2>
            <p className="text-sm text-muted-foreground mb-4">成為第一個分享公開故事的人吧！</p>
            <Button onClick={() => { window.location.href = `${basePath}/`; }}>
              <ArrowRight className="mr-2 h-4 w-4" />
              開始創作
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && stories.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stories.map(s => {
            const date = s.createdAt?.toDate?.()
              ? new Date(s.createdAt.toDate()).toLocaleDateString('zh-TW', { year: 'numeric', month: 'numeric', day: 'numeric' })
              : '';
            const preview = s.story.slice(0, 100) + (s.story.length > 100 ? '…' : '');
            const href = `${basePath}/#/s/${s.id}`;
            return (
              <Card
                key={s.id}
                className="group hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer"
              >
                <Link href={href} className="block">
                  <CardHeader className="p-5 pb-2">
                    <CardTitle className="text-lg text-primary line-clamp-2 group-hover:text-accent transition-colors">
                      {s.title}
                    </CardTitle>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>{s.ownerName ?? '匿名'}</span>
                      <span>{date}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-2">
                    <p className="text-sm text-foreground/80 line-clamp-3">{preview}</p>
                    <p className="text-xs text-primary mt-3 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      閱讀完整故事 →
                    </p>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
