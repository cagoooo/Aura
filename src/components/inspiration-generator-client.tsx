
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { W1HKey } from '@/lib/constants';
import { W1H_ELEMENTS, ALL_W1H_KEYS } from '@/lib/constants';
import W1HElementCard from '@/components/w1h-element-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  consistencyCheck, type ConsistencyCheckInput, type ConsistencyCheckOutput,
  storySynthesis, type StorySynthesisInput,
  randomElementGenerate, type RandomElementGenerationInput,
  randomElementBulk,
  grammarImproveBulk,
  analyzeImage,
  saveStory,
} from '@/lib/api';
import ImageUploadDialog from '@/components/image-upload-dialog';
import ShareLinkDialog from '@/components/share-link-dialog';
import LibraryDrawer from '@/components/library-drawer';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useAuth } from '@/components/auth-provider';
import { loadDraft, saveDraft, saveStoryToLibrary, type SavedStory } from '@/lib/firebase-client';
import { Loader2, CheckCircle2, Shuffle, BookText, Copy, FileText, Check, ThumbsUp, Wand2, Printer, ChevronDown, Camera, Presentation, Share2, Link2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import confetti from 'canvas-confetti';
import { cn, assetPath } from '@/lib/utils';
import TurnstileWidget, { type TurnstileWidgetHandle } from '@/components/turnstile-widget';

type W1HState = {
  [key in W1HKey]: {
    text: string;
    isLocked: boolean;
  };
};

interface SynthesizedContent {
  title: string;
  story: string;
}

interface RefinementChange {
  label: string;
  original: string;
  refined: string;
}

const W1H_CARD_COLORS: Record<W1HKey, string> = {
  who: 'bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800',
  what: 'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800',
  when: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800',
  where: 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800',
  why: 'bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800',
  how: 'bg-teal-50 dark:bg-teal-950 border-teal-200 dark:border-teal-800',
};


const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper component to style suggestion lines
const StyledSuggestionLine = ({ text }: { text: string }) => {
  const trimmedLine = text.trimStart();
  const leadingSpace = text.substring(0, text.indexOf(trimmedLine));

  const elementMatch = trimmedLine.match(/^(關於「.+?」元素)：(.*)/);
  if (elementMatch) {
    return (
      <>
        {leadingSpace}
        <span className="font-semibold text-primary">{elementMatch[1]}</span>
        {elementMatch[2].trimStart()}
      </>
    );
  }

  const problemMatch = trimmedLine.match(/^(問題點)：(.*)/);
  if (problemMatch) {
    return (
      <>
        {leadingSpace}
        <span className="font-semibold text-destructive">{problemMatch[1]}</span>
        {problemMatch[2].trimStart()}
      </>
    );
  }

  const adviceMatch = trimmedLine.match(/^(建議調整)：(.*)/);
  if (adviceMatch) {
    return (
      <>
        {leadingSpace}
        <span className="font-semibold text-green-600 dark:text-green-500">{adviceMatch[1]}</span>
        {adviceMatch[2].trimStart()}
      </>
    );
  }
  
  if (trimmedLine.match(/^(\d+\.|\-)\s/)) {
    return <>{text}</>; 
  }

  return <>{text}</>;
};


export default function InspirationGeneratorClient() {
  const { toast } = useToast();
  const [w1hData, setW1hData] = useState<W1HState>(() => {
    // Optimistic UI: instantly fill from W1H_ELEMENTS.options so user sees
    // 6 example ideas immediately (0s perceived). The bulk AI call below
    // will swap these for fresh AI-generated text once it finishes.
    const initialState = {} as W1HState;
    for (const key of ALL_W1H_KEYS) {
      const opts = W1H_ELEMENTS[key].options;
      initialState[key] = {
        text: opts[Math.floor(Math.random() * opts.length)],
        isLocked: false,
      };
    }
    return initialState;
  });

  const [recentSessionSuggestions, setRecentSessionSuggestions] = useState<Record<W1HKey, string[]>>(() => {
    const initialState = {} as Record<W1HKey, string[]>;
    for (const key of ALL_W1H_KEYS) {
      initialState[key] = [];
    }
    return initialState;
  });


  const [isLoading, setIsLoading] = useState({
    grammar: false,
    consistency: false,
    randomAll: false,
    synthesis: false,
    analyze: false,
    share: false,
    elements: {} as Record<W1HKey, boolean>,
  });

  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [shareDialogUrl, setShareDialogUrl] = useState<string | null>(null);
  const [sharePreSaveOpen, setSharePreSaveOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // Track whether the user just loaded a draft, to avoid the auto-saved
  // draft loop firing during the initial restoration commit.
  const draftHydratedRef = useRef(false);

  const { user, configured: authConfigured } = useAuth();

  const [randomAllProgress, setRandomAllProgress] = useState(0);
  const [grammarProgress, setGrammarProgress] = useState(0);
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyCheckOutput | null>(null);
  const [synthesizedContent, setSynthesizedContent] = useState<SynthesizedContent | null>(null);
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const typewriterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [refinementChanges, setRefinementChanges] = useState<RefinementChange[]>([]);
  const [isRefinementDialogOpen, setIsRefinementDialogOpen] = useState(false);
  const [grammarButtonFeedbackIcon, setGrammarButtonFeedbackIcon] = useState<'wand' | 'check' | 'thumbsUp'>('wand');
  const consistencyAlertKey = useRef(0);
  const storyCardKey = useRef(0);
  const synthesizedStoryCardRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<TurnstileWidgetHandle>(null);

  // App-wide settings (style / gradeLevel / liveMode)
  const { settings } = useAppSettings();

  // Speech recognition: ONE instance shared, parent tracks which card is
  // currently listening. Browsers only allow one active SR at a time.
  const speech = useSpeechRecognition();
  const [listeningKey, setListeningKey] = useState<W1HKey | null>(null);
  const handleMicToggle = useCallback((key: W1HKey) => {
    if (speech.isListening && listeningKey === key) {
      speech.stop();
      setListeningKey(null);
      return;
    }
    if (speech.isListening) speech.stop();
    setListeningKey(key);
    speech.start((finalText) => {
      setW1hData(prev => {
        const existing = prev[key].text.trim();
        const merged = existing ? `${existing}${finalText}` : finalText;
        return { ...prev, [key]: { ...prev[key], text: merged } };
      });
    });
  }, [speech, listeningKey]);
  // Reset listeningKey when SR ends naturally
  useEffect(() => {
    if (!speech.isListening && listeningKey !== null) {
      // Small delay so the last interim has chance to commit
      const t = setTimeout(() => setListeningKey(null), 300);
      return () => clearTimeout(t);
    }
  }, [speech.isListening, listeningKey]);
  // Surface SR errors as toasts
  useEffect(() => {
    if (speech.error) {
      toast({ variant: "destructive", title: "語音輸入失敗", description: speech.error });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.error]);

  const getTurnstileToken = useCallback(async (): Promise<string | undefined> => {
    try {
      return await turnstileRef.current?.getToken();
    } catch (e) {
      console.warn('Turnstile token fetch failed, proceeding without:', e);
      return undefined;
    }
  }, []);

  // Settings to attach to every server call. Shorthand getter so we don't
  // forget on any single call site.
  const callExtras = useCallback(async () => ({
    turnstileToken: await getTurnstileToken(),
    style: settings.style,
    gradeLevel: settings.gradeLevel,
  }), [getTurnstileToken, settings.style, settings.gradeLevel]);

  // #17 — Cold-start hint. Cloud Functions cold-start can take 2-5 sec on
  // a fresh / scaled-to-zero instance. Show a one-time friendly toast so
  // users don't think the page is broken while waiting for the first call.
  const coldStartShownRef = useRef(false);
  const coldStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armColdStartHint = useCallback(() => {
    if (coldStartShownRef.current) return;
    if (coldStartTimerRef.current) clearTimeout(coldStartTimerRef.current);
    coldStartTimerRef.current = setTimeout(() => {
      if (coldStartShownRef.current) return;
      coldStartShownRef.current = true;
      toast({
        title: "🛌 AI 正在喚醒…",
        description: "第一次呼叫 Cloud Functions 比較慢（~3 秒），後續會很快！",
        duration: 4000,
      });
    }, 1500);
  }, [toast]);
  const disarmColdStartHint = useCallback(() => {
    if (coldStartTimerRef.current) {
      clearTimeout(coldStartTimerRef.current);
      coldStartTimerRef.current = null;
    }
    // Mark shown so we don't fire it later in the session
    coldStartShownRef.current = true;
  }, []);


  const handleTextChange = (key: W1HKey, text: string) => {
    setW1hData((prev) => ({ ...prev, [key]: { ...prev[key], text } }));
  };

  const handleToggleLock = (key: W1HKey) => {
    setW1hData((prev) => ({ ...prev, [key]: { ...prev[key], isLocked: !prev[key].isLocked } }));
  };

  const handleRandomGenerate = useCallback(async (key: W1HKey) => {
    if (w1hData[key].isLocked) return;

    setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: true } }));
    try {
      const allAvoidOptions = [
        ...W1H_ELEMENTS[key].options,
        ...(recentSessionSuggestions[key] || [])
      ];
      const uniqueAvoidOptions = Array.from(new Set(allAvoidOptions));

      const turnstileToken = await getTurnstileToken();
      const input: RandomElementGenerationInput = {
        elementType: key,
        elementLabel: W1H_ELEMENTS[key].label,
        existingOptions: uniqueAvoidOptions,
        turnstileToken,
        style: settings.style,
        gradeLevel: settings.gradeLevel,
      };
      const result = await randomElementGenerate(input);
      setW1hData((prev) => ({ ...prev, [key]: { ...prev[key], text: result.generatedText } }));

      setRecentSessionSuggestions(prev => {
        const updatedSuggestions = [...(prev[key] || [])];
        if (result.generatedText && !updatedSuggestions.includes(result.generatedText)) {
          updatedSuggestions.unshift(result.generatedText);
        }
        return {
          ...prev,
          [key]: updatedSuggestions.slice(0, 5) // Keep last 5
        };
      });

    } catch (error) {
      console.error(`Random generation error for ${key}:`, error);
      const randomText = getRandomItem(W1H_ELEMENTS[key].options);
      setW1hData((prev) => ({ ...prev, [key]: { ...prev[key], text: randomText } }));
      toast({ variant: "destructive", title: "隨機產生失敗", description: `為「${W1H_ELEMENTS[key].label}」項目隨機產生內容時發生錯誤，已使用備用選項。` });
    } finally {
      setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: false } }));
    }
  }, [w1hData, toast, recentSessionSuggestions, getTurnstileToken]);

  const handleRandomAll = async () => {
    setIsLoading(prev => ({ ...prev, randomAll: true }));
    setRandomAllProgress(0);
    setSynthesizedContent(null);
    setConsistencyResult(null);

    const elementsToProcessKeys = ALL_W1H_KEYS.filter(key => !w1hData[key].isLocked);
    const total = elementsToProcessKeys.length;

    if (total === 0) {
      setIsLoading(prev => ({ ...prev, randomAll: false }));
      setRandomAllProgress(0);
      toast({ title: "全部隨機", description: "所有項目均已鎖定，未產生新內容。" });
      return;
    }

    // Mark unlocked cards loading so spinners show.
    setIsLoading(prev => ({
      ...prev,
      elements: elementsToProcessKeys.reduce(
        (acc, k) => ({ ...acc, [k]: true }),
        { ...prev.elements }
      ),
    }));
    setRandomAllProgress(15);

    const items = elementsToProcessKeys.map((key) => ({
      elementType: key,
      elementLabel: W1H_ELEMENTS[key].label,
      existingOptions: Array.from(new Set([
        ...W1H_ELEMENTS[key].options,
        ...(recentSessionSuggestions[key] || []),
      ])),
    }));

    let generatedCount = 0;
    armColdStartHint();
    try {
      const turnstileToken = await getTurnstileToken();
      setRandomAllProgress(40);

      const { results } = await randomElementBulk({ items, turnstileToken, style: settings.style, gradeLevel: settings.gradeLevel });
      disarmColdStartHint();
      setRandomAllProgress(95);

      // Stagger the per-card text update + skeleton dismissal
      const STAGGER_MS = 120;
      elementsToProcessKeys.forEach((key, i) => {
        setTimeout(() => {
          const text = results[i]?.generatedText?.trim();
          if (text) {
            setW1hData(prev => ({ ...prev, [key]: { ...prev[key], text } }));
            setRecentSessionSuggestions(prev => {
              const updated = [...(prev[key] || [])];
              if (!updated.includes(text)) updated.unshift(text);
              return { ...prev, [key]: updated.slice(0, 5) };
            });
            generatedCount++;
          }
          setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: false } }));
        }, i * STAGGER_MS);
      });

      // Final state cleanup + toast after stagger completes
      setTimeout(() => {
        setIsLoading(prev => ({ ...prev, randomAll: false }));
        setRandomAllProgress(100);
        if (generatedCount > 0) {
          toast({ variant: "success", title: "全部隨機完畢", description: `已為 ${generatedCount} 個未鎖定項目產生新內容。` });
        }
      }, elementsToProcessKeys.length * STAGGER_MS);
    } catch (error) {
      console.error('Bulk random failed, falling back to default options:', error);
      disarmColdStartHint();
      setW1hData(prev => {
        const next = { ...prev };
        elementsToProcessKeys.forEach((key) => {
          next[key] = { ...next[key], text: getRandomItem(W1H_ELEMENTS[key].options) };
        });
        return next;
      });
      toast({ variant: "destructive", title: "全部隨機失敗", description: "AI 服務暫時不可用，已使用預設備用內容。" });
      setIsLoading(prev => ({
        ...prev,
        randomAll: false,
        elements: elementsToProcessKeys.reduce(
          (acc, k) => ({ ...acc, [k]: false }),
          { ...prev.elements }
        ),
      }));
    }
  };

  const handleGrammarRefinement = async () => {
    setIsLoading(prev => ({ ...prev, grammar: true }));
    setGrammarButtonFeedbackIcon('wand'); 
    setGrammarProgress(0);
    setConsistencyResult(null); 
    setSynthesizedContent(null);
    setRefinementChanges([]);

    const originalW1hData = JSON.parse(JSON.stringify(w1hData)) as W1HState; 
    const newW1hData = JSON.parse(JSON.stringify(w1hData)) as W1HState; 
    
    const elementsToRefine = ALL_W1H_KEYS.filter(k => newW1hData[k].text.trim() !== '');
    if (elementsToRefine.length === 0) {
      setIsLoading(prev => ({ ...prev, grammar: false }));
      return;
    }
    setGrammarProgress(15);

    // Bulk: 1 Turnstile token + parallel server-side Gemini calls.
    armColdStartHint();
    try {
      const turnstileToken = await getTurnstileToken();
      setGrammarProgress(40);
      const items = elementsToRefine.map(key => ({
        elementType: key,
        text: newW1hData[key].text,
        elementLabel: W1H_ELEMENTS[key].label,
      }));
      const { results } = await grammarImproveBulk({ items, turnstileToken, style: settings.style, gradeLevel: settings.gradeLevel });
      disarmColdStartHint();
      setGrammarProgress(95);
      elementsToRefine.forEach((key, i) => {
        const refined = results[i]?.refinedText;
        if (typeof refined === 'string') {
          newW1hData[key] = { ...newW1hData[key], text: refined };
        }
      });
    } catch (error) {
      console.error('Bulk grammar refinement failed:', error);
      toast({ variant: "destructive", title: "潤飾語法失敗", description: "AI 服務暫時不可用，所有項目保留原內容。" });
    }
    setGrammarProgress(100);
    setW1hData(newW1hData);

    const changesMade: RefinementChange[] = [];
    let actualModificationsCount = 0;
    for (const key of ALL_W1H_KEYS) {
      const originalTextForDialog = originalW1hData[key as W1HKey].text;
      const refinedTextForDialog = newW1hData[key as W1HKey].text;
      if (originalTextForDialog.trim() !== refinedTextForDialog.trim() && refinedTextForDialog.trim() !== '') { 
        changesMade.push({
          label: W1H_ELEMENTS[key as W1HKey].label,
          original: originalTextForDialog,
          refined: refinedTextForDialog,
        });
        actualModificationsCount++;
      } else if (originalTextForDialog.trim() && refinedTextForDialog.trim() === '') { 
         changesMade.push({
          label: W1H_ELEMENTS[key as W1HKey].label,
          original: originalTextForDialog,
          refined: refinedTextForDialog, 
        });
        actualModificationsCount++; 
      }
    }
    setRefinementChanges(changesMade);
    setIsLoading(prev => ({ ...prev, grammar: false }));
    
    if (actualModificationsCount > 0) {
      setGrammarButtonFeedbackIcon('check');
      try {
        new Audio(assetPath('/sounds/confetti-short.mp3')).play().catch(e => console.warn("Could not play short confetti sound:", e));
      } catch(e) {
        console.warn("Error triggering sound for grammar refinement:", e);
      }
      setIsRefinementDialogOpen(true); 
      toast({ variant: "success", title: "語法潤飾完畢", description: `已為 ${actualModificationsCount} 個項目提升語法與流暢度。請查看詳細變更。` });
    } else if (elementsToRefine.length > 0 && ALL_W1H_KEYS.some(k => originalW1hData[k].text.trim() !== '')) { 
      setGrammarButtonFeedbackIcon('thumbsUp');
      toast({ variant: "success", title: "語法檢查完畢", description: "所有項目的語法均已相當通順，無需調整。" });
    } else if (elementsToRefine.length > 0) { 
      toast({ variant: "success", title: "語法潤飾", description: "沒有可潤飾的內容。" });
      setGrammarButtonFeedbackIcon('wand'); 
    }

    if(actualModificationsCount > 0 || (elementsToRefine.length > 0 && ALL_W1H_KEYS.some(k => originalW1hData[k].text.trim() !== ''))){
      setTimeout(() => {
        setGrammarButtonFeedbackIcon('wand');
      }, 3000);
    }
  };

  const handleConsistencyCheck = async () => {
    setIsLoading(prev => ({ ...prev, consistency: true }));
    setConsistencyResult(null);
    setSynthesizedContent(null);
    const turnstileToken = await getTurnstileToken();
    const currentTexts: ConsistencyCheckInput = {
      who: w1hData.who.text,
      what: w1hData.what.text,
      when: w1hData.when.text,
      where: w1hData.where.text,
      why: w1hData.why.text,
      how: w1hData.how.text,
      turnstileToken,
      style: settings.style,
      gradeLevel: settings.gradeLevel,
    };

    armColdStartHint();
    try {
      const result = await consistencyCheck(currentTexts);
      disarmColdStartHint();
      setConsistencyResult(result);
      consistencyAlertKey.current += 1; 
      if (result.isConsistent || (!result.isConsistent && result.suggestions.length > 0)) {
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6, x: 0.5 },
            zIndex: 10000,
            angle: 90,
            startVelocity: 30,
            colors: ['#2196F3', '#FF9800', '#FFFFFF', '#4CAF50', '#FFC107'],
          });
          new Audio(assetPath('/sounds/confetti-short.mp3')).play().catch(e => console.warn("Could not play short confetti sound:", e));
        } catch (e) {
          console.warn("Audio context error for confetti sound:", e);
        }
      }

      if (result.isConsistent) {
        toast({ variant: "success", title: "內容一致性檢查完畢", description: "太棒了！目前的內容看起來前後一致。" });
      } else {
         toast({ variant: "success", title: "內容一致性檢查完畢", description: "提供了一些調整建議，請參考下方提示。" });
      }
    } catch (error) {
      console.error("Consistency check error:", error);
      toast({ variant: "destructive", title: "一致性檢查失敗", description: "服務發生錯誤，請稍後再試。" });
      setConsistencyResult({isConsistent: false, suggestions: ['進行一致性檢查時發生錯誤，無法提供建議。']});
      consistencyAlertKey.current += 1; 
    } finally {
      setIsLoading(prev => ({ ...prev, consistency: false }));
    }
  };

  const handleStorySynthesis = async () => {
    setIsLoading(prev => ({ ...prev, synthesis: true }));
    setSynthesizedContent(null);
    setConsistencyResult(null);
    const turnstileToken = await getTurnstileToken();
    const currentTexts: StorySynthesisInput = {
      who: w1hData.who.text,
      what: w1hData.what.text,
      when: w1hData.when.text,
      where: w1hData.where.text,
      why: w1hData.why.text,
      how: w1hData.how.text,
      turnstileToken,
      style: settings.style,
      gradeLevel: settings.gradeLevel,
    };

    const errorTitles = ['生成標題失敗', '內容生成受阻', '合成發生錯誤'];

    armColdStartHint();
    try {
      const result = await storySynthesis(currentTexts);
      disarmColdStartHint();
      setSynthesizedContent(result);
      storyCardKey.current += 1; 

      if (result && result.story && result.title && !errorTitles.includes(result.title)) {
        // #32 Auto-save to personal library if logged in
        if (authConfigured && user) {
          saveStoryToLibrary(user.uid, {
            title: result.title,
            story: result.story,
            w1h: {
              who: w1hData.who.text, what: w1hData.what.text,
              when: w1hData.when.text, where: w1hData.where.text,
              why: w1hData.why.text, how: w1hData.how.text,
            },
          }).catch(e => console.warn('Library save failed:', e));
        }
        // Start typewriter animation: ~3 chars per 30ms tick → 6-8s for typical
        // story length. Feels like AI is "thinking and writing".
        if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
        setTypewriterIndex(0);
        const fullLen = result.story.length;
        typewriterIntervalRef.current = setInterval(() => {
          setTypewriterIndex(prev => {
            const next = Math.min(prev + 3, fullLen);
            if (next >= fullLen && typewriterIntervalRef.current) {
              clearInterval(typewriterIntervalRef.current);
              typewriterIntervalRef.current = null;
            }
            return next;
          });
        }, 30);
        try {
           confetti({
            particleCount: 250, 
            spread: 120, 
            origin: { y: 0.5, x: 0.5 }, 
            zIndex: 10000,
            angle: 90,
            startVelocity: 45,
            gravity: 0.8,
            drift: 0,
            ticks: 300,
            colors: ['#FFC700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7B801', '#5F95FE', '#FAD02C'],
          });
          new Audio(assetPath('/sounds/confetti-grand.mp3')).play().catch(e => console.warn("Could not play grand confetti sound:", e));
        } catch (e) {
            console.warn("Audio context error for grand confetti sound:", e);
        }
        toast({ variant: "success", title: "內容合成成功", description: "已根據您的5W1H元素生成了一段故事靈感！" });
      } else {
        toast({ variant: "destructive", title: result.title || "內容合成失敗", description: result.story || "服務發生錯誤，請稍後再試。" });
      }
    } catch (error) {
      console.error("Story synthesis error:", error);
      toast({ variant: "destructive", title: "內容合成失敗", description: "服務發生錯誤，請稍後再試。" });
      setSynthesizedContent({ title: '合成標題失敗', story: '合成故事時遇到問題，請稍後再試。'});
      storyCardKey.current += 1; 
    } finally {
      setIsLoading(prev => ({ ...prev, synthesis: false }));
    }
  };

  // ─── #31 Auto-saved draft (logged-in users) ─────────────────────────
  // On login: load latest draft from Firestore and prefill cards.
  useEffect(() => {
    if (!authConfigured || !user) {
      draftHydratedRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const draft = await loadDraft(user.uid);
        if (cancelled || !draft) {
          draftHydratedRef.current = true;
          return;
        }
        // Restore cards from draft
        setW1hData(prev => {
          const next = { ...prev };
          for (const k of ALL_W1H_KEYS) {
            const text = draft.w1h[k];
            const isLocked = !!draft.locks?.[k];
            if (typeof text === 'string') next[k] = { text, isLocked };
          }
          return next;
        });
        toast({ variant: "success", title: "📂 已載入上次草稿", description: "從你上次的進度繼續編輯。" });
      } catch (e) {
        console.warn('Draft load failed (rules / network):', e);
      } finally {
        // mark hydrated either way so save effect can resume
        setTimeout(() => { draftHydratedRef.current = true; }, 200);
      }
    })();
    return () => { cancelled = true; };
  }, [authConfigured, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save draft (debounced 1.5s) on w1hData change
  useEffect(() => {
    if (!authConfigured || !user || !draftHydratedRef.current) return;
    const handle = setTimeout(() => {
      const w1h = ALL_W1H_KEYS.reduce((acc, k) => ({ ...acc, [k]: w1hData[k].text }), {} as any);
      const locks = ALL_W1H_KEYS.reduce((acc, k) => ({ ...acc, [k]: w1hData[k].isLocked }), {} as any);
      saveDraft(user.uid, { w1h, locks }).catch(e => console.warn('Draft save failed:', e));
    }, 1500);
    return () => clearTimeout(handle);
  }, [w1hData, authConfigured, user]);

  // Listen for "open library" event from header AuthMenu
  useEffect(() => {
    const open = () => setLibraryOpen(true);
    window.addEventListener('aura:open-library', open);
    return () => window.removeEventListener('aura:open-library', open);
  }, []);

  // Load a story from library back into the main UI
  const handleLoadFromLibrary = (story: SavedStory) => {
    setW1hData(prev => {
      const next = { ...prev };
      for (const k of ALL_W1H_KEYS) {
        const text = story.w1h[k];
        if (typeof text === 'string') next[k] = { ...next[k], text, isLocked: false };
      }
      return next;
    });
    setSynthesizedContent({ title: story.title, story: story.story });
    setTypewriterIndex(story.story.length);  // skip animation for restored stories
    toast({ variant: "success", title: "📖 已載入故事", description: story.title });
  };

  // #10 — Image → 5W1H
  const handleAnalyzeImage = async (imageDataUrl: string) => {
    setIsLoading(prev => ({ ...prev, analyze: true }));
    try {
      const turnstileToken = await getTurnstileToken();
      const result = await analyzeImage({ imageDataUrl, turnstileToken, style: settings.style, gradeLevel: settings.gradeLevel });
      // Replace all 6 cards (skip locked ones)
      setW1hData(prev => {
        const next = { ...prev };
        ALL_W1H_KEYS.forEach((key) => {
          if (prev[key].isLocked) return;
          const v = (result as any)[key];
          if (typeof v === 'string' && v.trim()) {
            next[key] = { ...next[key], text: v.trim() };
          }
        });
        return next;
      });
      setImageDialogOpen(false);
      toast({ variant: "success", title: "看圖編故事完成", description: "AI 已根據圖片填入 6 個 W1H 元素，開始你的故事吧！" });
    } catch (e: any) {
      console.error('analyzeImage failed:', e);
      throw e;  // dialog catches and shows in-dialog error
    } finally {
      setIsLoading(prev => ({ ...prev, analyze: false }));
    }
  };

  // #12 — Phase 1: open pre-save dialog to ask isPublic
  const handleShareStory = () => {
    if (!synthesizedContent || !synthesizedContent.story) return;
    setSharePreSaveOpen(true);
  };

  // #12 — Phase 2: actual save after user confirms isPublic in the dialog
  const handleShareSubmit = async (opts: { isPublic: boolean }) => {
    if (!synthesizedContent || !synthesizedContent.story) return;
    setIsLoading(prev => ({ ...prev, share: true }));
    try {
      const turnstileToken = await getTurnstileToken();
      const { id } = await saveStory({
        title: synthesizedContent.title,
        story: synthesizedContent.story,
        w1h: {
          who: w1hData.who.text, what: w1hData.what.text,
          when: w1hData.when.text, where: w1hData.where.text,
          why: w1hData.why.text, how: w1hData.how.text,
        },
        turnstileToken,
        isPublic: opts.isPublic,
        ownerName: user?.displayName ?? undefined,
      });
      const url = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/#/s/${id}`;
      setSharePreSaveOpen(false);
      setShareDialogUrl(url);
    } catch (e: any) {
      console.error('saveStory failed:', e);
      toast({ variant: "destructive", title: "分享失敗", description: e?.message ?? "請稍後再試。" });
    } finally {
      setIsLoading(prev => ({ ...prev, share: false }));
    }
  };

  // #11 — Open in Gamma / NotebookLM with prefilled story
  const buildSlidesPrompt = (): string => {
    if (!synthesizedContent) return '';
    return [
      `請根據以下 5W1H 故事概念，產生一份 8-10 頁的繁體中文教學簡報：`,
      ``,
      `標題：${synthesizedContent.title}`,
      ``,
      `誰：${w1hData.who.text}`,
      `什麼事：${w1hData.what.text}`,
      `什麼時候：${w1hData.when.text}`,
      `什麼地方：${w1hData.where.text}`,
      `為什麼：${w1hData.why.text}`,
      `如何發生：${w1hData.how.text}`,
      ``,
      `故事：`,
      synthesizedContent.story,
    ].join('\n');
  };

  const openInGamma = () => {
    const prompt = buildSlidesPrompt();
    const url = `https://gamma.app/create/generate?prompt=${encodeURIComponent(prompt)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    // Also copy to clipboard as backup if Gamma doesn't accept the param
    navigator.clipboard.writeText(prompt).catch(() => {});
    toast({ variant: "success", title: "開啟 Gamma 中…", description: "若 Gamma 沒自動帶入，你的故事已複製到剪貼簿。" });
  };

  const openInNotebookLM = () => {
    const prompt = buildSlidesPrompt();
    navigator.clipboard.writeText(prompt).catch(() => {});
    window.open('https://notebooklm.google.com/', '_blank', 'noopener,noreferrer');
    toast({ variant: "success", title: "開啟 NotebookLM 中…", description: "故事已複製到剪貼簿，貼到 NotebookLM 即可生成簡報。" });
  };

  useEffect(() => {
    if (synthesizedContent && synthesizedContent.story && synthesizedStoryCardRef.current) {
      requestAnimationFrame(() => {
        synthesizedStoryCardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      });
    }
  }, [synthesizedContent]);

  useEffect(() => {
    // Cleanup typewriter interval on unmount
    return () => {
      if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
    };
  }, []);

  // Keyboard shortcuts. Only fire when no input/textarea is focused, no
  // dialog is open, and no global operation is in flight.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (isRefinementDialogOpen) return;
      const busy = isLoading.randomAll || isLoading.grammar || isLoading.consistency || isLoading.synthesis;
      if (busy) return;

      // 1-6 → toggle lock on the corresponding card
      if (/^[1-6]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const key = ALL_W1H_KEYS[idx];
        if (key) {
          e.preventDefault();
          handleToggleLock(key);
        }
        return;
      }
      // letter shortcuts (case-insensitive)
      const k = e.key.toLowerCase();
      if (e.code === 'Space' || k === ' ') {
        e.preventDefault();
        handleRandomAll();
      } else if (k === 'g') {
        e.preventDefault();
        handleGrammarRefinement();
      } else if (k === 'c') {
        e.preventDefault();
        handleConsistencyCheck();
      } else if (k === 's') {
        e.preventDefault();
        handleStorySynthesis();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isRefinementDialogOpen]);

  type CopyFormat = 'plain' | 'markdown' | 'line' | 'w1h-only';

  const buildCopyText = (content: SynthesizedContent, format: CopyFormat): string => {
    const w1hLines = ALL_W1H_KEYS.map(k => `${W1H_ELEMENTS[k].label}：${w1hData[k].text || '—'}`);
    switch (format) {
      case 'plain':
        return `${content.title}\n\n${content.story}`;
      case 'markdown':
        return [
          `# ${content.title}`,
          '',
          '## 5W1H 元素',
          ...w1hLines.map(l => `- ${l}`),
          '',
          '## 故事',
          content.story,
          '',
          '---',
          '由 [5W1H 靈感發射器 Pro](https://cagoooo.github.io/Aura/) 產出',
        ].join('\n');
      case 'line':
        return [
          `📖 ${content.title}`,
          '',
          '✨ 5W1H 元素：',
          ...w1hLines.map(l => `・${l}`),
          '',
          '📝 故事：',
          content.story,
          '',
          '🚀 用 5W1H 靈感發射器 Pro產出',
          'https://cagoooo.github.io/Aura/',
        ].join('\n');
      case 'w1h-only':
        return w1hLines.join('\n');
    }
  };

  const handleCopySynthesizedStory = async (
    content: SynthesizedContent | null,
    format: CopyFormat = 'plain'
  ) => {
    if (!content || !content.story) return;
    const textToCopy = buildCopyText(content, format);
    const formatLabel: Record<CopyFormat, string> = {
      plain: '純文字',
      markdown: 'Markdown',
      line: 'LINE 訊息',
      'w1h-only': '6 個 W1H',
    };
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ variant: "success", title: "複製成功", description: `已複製成「${formatLabel[format]}」格式。` });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({ variant: "destructive", title: "複製失敗", description: "無法複製內容，請再試一次。" });
    }
  };

  // #11 — Slides generator dropdown (Gamma / NotebookLM deep links)
  const SlidesMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="生成簡報"
          title="一鍵生成教學簡報"
          className="text-primary hover:text-primary/80"
        >
          <Presentation className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuItem onClick={openInGamma}>
          ✨ 在 Gamma 開啟（自動帶 prompt）
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openInNotebookLM}>
          📓 在 NotebookLM 開啟（手動貼上）
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // CopyMenu must be defined inside component because handleCopy closes over state
  const CopyMenu = ({ onCopy }: { onCopy: (f: CopyFormat) => void }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label="複製選項"
          className="text-primary hover:text-primary/80 gap-1"
        >
          <Copy className="h-4 w-4" />
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem onClick={() => onCopy('plain')}>
          📄 純文字（標題 + 故事）
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCopy('markdown')}>
          📝 Markdown（含 6 個 W1H）
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCopy('line')}>
          💬 LINE 訊息（emoji + 連結）
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCopy('w1h-only')}>
          🎯 只複製 6 個 W1H
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const handleCopyConsistencySuggestions = async (suggestions: string[] | undefined) => {
    if (!suggestions || suggestions.length === 0) {
        toast({ variant: "default", title: "無內容可複製", description: "目前沒有一致性建議可以複製。" });
        return;
    }
    const textToCopy = suggestions.join('\n\n'); 
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ variant: "success", title: "複製成功", description: "一致性建議已複製到剪貼簿！" });
    } catch (err) {
      console.error('Failed to copy consistency suggestions: ', err);
      toast({ variant: "destructive", title: "複製失敗", description: "無法複製建議內容，請再試一次。" });
    }
  };
  
  useEffect(() => {
    // On mount: 6 cards already show optimistic placeholders from
    // W1H_ELEMENTS.options. Fire ONE bulk request to swap them with
    // fresh AI-generated text. Single Turnstile token + parallel
    // server-side Gemini calls → ~3s end-to-end vs ~6-10s before.
    const populateInitialElements = async () => {
      const items = ALL_W1H_KEYS.map((key) => ({
        elementType: key,
        elementLabel: W1H_ELEMENTS[key].label,
        existingOptions: Array.from(new Set([
          ...W1H_ELEMENTS[key].options,
          ...(recentSessionSuggestions[key] || []),
        ])),
      }));

      // Mark all 6 cards loading so the spinner shows over the optimistic text.
      setIsLoading(prev => ({
        ...prev,
        elements: ALL_W1H_KEYS.reduce(
          (acc, k) => ({ ...acc, [k]: true }),
          {} as Record<W1HKey, boolean>
        ),
      }));

      armColdStartHint();
      try {
        const turnstileToken = await getTurnstileToken();
        const { results } = await randomElementBulk({ items, turnstileToken, style: settings.style, gradeLevel: settings.gradeLevel });
        disarmColdStartHint();

        // #16 Stagger: reveal each card one at a time with a 120ms cascade
        // so the user sees a graceful "AI is drafting" effect instead of
        // 6 cards snapping at once. Each card's skeleton clears as its
        // text lands.
        const STAGGER_MS = 120;
        ALL_W1H_KEYS.forEach((key, i) => {
          setTimeout(() => {
            const generated = results[i]?.generatedText?.trim();
            if (generated) {
              setW1hData(prev => ({ ...prev, [key]: { ...prev[key], text: generated } }));
              setRecentSessionSuggestions(prev => {
                const updated = [...(prev[key] || [])];
                if (!updated.includes(generated)) updated.unshift(generated);
                return { ...prev, [key]: updated.slice(0, 5) };
              });
            }
            setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: false } }));
          }, i * STAGGER_MS);
        });

        // Toast fires after the last card lands so it feels intentional
        setTimeout(() => {
          toast({ variant: "success", title: "AI 靈感已填入！", description: "已為您產生 6 個全新 5W1H 點子。" });
        }, ALL_W1H_KEYS.length * STAGGER_MS);
      } catch (error) {
        console.error('Initial bulk generation failed; keeping optimistic placeholders:', error);
        // On error: clear all loading states immediately (no stagger to wait
        // for). Cards already have constants-based text from useState init.
        disarmColdStartHint();
        setIsLoading(prev => ({
          ...prev,
          elements: ALL_W1H_KEYS.reduce(
            (acc, k) => ({ ...acc, [k]: false }),
            {} as Record<W1HKey, boolean>
          ),
        }));
      }
      // Note: success path does NOT clear isLoading here — the stagger
      // setTimeouts above handle per-card loading=false themselves.
    };

    populateInitialElements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const isAnyMainButtonActive = isLoading.randomAll || isLoading.grammar || isLoading.consistency || isLoading.synthesis;
  const isAnyElementIndividuallyLoading = Object.values(isLoading.elements).some(Boolean);
  
  const disableCardInteractionsGlobally = isLoading.grammar || isLoading.consistency || isLoading.synthesis;


  const renderGrammarButtonIcon = () => {
    if (isLoading.grammar) {
      return <Loader2 className="mr-2 h-5 w-5 animate-spin" />;
    }
    switch (grammarButtonFeedbackIcon) {
      case 'check':
        return <Check className="mr-2 h-5 w-5 text-green-500" />;
      case 'thumbsUp':
        return <ThumbsUp className="mr-2 h-5 w-5 text-blue-500" />;
      default: 
        return <Wand2 className="mr-2 h-5 w-5" />; 
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <TurnstileWidget ref={turnstileRef} />
      <ImageUploadDialog
        open={imageDialogOpen}
        onOpenChange={setImageDialogOpen}
        onAnalyze={handleAnalyzeImage}
        isAnalyzing={isLoading.analyze}
      />
      <ShareLinkDialog
        preSaveOpen={sharePreSaveOpen}
        onPreSaveCancel={() => setSharePreSaveOpen(false)}
        onPreSaveSubmit={handleShareSubmit}
        isSaving={isLoading.share}
        resultUrl={shareDialogUrl}
        onResultClose={() => setShareDialogUrl(null)}
      />
      <LibraryDrawer
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onLoadStory={handleLoadFromLibrary}
      />
      <p className="text-center text-lg text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/70 p-6 rounded-xl shadow-lg mb-8 max-w-prose mx-auto border border-blue-200 dark:border-blue-800">
        點擊「隨機產生」來獲得靈感，或使用工具「潤飾語法」、「檢查一致性」及「合成內容」來完善您的創意點子！
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-center flex-wrap no-print">
        <Button
          onClick={() => setImageDialogOpen(true)}
          disabled={isAnyMainButtonActive || isAnyElementIndividuallyLoading || isLoading.analyze}
          className="bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:brightness-110 text-white flex-1 sm:flex-none rounded-lg shadow-md text-base h-12"
        >
          {isLoading.analyze ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Camera className="mr-2 h-5 w-5" />}
          看圖編故事
        </Button>
        <Button
          onClick={handleRandomAll}
          disabled={isAnyMainButtonActive || isAnyElementIndividuallyLoading}
          className="bg-accent hover:bg-accent/90 text-accent-foreground flex-1 sm:flex-none rounded-lg shadow-md text-base h-12"
        >
          {isLoading.randomAll ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Shuffle className="mr-2 h-5 w-5" />}
          全部隨機
        </Button>
        <Button 
          onClick={handleGrammarRefinement} 
          disabled={isAnyMainButtonActive || isAnyElementIndividuallyLoading || grammarButtonFeedbackIcon !== 'wand'} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none rounded-lg shadow-md text-base h-12"
        >
          {renderGrammarButtonIcon()}
          潤飾語法
        </Button>
        <Button 
          onClick={handleConsistencyCheck} 
          disabled={isAnyMainButtonActive || isAnyElementIndividuallyLoading} 
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none rounded-lg shadow-md text-base h-12"
        >
          {isLoading.consistency ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
          檢查一致性
        </Button>
        <Button 
          onClick={handleStorySynthesis} 
          disabled={isAnyMainButtonActive || isAnyElementIndividuallyLoading} 
          className="text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 flex-1 sm:flex-none rounded-lg shadow-lg transform transition-all hover:scale-105 active:scale-95 duration-150 text-base h-12"
        >
          {isLoading.synthesis ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <BookText className="mr-2 h-5 w-5" />}
          合成內容
        </Button>
      </div>

      {isLoading.randomAll && randomAllProgress > 0 && (
        <div className="my-6 max-w-sm mx-auto px-4">
          <Progress value={randomAllProgress} className="w-full h-2.5 rounded-full bg-accent/30 [&>div]:bg-accent" />
          <p className="text-sm text-muted-foreground text-center mt-2">
            正在努力產生靈感... {Math.round(randomAllProgress)}%
          </p>
        </div>
      )}
      
      {isLoading.grammar && grammarProgress > 0 && (
        <div className="my-6 max-w-sm mx-auto px-4">
          <Progress value={grammarProgress} className="w-full h-2.5 rounded-full bg-primary/30 [&>div]:bg-primary" />
          <p className="text-sm text-muted-foreground text-center mt-2">
            正在潤飾語法... {Math.round(grammarProgress)}%
          </p>
        </div>
      )}

      {isLoading.consistency && (
        <div className="my-6 max-w-sm mx-auto px-4">
          <Progress value={50} className="w-full h-2.5 rounded-full bg-primary/30 [&>div]:bg-primary" /> 
          <p className="text-sm text-muted-foreground text-center mt-2">
            正在檢查一致性...
          </p>
        </div>
      )}

      {isLoading.synthesis && (
        <div className="my-6 max-w-sm mx-auto px-4">
          <Progress value={50} className="w-full h-2.5 rounded-full bg-purple-500/30 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-pink-500" /> 
          <p className="text-sm text-muted-foreground text-center mt-2">
            正在合成故事靈感...
          </p>
        </div>
      )}

     <Dialog open={isRefinementDialogOpen} onOpenChange={setIsRefinementDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <DialogTitle>語法潤飾結果</DialogTitle>
            <DialogDescription>
              以下是本次潤飾所做的變更：
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 flex-grow min-h-0 overflow-y-auto">
            {refinementChanges.length > 0 ? (
              refinementChanges.map((change, index) => (
                <div 
                  key={index} 
                  className="p-4 border border-blue-200/70 dark:border-blue-800/70 bg-blue-50/30 dark:bg-blue-950/30 rounded-lg shadow-lg"
                >
                  <h4 className="text-lg font-bold text-primary mb-3">{change.label}</h4>
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-1">原文：</p>
                    <p className="text-sm p-3 bg-card dark:bg-zinc-800 rounded-md border border-dashed border-border dark:border-slate-600 whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">
                      {change.original.trim() || "（無內容）"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">潤飾後：</p>
                    <p className="text-sm p-3 bg-card dark:bg-zinc-800 rounded-md border border-emerald-500 dark:border-emerald-400 whitespace-pre-wrap text-zinc-800 dark:text-zinc-100">
                      {change.refined.trim() || "（無內容）"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">所有項目的語法均已相當通順，無需調整。</p>
            )}
          </div>
          <DialogFooter className="mt-auto pt-4 border-t"> 
            <Button onClick={() => setIsRefinementDialogOpen(false)}>關閉</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {consistencyResult && (
        <Alert 
          key={`consistency-alert-${consistencyAlertKey.current}`}
          className={cn(
            "mb-8 rounded-lg shadow-md max-w-3xl mx-auto",
            consistencyResult.isConsistent ? 'border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-700' : 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700',
            "animate-in fade-in-0 slide-in-from-top-5 duration-500 ease-out"
          )}
        >
           <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <CheckCircle2 className={`h-5 w-5 mr-2 ${consistencyResult.isConsistent ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
                <AlertTitle className={`text-lg font-semibold ${consistencyResult.isConsistent ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {consistencyResult.isConsistent ? "內容一致性良好！" : "一致性建議"}
                </AlertTitle>
              </div>
              {!consistencyResult.isConsistent && consistencyResult.suggestions && consistencyResult.suggestions.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopyConsistencySuggestions(consistencyResult?.suggestions)}
                  aria-label="複製一致性建議"
                  className="text-muted-foreground hover:text-foreground/80"
                >
                  <Copy className="h-5 w-5" />
                </Button>
              )}
            </div>
          <AlertDescription className={`text-sm ${consistencyResult.isConsistent ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'} leading-relaxed mt-2 space-y-1.5`}>
            {consistencyResult.isConsistent 
              ? "目前的5W1H元素組合看起來很棒，前後呼應！" 
              : (
                <ul className="list-none space-y-2.5 leading-relaxed mt-2">
                  {consistencyResult.suggestions.map((suggestionItem, index) => (
                    <li key={index} className="whitespace-pre-wrap p-3 border rounded-md bg-muted/30 dark:bg-muted/20"> 
                      {suggestionItem.split('\n').map((line, lineIndex, arr) => (
                        <React.Fragment key={lineIndex}>
                          <StyledSuggestionLine text={line} />
                          {lineIndex < arr.length - 1 && '\n'}
                        </React.Fragment>
                      ))}
                    </li>
                  ))}
                </ul>
              )
            }
          </AlertDescription>
        </Alert>
      )}

      {synthesizedContent && (
        <Card
          ref={synthesizedStoryCardRef}
          key={`story-card-${storyCardKey.current}`}
          className="print-area mb-8 rounded-lg shadow-xl border border-primary/30 bg-card max-w-3xl mx-auto animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-10 duration-700 ease-out"
        >
          <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
             <div className="flex items-center gap-3 animate-in fade-in-0 slide-in-from-bottom-5 duration-500 ease-out delay-300 fill-mode-both">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle className="print-title text-xl font-semibold text-primary">{synthesizedContent.title || '合成故事靈感'}</CardTitle>
            </div>
            <div className="flex items-center gap-1 no-print">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (typewriterIntervalRef.current) {
                    clearInterval(typewriterIntervalRef.current);
                    typewriterIntervalRef.current = null;
                  }
                  if (synthesizedContent) setTypewriterIndex(synthesizedContent.story.length);
                  requestAnimationFrame(() => window.print());
                }}
                aria-label="列印 / 匯出 PDF"
                title="列印 / 匯出 PDF"
                className="text-primary hover:text-primary/80"
              >
                <Printer className="h-5 w-5" />
              </Button>
              <SlidesMenu />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShareStory}
                disabled={isLoading.share}
                aria-label="取得分享連結"
                title="取得永久分享連結"
                className="text-primary hover:text-primary/80"
              >
                {isLoading.share
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : <Link2 className="h-5 w-5" />}
              </Button>
              <CopyMenu
                onCopy={(format) => handleCopySynthesizedStory(synthesizedContent, format)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-6 pt-4 animate-in fade-in-0 slide-in-from-bottom-5 duration-500 ease-out delay-500 fill-mode-both">
            <p className="print-body text-base leading-relaxed text-foreground whitespace-pre-wrap">
              {synthesizedContent.story.slice(0, typewriterIndex)}
              {typewriterIndex < synthesizedContent.story.length && (
                <span className="inline-block w-[2px] h-5 bg-primary align-middle ml-0.5 animate-pulse" aria-hidden="true" />
              )}
            </p>

            {/* Print-only: full W1H reference + source footer */}
            <div className="print-only">
              <h2 className="print-section-title">本故事的 5W1H 元素</h2>
              <dl>
                {ALL_W1H_KEYS.map(key => (
                  <div key={key} className="print-w1h-row" data-key={key}>
                    <dt>{W1H_ELEMENTS[key].label}</dt>
                    <dd>{w1hData[key].text || '—'}</dd>
                  </div>
                ))}
              </dl>
              <p className="print-footer-info">
                由 5W1H 靈感發射器 Pro 產出　|　https://cagoooo.github.io/Aura/　|　桃園市石門國小資訊組 阿凱老師 設計
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ALL_W1H_KEYS.map((key) => (
          <W1HElementCard
            key={key}
            id={`w1h-card-${key}`}
            element={W1H_ELEMENTS[key]}
            value={w1hData[key].text}
            isLocked={w1hData[key].isLocked}
            isLoading={isLoading.elements[key] || false}
            onValueChange={(text) => handleTextChange(key, text)}
            onRandom={() => handleRandomGenerate(key)}
            onToggleLock={() => handleToggleLock(key)}
            mainOperationInProgress={disableCardInteractionsGlobally}
            cardClassName={`${W1H_CARD_COLORS[key]} live-emphasize`}
            speechSupported={speech.supported}
            isListening={speech.isListening && listeningKey === key}
            speechInterim={listeningKey === key ? speech.interim : ''}
            onMicToggle={() => handleMicToggle(key)}
          />
        ))}
      </div>
    </div>
  );
}

