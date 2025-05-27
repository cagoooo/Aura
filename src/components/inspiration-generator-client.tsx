
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { W1HKey } from '@/lib/constants';
import { W1H_ELEMENTS, ALL_W1H_KEYS } from '@/lib/constants';
import W1HElementCard from '@/components/w1h-element-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { consistencyCheck, ConsistencyCheckInput, ConsistencyCheckOutput } from '@/ai/flows/consistency-check';
import { grammarImprovement, GrammarImprovementInput, GrammarImprovementOutput } from '@/ai/flows/grammar-improvement';
import { storySynthesis, StorySynthesisInput, StorySynthesisOutput } from '@/ai/flows/story-synthesis';
import { randomElementGenerate, RandomElementGenerationInput, RandomElementGenerationOutput } from '@/ai/flows/random-element-generation';
import { Loader2, Sparkles, CheckCircle2, Shuffle, BookText, Copy, FileText } from 'lucide-react';
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
import confetti from 'canvas-confetti';

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
    const initialState = {} as W1HState;
    for (const key of ALL_W1H_KEYS) {
      initialState[key] = {
        text: '', 
        isLocked: false,
      };
    }
    return initialState;
  });

  const [isLoading, setIsLoading] = useState({
    grammar: false,
    consistency: false,
    randomAll: false,
    synthesis: false,
    elements: {} as Record<W1HKey, boolean>,
  });

  const [randomAllProgress, setRandomAllProgress] = useState(0);
  const [grammarProgress, setGrammarProgress] = useState(0);
  const [consistencyResult, setConsistencyResult] = useState<ConsistencyCheckOutput | null>(null);
  const [synthesizedContent, setSynthesizedContent] = useState<SynthesizedContent | null>(null);
  
  const [refinementChanges, setRefinementChanges] = useState<RefinementChange[]>([]);
  const [isRefinementDialogOpen, setIsRefinementDialogOpen] = useState(false);


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
      const input: RandomElementGenerationInput = {
        elementType: key,
        elementLabel: W1H_ELEMENTS[key].label,
        existingOptions: W1H_ELEMENTS[key].options,
      };
      const result = await randomElementGenerate(input);
      setW1hData((prev) => ({ ...prev, [key]: { ...prev[key], text: result.generatedText } }));
    } catch (error) {
      console.error(`Random generation error for ${key}:`, error);
      const randomText = getRandomItem(W1H_ELEMENTS[key].options);
      setW1hData((prev) => ({ ...prev, [key]: { ...prev[key], text: randomText } }));
      toast({ variant: "destructive", title: "隨機產生失敗", description: `為「${W1H_ELEMENTS[key].label}」項目隨機產生內容時發生錯誤，已使用備用選項。` });
    } finally {
      setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: false } }));
    }
  }, [w1hData, toast]);

  const handleRandomAll = async () => {
    setIsLoading(prev => ({ ...prev, randomAll: true }));
    setRandomAllProgress(0);
    setSynthesizedContent(null);
    setConsistencyResult(null);
    
    const originalW1hData = JSON.parse(JSON.stringify(w1hData)) as W1HState;
    const newW1hData = { ...originalW1hData };
    const elementsToProcessKeys = ALL_W1H_KEYS.filter(key => !newW1hData[key].isLocked);
    const totalToProcessCount = elementsToProcessKeys.length;
    
    if (totalToProcessCount === 0) {
      setIsLoading(prev => ({ ...prev, randomAll: false }));
      setRandomAllProgress(0); 
      toast({ title: "全部隨機", description: "所有項目均已鎖定，未產生新內容。" });
      return;
    }
    
    setRandomAllProgress(1); 

    let processedCount = 0;
    let generatedCount = 0;

    for (const key of elementsToProcessKeys) {
      setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: true } }));
      try {
        const input: RandomElementGenerationInput = {
          elementType: key,
          elementLabel: W1H_ELEMENTS[key].label,
          existingOptions: W1H_ELEMENTS[key].options,
        };
        const result = await randomElementGenerate(input);
        newW1hData[key] = { ...newW1hData[key], text: result.generatedText };
        generatedCount++;
      } catch (error) {
        console.error(`Random generation error for ${key} during random all:`, error);
        newW1hData[key] = { ...newW1hData[key], text: getRandomItem(W1H_ELEMENTS[key].options) };
      } finally {
         processedCount++;
         setRandomAllProgress(Math.min((processedCount / totalToProcessCount) * 100, 100));
         setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: false } }));
      }
    }
    setW1hData(newW1hData);
    setIsLoading(prev => ({ ...prev, randomAll: false }));
    if (generatedCount > 0) {
        toast({ title: "全部隨機完畢", description: `已為 ${generatedCount} 個未鎖定項目產生新內容。` });
    } else if (totalToProcessCount > 0) {
        toast({ title: "全部隨機完畢", description: `處理了 ${totalToProcessCount} 個項目，但由於錯誤或未返回內容，部分可能使用備用選項。` });
    }
  };

  const handleGrammarRefinement = async () => {
    setIsLoading(prev => ({ ...prev, grammar: true }));
    setGrammarProgress(0);
    setConsistencyResult(null); 
    setSynthesizedContent(null);
    setRefinementChanges([]);


    const originalW1hData = JSON.parse(JSON.stringify(w1hData)) as W1HState;
    const newW1hData = { ...originalW1hData };
    
    const elementsToRefine = ALL_W1H_KEYS;
    const totalToRefine = elementsToRefine.length;
    let processedCount = 0;
    
    if (totalToRefine === 0) {
        setIsLoading(prev => ({ ...prev, grammar: false }));
        return;
    }
    setGrammarProgress(1); 

    for (let i = 0; i < totalToRefine; i++) {
      const key = elementsToRefine[i];
      const originalText = newW1hData[key].text;
      if (!originalText.trim()) { 
        processedCount++;
        setGrammarProgress(Math.min((processedCount / totalToRefine) * 100, 100));
        continue;
      }
      try {
        const input: GrammarImprovementInput = {
          elementType: key,
          text: originalText,
          elementLabel: W1H_ELEMENTS[key].label,
        };
        const result = await grammarImprovement(input);
        newW1hData[key] = { ...newW1hData[key], text: result.refinedText };
      } catch (error) {
        console.error(`Grammar refinement error for ${key}:`, error);
        toast({ variant: "destructive", title: `「${W1H_ELEMENTS[key].label}」潤飾失敗`, description: "服務發生錯誤，該項目保留原內容。" });
      } finally {
        processedCount++;
        setGrammarProgress(Math.min((processedCount / totalToRefine) * 100, 100));
      }
    }
    setW1hData(newW1hData); // Update the main state with all refinements

    // Calculate changes for the dialog
    const changesMade: RefinementChange[] = [];
    let actualModificationsCount = 0;
    for (const key of ALL_W1H_KEYS) {
      const originalText = originalW1hData[key as W1HKey].text;
      const refinedText = newW1hData[key as W1HKey].text;
      // Compare trimmed versions to avoid flagging whitespace-only changes
      if (originalText.trim() !== refinedText.trim()) { 
        changesMade.push({
          label: W1H_ELEMENTS[key as W1HKey].label,
          original: originalText,
          refined: refinedText,
        });
        actualModificationsCount++;
      }
    }
    setRefinementChanges(changesMade);
    setIsLoading(prev => ({ ...prev, grammar: false }));
    
    if (actualModificationsCount > 0) {
      setIsRefinementDialogOpen(true); // Open the dialog
      toast({ title: "語法潤飾完畢", description: `已為 ${actualModificationsCount} 個項目提升語法與流暢度。請查看詳細變更。` });
    } else if (totalToRefine > 0 && ALL_W1H_KEYS.some(k => originalW1hData[k].text.trim() !== '')) { 
      toast({ title: "語法檢查完畢", description: "所有項目的語法均已相當通順，無需調整。" });
    } else if (totalToRefine > 0) { 
      toast({ title: "語法潤飾", description: "沒有可潤飾的內容。" });
    }
  };

  const handleConsistencyCheck = async () => {
    setIsLoading(prev => ({ ...prev, consistency: true }));
    setConsistencyResult(null);
    setSynthesizedContent(null);
    const currentTexts: ConsistencyCheckInput = {
      who: w1hData.who.text,
      what: w1hData.what.text,
      when: w1hData.when.text,
      where: w1hData.where.text,
      why: w1hData.why.text,
      how: w1hData.how.text,
    };

    try {
      const result = await consistencyCheck(currentTexts);
      setConsistencyResult(result);
      if (result.isConsistent) {
        toast({ title: "內容一致性檢查完畢", description: "太棒了！目前的內容看起來前後一致。" });
      } else {
         toast({ title: "內容一致性檢查完畢", description: "提供了一些調整建議，請參考下方提示。" });
      }
    } catch (error) {
      console.error("Consistency check error:", error);
      toast({ variant: "destructive", title: "一致性檢查失敗", description: "服務發生錯誤，請稍後再試。" });
      setConsistencyResult({isConsistent: false, suggestions: ['進行一致性檢查時發生錯誤，無法提供建議。']});
    } finally {
      setIsLoading(prev => ({ ...prev, consistency: false }));
    }
  };

  const handleStorySynthesis = async () => {
    setIsLoading(prev => ({ ...prev, synthesis: true }));
    setSynthesizedContent(null);
    setConsistencyResult(null);
    const currentTexts: StorySynthesisInput = {
      who: w1hData.who.text,
      what: w1hData.what.text,
      when: w1hData.when.text,
      where: w1hData.where.text,
      why: w1hData.why.text,
      how: w1hData.how.text,
    };

    const errorTitles = ['生成標題失敗', '內容生成受阻', '合成發生錯誤'];

    try {
      const result = await storySynthesis(currentTexts);
      setSynthesizedContent(result);

      if (result && result.story && result.title && !errorTitles.includes(result.title)) {
         confetti({
          particleCount: 300,
          spread: 120,
          origin: { x: 0.5, y: 0.5 }, // Center of the screen
          ticks: 400,
          gravity: 0.7,
          startVelocity: 45,
          scalar: 1.2, // Make particles larger
          zIndex: 10001, // Ensure it's on top
          colors: ['#FFC107', '#E91E63', '#2196F3', '#4CAF50', '#FF5722', '#9C27B0', '#00BCD4']
        });
        toast({ title: "內容合成成功", description: "已根據您的5W1H元素生成了一段故事靈感！" });
      } else {
        // This case handles if storySynthesis returns an error structure but doesn't throw
        toast({ variant: "destructive", title: result.title || "內容合成失敗", description: result.story || "服務發生錯誤，請稍後再試。" });
      }
    } catch (error) {
      console.error("Story synthesis error:", error);
      // This catch block handles thrown errors from the flow
      toast({ variant: "destructive", title: "內容合成失敗", description: "服務發生錯誤，請稍後再試。" });
      // Set a fallback content for display, even if it's an error message
      setSynthesizedContent({ title: '合成標題失敗', story: '合成故事時遇到問題，請稍後再試。'});
    } finally {
      setIsLoading(prev => ({ ...prev, synthesis: false }));
    }
  };

  const handleCopySynthesizedStory = async (content: SynthesizedContent | null) => {
    if (!content || !content.story) return;
    const textToCopy = `${content.title}\n\n${content.story}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: "複製成功", description: "故事靈感已複製到剪貼簿！" });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({ variant: "destructive", title: "複製失敗", description: "無法複製內容，請再試一次。" });
    }
  };

  const handleCopyConsistencySuggestions = async (suggestions: string[] | undefined) => {
    if (!suggestions || suggestions.length === 0) {
        toast({ variant: "default", title: "無內容可複製", description: "目前沒有一致性建議可以複製。" });
        return;
    }
    const textToCopy = suggestions.join('\n\n'); // Separate suggestions with double newlines
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: "複製成功", description: "一致性建議已複製到剪貼簿！" });
    } catch (err) {
      console.error('Failed to copy consistency suggestions: ', err);
      toast({ variant: "destructive", title: "複製失敗", description: "無法複製建議內容，請再試一次。" });
    }
  };
  
  useEffect(() => {
    const initialLoadPromises = ALL_W1H_KEYS.map(key => {
      if (!w1hData[key].text) { 
        setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: true } }));
        return randomElementGenerate({
          elementType: key,
          elementLabel: W1H_ELEMENTS[key].label,
          existingOptions: W1H_ELEMENTS[key].options,
        })
        .then(result => {
          setW1hData(prevData => ({
            ...prevData,
            [key]: { ...prevData[key], text: result.generatedText },
          }));
        })
        .catch(error => {
          console.error(`Initial random generation error for ${key}:`, error);
          setW1hData(prevData => ({
            ...prevData,
            [key]: { ...prevData[key], text: getRandomItem(W1H_ELEMENTS[key].options) },
          }));
        })
        .finally(() => {
          setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: false } }));
        });
      }
      return Promise.resolve();
    });

    Promise.all(initialLoadPromises).then(() => {
      // All initial elements are loaded or attempted
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


  const anyLoading = isLoading.randomAll || isLoading.grammar || isLoading.consistency || isLoading.synthesis;
  const anyElementLoading = Object.values(isLoading.elements).some(Boolean);

  return (
    <div className="container mx-auto px-4 py-8">
      <p className="text-center text-lg text-foreground mb-8 max-w-prose mx-auto">
        點擊「隨機產生」來獲得靈感，或使用工具「潤飾語法」、「檢查一致性」及「合成內容」來完善您的創意點子！
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-center flex-wrap">
        <Button onClick={handleRandomAll} disabled={anyLoading || anyElementLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground flex-1 sm:flex-none rounded-lg shadow-md">
          {isLoading.randomAll ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Shuffle className="mr-2 h-5 w-5" />}
          全部隨機
        </Button>
        <Button onClick={handleGrammarRefinement} disabled={anyLoading || anyElementLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none rounded-lg shadow-md">
          {isLoading.grammar ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
          潤飾語法
        </Button>
        <Button onClick={handleConsistencyCheck} disabled={anyLoading || anyElementLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none rounded-lg shadow-md">
          {isLoading.consistency ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
          檢查一致性
        </Button>
        <Button onClick={handleStorySynthesis} disabled={anyLoading || anyElementLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none rounded-lg shadow-md">
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
          <Progress value={50} className="w-full h-2.5 rounded-full bg-primary/30 [&>div]:bg-primary" />
          <p className="text-sm text-muted-foreground text-center mt-2">
            正在合成故事靈感...
          </p>
        </div>
      )}

     {isRefinementDialogOpen && (
        <Dialog open={isRefinementDialogOpen} onOpenChange={setIsRefinementDialogOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>語法潤飾結果</DialogTitle>
              <DialogDescription>
                以下是本次潤飾所做的變更：
              </DialogDescription>
            </DialogHeader>
            <div className="flex-grow min-h-0 overflow-y-auto space-y-4 py-4">
                {refinementChanges.length > 0 ? (
                  refinementChanges.map((change, index) => (
                    <div key={index} className="p-3 border rounded-md bg-muted/30 dark:bg-muted/20">
                      <h4 className="font-semibold text-primary mb-2">{change.label}</h4>
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground mb-0.5">原文：</p>
                        <p className="text-sm p-2 bg-background/70 dark:bg-background/50 rounded border border-dashed border-input whitespace-pre-wrap">{change.original.trim() || "（無內容）"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 dark:text-green-500 mb-0.5">潤飾後：</p>
                        <p className="text-sm p-2 bg-background/70 dark:bg-background/50 rounded border border-green-500/50 whitespace-pre-wrap">{change.refined.trim() || "（無內容）"}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">所有項目的語法均已相當通順，無需調整。</p>
                )}
              </div>
            <DialogFooter className="mt-2 pt-4 border-t"> 
              <Button onClick={() => setIsRefinementDialogOpen(false)}>關閉</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}


      {consistencyResult && (
        <Alert className={`mb-8 rounded-lg shadow-md ${consistencyResult.isConsistent ? 'border-green-500 bg-green-50 dark:bg-green-900/30 dark:border-green-700' : 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-700'} max-w-3xl mx-auto`}>
           <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <CheckCircle2 className={`h-5 w-5 mr-2 ${consistencyResult.isConsistent ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
                <AlertTitle className={`text-lg font-semibold ${consistencyResult.isConsistent ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
                  {consistencyResult.isConsistent ? "內容一致性良好！" : "一致性建議"}
                </AlertTitle>
              </div>
              {!consistencyResult.isConsistent && consistencyResult.suggestions.length > 0 && (
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
          <AlertDescription className={`text-sm ${consistencyResult.isConsistent ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'} leading-relaxed mt-2`}>
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
        <Card className="mb-8 rounded-lg shadow-xl border border-primary/30 bg-card max-w-3xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
             <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle className="text-xl font-semibold text-primary">{synthesizedContent.title || '合成故事靈感'}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopySynthesizedStory(synthesizedContent)}
              aria-label="複製故事靈感"
              className="text-primary hover:text-primary/80"
            >
              <Copy className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">{synthesizedContent.story}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ALL_W1H_KEYS.map((key) => (
          <W1HElementCard
            key={key}
            element={W1H_ELEMENTS[key]}
            value={w1hData[key].text}
            isLocked={w1hData[key].isLocked}
            isLoading={isLoading.elements[key] || false}
            onValueChange={(text) => handleTextChange(key, text)}
            onRandom={() => handleRandomGenerate(key)}
            onToggleLock={() => handleToggleLock(key)}
            mainOperationInProgress={anyLoading}
            cardClassName={W1H_CARD_COLORS[key]}
          />
        ))}
      </div>
    </div>
  );
}
    

    

