"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Copy, ExternalLink, Check, Link2, Loader2, Globe, Lock } from 'lucide-react';

interface Props {
  /** Phase 1: pre-save settings (isPublic, etc.). Null = closed. */
  preSaveOpen: boolean;
  onPreSaveCancel: () => void;
  onPreSaveSubmit: (opts: { isPublic: boolean }) => Promise<void> | void;
  isSaving: boolean;

  /** Phase 2: result url after save. Null = no result yet. */
  resultUrl: string | null;
  onResultClose: () => void;
}

const STORAGE_KEY = 'aura.share.lastIsPublic';

export default function ShareLinkDialog({
  preSaveOpen, onPreSaveCancel, onPreSaveSubmit, isSaving,
  resultUrl, onResultClose,
}: Props) {
  const [isPublic, setIsPublic] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore last-used isPublic preference
  useEffect(() => {
    if (preSaveOpen) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) setIsPublic(stored === 'true');
      } catch { /* ignore */ }
    }
  }, [preSaveOpen]);

  // Auto-attempt copy on result open
  useEffect(() => {
    if (!resultUrl) return;
    setCopied(false);
    const timer = setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(resultUrl);
        setCopied(true);
      } catch {
        // user can click Copy button
      }
      inputRef.current?.select();
    }, 80);
    return () => clearTimeout(timer);
  }, [resultUrl]);

  const submit = async () => {
    try { localStorage.setItem(STORAGE_KEY, String(isPublic)); } catch { /* ignore */ }
    await onPreSaveSubmit({ isPublic });
  };

  const copy = async () => {
    if (!resultUrl) return;
    try {
      window.focus();
      await navigator.clipboard.writeText(resultUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.select();
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch {
        alert('複製失敗，請手動 Ctrl+C / Cmd+C');
      }
    }
  };

  // ─── Phase 1: pre-save settings ───
  if (preSaveOpen && !resultUrl) {
    return (
      <Dialog open={true} onOpenChange={(v) => { if (!v && !isSaving) onPreSaveCancel(); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              產生分享連結
            </DialogTitle>
            <DialogDescription>
              連結 90 天後自動失效。可以選擇要不要把這個故事公開到「故事瀏覽頁」。
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div
              className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${isPublic ? 'border-primary bg-primary/5' : 'border-border'}`}
              onClick={() => setIsPublic(true)}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="public-switch" className="text-base font-semibold cursor-pointer">公開到故事瀏覽頁</Label>
                    <Switch id="public-switch" checked={isPublic} onCheckedChange={setIsPublic} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    其他老師、家長、學生可以在「瀏覽」頁看到你的故事。建立有趣的閱讀社群。
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`rounded-lg border-2 p-4 cursor-pointer transition-colors ${!isPublic ? 'border-primary bg-primary/5' : 'border-border'}`}
              onClick={() => setIsPublic(false)}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <Label className="text-base font-semibold cursor-pointer">只給有連結的人看</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    僅限拿到網址的人能打開，不會出現在瀏覽頁。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onPreSaveCancel} disabled={isSaving}>
              取消
            </Button>
            <Button onClick={submit} disabled={isSaving} className="bg-primary text-primary-foreground">
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />產生中…</>
              ) : (
                <><Link2 className="mr-2 h-4 w-4" />產生連結</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ─── Phase 2: result URL with copy/open ───
  if (resultUrl) {
    return (
      <Dialog open={true} onOpenChange={(v) => { if (!v) onResultClose(); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              分享連結已產生
            </DialogTitle>
            <DialogDescription>
              這個連結可以給家長 / 同事看完整故事。**90 天後自動失效**。
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              ref={inputRef}
              value={resultUrl}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
              onClick={(e) => e.currentTarget.select()}
              className="font-mono text-sm bg-muted/50"
              aria-label="分享連結"
            />
            <p className="text-xs text-muted-foreground mt-2">
              💡 上面的網址已經幫你選好，可以直接按 Ctrl+C / Cmd+C 複製。
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-between flex-wrap">
            <Button variant="outline" onClick={() => window.open(resultUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink className="mr-2 h-4 w-4" />
              開新分頁預覽
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onResultClose}>關閉</Button>
              <Button onClick={copy} className="bg-primary text-primary-foreground">
                {copied ? (
                  <><Check className="mr-2 h-4 w-4" />已複製</>
                ) : (
                  <><Copy className="mr-2 h-4 w-4" />複製</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
