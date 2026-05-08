"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, ExternalLink, Check, Link2 } from 'lucide-react';

interface Props {
  open: boolean;
  url: string | null;
  onClose: () => void;
}

/**
 * After saveStory succeeds, we open this. Robust to the Chrome
 * "Document is not focused" clipboard error caused by Turnstile's
 * invisible challenge iframe stealing focus mid-flow.
 *
 * - Auto-attempt clipboard write on open (best effort)
 * - Always show the URL in a selectable input
 * - Manual Copy button works because the click is a fresh user gesture
 *   that puts the parent document back in focus
 */
export default function ShareLinkDialog({ open, url, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Try silent copy on open. Fail silently — user can click the button.
  useEffect(() => {
    if (!open || !url) return;
    setCopied(false);
    const timer = setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
      } catch {
        // Focus / permission issue → user must click Copy button
      }
      // Auto-select the URL for keyboard Cmd+C as a third fallback
      inputRef.current?.select();
    }, 80);
    return () => clearTimeout(timer);
  }, [open, url]);

  const copy = async () => {
    if (!url) return;
    try {
      // Re-focus the document before write — defends against Turnstile iframe
      // having stolen focus during the prior async chain.
      window.focus();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // execCommand fallback for older browsers / focus-stuck cases
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
        alert('複製失敗，請手動選取網址後按 Ctrl+C / Cmd+C');
      }
    }
  };

  const open_ = () => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            分享連結已產生
          </DialogTitle>
          <DialogDescription>
            這個連結可以給家長 / 同事看完整故事。**90 天後自動失效**。
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Input
            ref={inputRef}
            value={url ?? ''}
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
          <Button variant="outline" onClick={open_} disabled={!url}>
            <ExternalLink className="mr-2 h-4 w-4" />
            開新分頁預覽
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>關閉</Button>
            <Button onClick={copy} disabled={!url} className="bg-primary text-primary-foreground">
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
