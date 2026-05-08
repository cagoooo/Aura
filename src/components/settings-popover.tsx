"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings2, Tv } from 'lucide-react';
import {
  STORY_STYLES, GRADE_LEVELS,
  type StoryStyle, type GradeLevel,
} from '@/hooks/use-app-settings';

interface Props {
  style: StoryStyle;
  gradeLevel: GradeLevel;
  liveMode: boolean;
  onChangeStyle: (s: StoryStyle) => void;
  onChangeGrade: (g: GradeLevel) => void;
  onToggleLiveMode: (v: boolean) => void;
}

export default function SettingsPopover({
  style, gradeLevel, liveMode,
  onChangeStyle, onChangeGrade, onToggleLiveMode,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="開啟設定"
          className="text-muted-foreground hover:text-primary"
        >
          <Settings2 className="h-5 w-5 sm:mr-1" />
          <span className="hidden sm:inline">設定</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] max-h-[70vh] overflow-y-auto">
        <div className="space-y-5">

          {/* Live Mode */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Tv className="h-4 w-4" />
                  課堂模式（投影適用）
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  字級加大、隱藏次要 UI、減少分心。F11 全螢幕效果最好。
                </p>
              </div>
              <Switch checked={liveMode} onCheckedChange={onToggleLiveMode} aria-label="切換課堂模式" />
            </div>
          </section>

          {/* Style */}
          <section>
            <Label className="text-sm font-semibold mb-2 block">故事風格</Label>
            <p className="text-xs text-muted-foreground mb-2">
              影響「全部隨機」「合成內容」「看圖編故事」產出的風格。
            </p>
            <RadioGroup value={style} onValueChange={(v) => onChangeStyle(v as StoryStyle)}>
              <div className="grid grid-cols-2 gap-2">
                {STORY_STYLES.map(s => (
                  <Label
                    key={s.value}
                    htmlFor={`style-${s.value}`}
                    className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-accent/30 has-[:checked]:bg-primary/10 has-[:checked]:border-primary"
                  >
                    <RadioGroupItem value={s.value} id={`style-${s.value}`} className="sr-only" />
                    <span className="text-base">{s.emoji}</span>
                    <span className="text-sm">{s.label}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </section>

          {/* Grade level */}
          <section>
            <Label className="text-sm font-semibold mb-2 block">適用年級（語文難度）</Label>
            <p className="text-xs text-muted-foreground mb-2">
              對齊九年一貫課綱：低年級用詞簡單、句短；高年級可用較複雜句構與詞彙。
            </p>
            <RadioGroup value={gradeLevel} onValueChange={(v) => onChangeGrade(v as GradeLevel)}>
              <div className="space-y-1.5">
                {GRADE_LEVELS.map(g => (
                  <Label
                    key={g.value}
                    htmlFor={`grade-${g.value}`}
                    className="flex items-center gap-2 rounded-md border border-border p-2 cursor-pointer hover:bg-accent/30 has-[:checked]:bg-primary/10 has-[:checked]:border-primary"
                  >
                    <RadioGroupItem value={g.value} id={`grade-${g.value}`} />
                    <span className="text-sm">{g.label}</span>
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </section>

        </div>
      </PopoverContent>
    </Popover>
  );
}
