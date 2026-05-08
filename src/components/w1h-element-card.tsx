
"use client";

import React, { useEffect, useRef } from 'react';
import type { W1HElement } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Lock, Unlock, Shuffle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, assetPath } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface W1HElementCardProps {
  id: string; // Ensure id is part of props
  element: W1HElement;
  value: string;
  isLocked: boolean;
  isLoading: boolean; // Individual loading state for this card
  onValueChange: (value: string) => void;
  onRandom: () => void;
  onToggleLock: () => void;
  mainOperationInProgress?: boolean; // True if a global operation (grammar, consistency, synthesis) is active
  cardClassName?: string;
}

export default function W1HElementCard({
  id,
  element,
  value,
  isLocked,
  isLoading, // This card's specific loading state
  onValueChange,
  onRandom,
  onToggleLock,
  mainOperationInProgress = false,
  cardClassName,
}: W1HElementCardProps) {
  const randomButtonText = "隨機產生";
  const randomButtonAriaLabel = `隨機產生${element.label}`;
  
  const isRandomButtonDisabled = isLocked || isLoading || mainOperationInProgress;
  const isTextareaDisabled = isLocked || mainOperationInProgress;
  const isLockButtonDisabled = isLoading || mainOperationInProgress;

  const prevIsLoadingRef = useRef(isLoading);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading && value) {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = rect.top / window.innerHeight; 

        confetti({
          particleCount: 80,
          spread: 60,
          origin: { x, y },
          zIndex: 10000,
          angle: 90, 
          startVelocity: 25,
          ticks: 150, 
          colors: ['#FFC700', '#FF8A00', '#4285F4', '#34A853', '#EA4335']
        });
        try {
          new Audio(assetPath('/sounds/confetti-short.mp3')).play().catch(e => console.warn("Could not play confetti sound:", e));
        } catch (e) {
          console.warn("Audio context error for confetti sound:", e);
        }
      }
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading, value]);

  return (
    <Card 
      ref={cardRef} 
      id={id} // Use the passed id prop
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-200 ease-out hover:shadow-xl hover:-translate-y-1",
        cardClassName
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-semibold text-primary">{element.label}</CardTitle>
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onToggleLock} 
                aria-label={isLocked ? '解鎖' : '鎖定'} 
                disabled={isLockButtonDisabled}
              >
                {isLocked ? <Lock className="h-5 w-5 text-accent" /> : <Unlock className="h-5 w-5 text-muted-foreground" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isLocked ? '解鎖此項目' : '鎖定此項目'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="flex flex-col flex-grow gap-4">
        {isLoading ? (
          // Skeleton lines mimic 2-3 rows of text — feels like AI is "drafting"
          <div className="flex-grow min-h-[100px] flex flex-col justify-center gap-2.5 px-3" aria-label="AI 正在產生內容…" role="status">
            <Skeleton className="h-3.5 w-[88%] bg-primary/15" />
            <Skeleton className="h-3.5 w-[72%] bg-primary/15" />
            <Skeleton className="h-3.5 w-[55%] bg-primary/15" />
          </div>
        ) : (
          <Textarea
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={element.placeholder}
            className="flex-grow min-h-[100px] text-base rounded-md shadow-inner bg-background/50 dark:bg-card animate-in fade-in-0 duration-300"
            disabled={isTextareaDisabled}
            aria-label={element.label}
          />
        )}
        <Button
          onClick={onRandom}
          disabled={isRandomButtonDisabled}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-md"
          aria-label={randomButtonAriaLabel}
        >
          {isLoading ? ( 
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Shuffle className="h-5 w-5 mr-2" />
          )}
          {randomButtonText}
        </Button>
      </CardContent>
    </Card>
  );
}
