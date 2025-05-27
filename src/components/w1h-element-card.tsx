"use client";

import type { W1HElement } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Unlock, Shuffle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface W1HElementCardProps {
  element: W1HElement;
  value: string;
  isLocked: boolean;
  isLoading: boolean;
  onValueChange: (value: string) => void;
  onRandom: () => void;
  onToggleLock: () => void;
}

export default function W1HElementCard({
  element,
  value,
  isLocked,
  isLoading,
  onValueChange,
  onRandom,
  onToggleLock,
}: W1HElementCardProps) {
  return (
    <Card className="flex flex-col shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl font-semibold text-primary">{element.label}</CardTitle>
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onToggleLock} aria-label={isLocked ? '解鎖' : '鎖定'}>
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
        <Textarea
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={element.placeholder}
          className="flex-grow min-h-[100px] text-base rounded-md shadow-inner"
          disabled={isLocked}
          aria-label={element.label}
        />
        <Button
          onClick={onRandom}
          disabled={isLocked || isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-md"
          aria-label={`隨機產生${element.label}`}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Shuffle className="h-5 w-5 mr-2" />
          )}
          隨機產生
        </Button>
      </CardContent>
    </Card>
  );
}
