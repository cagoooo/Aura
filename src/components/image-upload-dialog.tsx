"use client";

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Camera, Loader2, X, Upload } from 'lucide-react';

const MAX_DIMENSION = 1024;
const TARGET_QUALITY = 0.85;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAnalyze: (dataUrl: string) => Promise<void>;  // throws on failure
  isAnalyzing: boolean;
}

/**
 * Resize an image to MAX_DIMENSION on its longest side and re-encode as JPEG.
 * Returns a data URL roughly 50–500 KB depending on content.
 */
async function compressImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('無法載入圖片'));
      el.src = objectUrl;
    });
    const longSide = Math.max(img.width, img.height);
    const scale = longSide > MAX_DIMENSION ? MAX_DIMENSION / longSide : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context 無法建立');
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', TARGET_QUALITY);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function ImageUploadDialog({ open, onOpenChange, onAnalyze, isAnalyzing }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreviewUrl(null);
    setErrorMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('請選擇圖片檔（JPG / PNG / WebP）');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('檔案太大，請使用 10MB 以下的圖片。');
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setPreviewUrl(dataUrl);
    } catch (err: any) {
      setErrorMsg(err?.message ?? '壓縮圖片失敗');
    }
  };

  const handleAnalyzeClick = async () => {
    if (!previewUrl) return;
    setErrorMsg(null);
    try {
      await onAnalyze(previewUrl);
      // success — parent will close dialog
      reset();
    } catch (err: any) {
      console.error('Analyze image failed:', err);
      setErrorMsg(err?.message ?? '分析圖片失敗，請換一張再試。');
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !isAnalyzing) {
          reset();
          onOpenChange(false);
        } else {
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            看圖編故事
          </DialogTitle>
          <DialogDescription>
            上傳一張圖片，AI 會根據圖片**自由發想**一個 5W1H 故事概念，自動填入 6 張卡片。
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {!previewUrl ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              role="button"
              tabIndex={0}
              className="border-2 border-dashed border-primary/40 rounded-lg p-8 text-center cursor-pointer hover:bg-primary/5 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto text-primary/60 mb-2" />
              <p className="text-sm text-foreground">
                點擊選擇圖片
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                支援 JPG / PNG / WebP，最大 10 MB（自動壓縮上傳）
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="預覽圖片"
                className="w-full h-auto max-h-[300px] object-contain rounded-md border border-border bg-muted"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={reset}
                disabled={isAnalyzing}
                aria-label="移除圖片"
                className="absolute top-2 right-2 h-8 w-8 bg-background/80 hover:bg-background"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isAnalyzing}
          />

          {errorMsg && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errorMsg}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAnalyzing}>
            取消
          </Button>
          <Button
            onClick={handleAnalyzeClick}
            disabled={!previewUrl || isAnalyzing}
            className="bg-primary text-primary-foreground"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                AI 分析中…
              </>
            ) : (
              <>
                <Camera className="mr-2 h-4 w-4" />
                開始分析
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
