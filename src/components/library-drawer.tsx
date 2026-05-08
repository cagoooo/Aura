"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Loader2, Trash2, BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { listLibrary, deleteFromLibrary, type SavedStory } from '@/lib/firebase-client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onLoadStory: (story: SavedStory) => void;
}

export default function LibraryDrawer({ open, onOpenChange, onLoadStory }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async (uid: string) => {
    setLoading(true);
    try {
      const list = await listLibrary(uid);
      setStories(list);
    } catch (e) {
      console.error('Failed to load library:', e);
      toast({ variant: "destructive", title: "載入失敗", description: "無法讀取故事庫，請稍後再試。" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user) refresh(user.uid);
  }, [open, user]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (!confirm('確定刪除這個故事嗎？刪除後無法復原。')) return;
    try {
      await deleteFromLibrary(user.uid, id);
      setStories(prev => prev.filter(s => s.id !== id));
      toast({ title: "已刪除" });
    } catch (e) {
      toast({ variant: "destructive", title: "刪除失敗" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            我的故事庫
          </SheetTitle>
          <SheetDescription>
            這裡收藏你合成過的所有故事。點擊載入回主畫面繼續編輯。
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!loading && stories.length === 0 && (
            <div className="text-center py-12 px-4 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">還沒有儲存的故事。</p>
              <p className="text-xs mt-1">每次按「合成內容」成功，就會自動存進來。</p>
            </div>
          )}

          {!loading && stories.length > 0 && (
            <ul className="space-y-2 pb-4">
              {stories.map(s => {
                const date = s.createdAt?.toDate?.()
                  ? new Date(s.createdAt.toDate()).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '剛剛';
                const preview = s.story.slice(0, 80) + (s.story.length > 80 ? '…' : '');
                return (
                  <li
                    key={s.id}
                    className="group rounded-lg border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all p-3"
                  >
                    <button
                      onClick={() => {
                        onLoadStory(s);
                        onOpenChange(false);
                      }}
                      className="w-full text-left"
                    >
                      <h3 className="font-semibold text-base text-primary line-clamp-1">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
                      <p className="text-sm text-foreground/70 mt-1.5 line-clamp-2">{preview}</p>
                    </button>
                    <div className="flex justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                        className="h-7 px-2 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        刪除
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
