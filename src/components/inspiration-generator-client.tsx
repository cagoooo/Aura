
"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { Loader2, Sparkles, CheckCircle2, Shuffle, BookText, Copy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type W1HState = {
  [key in W1HKey]: {
    text: string;
    isLocked: boolean;
  };
};

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export default function InspirationGeneratorClient() {
  const { toast } = useToast();
  const [w1hData, setW1hData] = useState<W1HState>(() => {
    const initialState = {} as W1HState;
    for (const key of ALL_W1H_KEYS) {
      initialState[key] = {
        text: getRandomItem(W1H_ELEMENTS[key].options), // Initial random from local
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

  const [consistencyResult, setConsistencyResult] = useState<ConsistencyCheckOutput | null>(null);
  const [synthesizedStory, setSynthesizedStory] = useState<string | null>(null);

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
      console.error(`AI random generation error for ${key}:`, error);
      // Fallback to local random item on error
      const randomText = getRandomItem(W1H_ELEMENTS[key].options);
      setW1hData((prev) => ({ ...prev, [key]: { ...prev[key], text: randomText } }));
      toast({ variant: "destructive", title: "AI隨機產生失敗", description: `為「${W1H_ELEMENTS[key].label}」項目AI隨機產生內容時發生錯誤，已使用備用選項。` });
    } finally {
      setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: false } }));
    }
  }, [w1hData, toast]);

  const handleRandomAll = async () => {
    setIsLoading(prev => ({ ...prev, randomAll: true }));
    setSynthesizedStory(null);
    setConsistencyResult(null);
    
    const newW1hData = { ...w1hData };
    let generatedCount = 0;

    for (const key of ALL_W1H_KEYS) {
      if (!newW1hData[key].isLocked) {
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
          console.error(`AI random generation error for ${key} during random all:`, error);
          // Fallback to local random item on error
          newW1hData[key] = { ...newW1hData[key], text: getRandomItem(W1H_ELEMENTS[key].options) };
        } finally {
           setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: false } }));
        }
      }
    }
    setW1hData(newW1hData);
    setIsLoading(prev => ({ ...prev, randomAll: false }));
    if (generatedCount > 0) {
        toast({ title: "全部隨機完畢 (AI)", description: `已為 ${generatedCount} 個未鎖定項目AI產生新內容。` });
    } else {
        toast({ title: "全部隨機", description: "所有項目均已鎖定，未產生新內容。" });
    }
  };

  const handleGrammarRefinement = async () => {
    setIsLoading(prev => ({ ...prev, grammar: true }));
    setConsistencyResult(null); 
    setSynthesizedStory(null);
    const currentTexts: GrammarImprovementInput = {
      who: w1hData.who.text,
      what: w1hData.what.text,
      when: w1hData.when.text,
      where: w1hData.where.text,
      why: w1hData.why.text,
      how: w1hData.how.text,
    };

    try {
      const result = await grammarImprovement(currentTexts);
      setW1hData((prev) => {
        const newState = { ...prev };
        for (const key of ALL_W1H_KEYS) {
          newState[key].text = result[key as W1HKey] || prev[key as W1HKey].text;
        }
        return newState;
      });
      toast({ title: "語法潤飾成功", description: "AI已協助改善內容的語法與流暢度。" });
    } catch (error) {
      console.error("Grammar refinement error:", error);
      toast({ variant: "destructive", title: "語法潤飾失敗", description: "AI服務發生錯誤，請稍後再試。" });
    } finally {
      setIsLoading(prev => ({ ...prev, grammar: false }));
    }
  };

  const handleConsistencyCheck = async () => {
    setIsLoading(prev => ({ ...prev, consistency: true }));
    setConsistencyResult(null);
    setSynthesizedStory(null);
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
         toast({ title: "內容一致性檢查完畢", description: "AI提供了一些調整建議，請參考下方提示。" });
      }
    } catch (error) {
      console.error("Consistency check error:", error);
      toast({ variant: "destructive", title: "一致性檢查失敗", description: "AI服務發生錯誤，請稍後再試。" });
    } finally {
      setIsLoading(prev => ({ ...prev, consistency: false }));
    }
  };

  const handleStorySynthesis = async () => {
    setIsLoading(prev => ({ ...prev, synthesis: true }));
    setSynthesizedStory(null);
    setConsistencyResult(null);
    const currentTexts: StorySynthesisInput = {
      who: w1hData.who.text,
      what: w1hData.what.text,
      when: w1hData.when.text,
      where: w1hData.where.text,
      why: w1hData.why.text,
      how: w1hData.how.text,
    };

    try {
      const result = await storySynthesis(currentTexts);
      setSynthesizedStory(result.story);
      toast({ title: "內容合成成功", description: "AI已根據您的5W1H元素生成了一段故事靈感！" });
    } catch (error)
     {
      console.error("Story synthesis error:", error);
      toast({ variant: "destructive", title: "內容合成失敗", description: "AI服務發生錯誤，請稍後再試。" });
    } finally {
      setIsLoading(prev => ({ ...prev, synthesis: false }));
    }
  };

  const handleCopyToClipboard = async (textToCopy: string | null) => {
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({ title: "複製成功", description: "故事靈感已複製到剪貼簿！" });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      toast({ variant: "destructive", title: "複製失敗", description: "無法複製內容，請再試一次。" });
    }
  };
  
  useEffect(() => {
    let updated = false;
    const currentData = { ...w1hData };
    ALL_W1H_KEYS.forEach(key => {
      // Initialize with AI-generated content if text is empty or undefined
      if (!currentData[key].text) {
        // Temporarily set loading for this element to prevent user interaction
        // and to give a visual cue if the initial load is slow.
        setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: true } }));
        randomElementGenerate({
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
          console.error(`Initial AI random generation error for ${key}:`, error);
          // Fallback to local random item on error
          setW1hData(prevData => ({
            ...prevData,
            [key]: { ...prevData[key], text: getRandomItem(W1H_ELEMENTS[key].options) },
          }));
        })
        .finally(() => {
          setIsLoading(prev => ({ ...prev, elements: { ...prev.elements, [key]: false } }));
        });
        updated = true; // Mark as updated to potentially avoid a double render, though state updates will trigger renders.
      }
    });
    // No direct setW1hData here as it's handled within the async calls
  }, []); // Empty dependency array to run once on mount


  const anyLoading = isLoading.randomAll || isLoading.grammar || isLoading.consistency || isLoading.synthesis;

  return (
    <div className="container mx-auto px-4 py-8">
      <p className="text-center text-lg text-foreground mb-8 max-w-prose mx-auto">
        點擊「隨機產生 (AI)」來獲得靈感，或使用AI工具「潤飾語法」、「檢查一致性」及「合成內容」來完善您的創意點子！
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center flex-wrap">
        <Button onClick={handleRandomAll} disabled={anyLoading} className="bg-accent hover:bg-accent/90 text-accent-foreground flex-1 sm:flex-none rounded-lg shadow-md">
          {isLoading.randomAll ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Shuffle className="mr-2 h-5 w-5" />}
          全部隨機 (AI)
        </Button>
        <Button onClick={handleGrammarRefinement} disabled={anyLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none rounded-lg shadow-md">
          {isLoading.grammar ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
          潤飾語法 (AI)
        </Button>
        <Button onClick={handleConsistencyCheck} disabled={anyLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none rounded-lg shadow-md">
          {isLoading.consistency ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
          檢查一致性 (AI)
        </Button>
        <Button onClick={handleStorySynthesis} disabled={anyLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none rounded-lg shadow-md">
          {isLoading.synthesis ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <BookText className="mr-2 h-5 w-5" />}
          合成內容 (AI)
        </Button>
      </div>

      {consistencyResult && (
        <Alert className={`mb-8 rounded-lg shadow-md ${consistencyResult.isConsistent ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'} max-w-3xl mx-auto`}>
          <CheckCircle2 className={`h-5 w-5 ${consistencyResult.isConsistent ? 'text-green-600' : 'text-amber-600'}`} />
          <AlertTitle className={`font-semibold ${consistencyResult.isConsistent ? 'text-green-700' : 'text-amber-700'}`}>
            {consistencyResult.isConsistent ? "內容一致性良好！" : "一致性建議"}
          </AlertTitle>
          <AlertDescription className={consistencyResult.isConsistent ? 'text-green-600' : 'text-amber-600'}>
            {consistencyResult.isConsistent 
              ? "目前的5W1H元素組合看起來很棒，前後呼應！" 
              : (
                <ul className="list-disc list-inside ml-2">
                  {consistencyResult.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              )
            }
          </AlertDescription>
        </Alert>
      )}

      {synthesizedStory && (
        <Card className="mb-8 rounded-lg shadow-md max-w-3xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold text-primary">AI 合成故事靈感</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleCopyToClipboard(synthesizedStory)}
              aria-label="複製故事靈感"
              className="text-primary hover:text-primary/80"
            >
              <Copy className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-foreground whitespace-pre-wrap">{synthesizedStory}</p>
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
            useAiRandom={true} // Indicate that this card uses AI for random generation
          />
        ))}
      </div>
    </div>
  );
}
