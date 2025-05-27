
'use server';
/**
 * @fileOverview This file defines a Genkit flow for synthesizing a story from 5W1H elements.
 *
 * - `storySynthesis`: Takes 5W1H elements and generates a coherent story or paragraph, including a title.
 * - `StorySynthesisInput`: The input type for the `storySynthesis` function.
 * - `StorySynthesisOutput`: The return type for the `storySynthesis` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StorySynthesisInputSchema = z.object({
  who: z.string().describe('Who is involved in the story.'),
  what: z.string().describe('What happened in the story.'),
  when: z.string().describe('When the story took place.'),
  where: z.string().describe('Where the story took place.'),
  why: z.string().describe('Why the story happened.'),
  how: z.string().describe('How the story happened.'),
});

export type StorySynthesisInput = z.infer<typeof StorySynthesisInputSchema>;

const StorySynthesisOutputSchema = z.object({
  title: z.string().describe('A creative and concise title for the synthesized story, in Standard Traditional Chinese (標準繁體中文), using language natural for Taiwanese audiences.'),
  story: z.string().describe('The synthesized story or paragraph based on the 5W1H elements. This content should be in Standard Traditional Chinese (標準繁體中文), natural and fluent for a general Taiwanese audience, avoiding Mainland Chinese specific terminology.'),
});

export type StorySynthesisOutput = z.infer<typeof StorySynthesisOutputSchema>;

export async function storySynthesis(input: StorySynthesisInput): Promise<StorySynthesisOutput> {
  return storySynthesisFlow(input);
}

const storySynthesisPrompt = ai.definePrompt({
  name: 'storySynthesisPrompt',
  input: {schema: StorySynthesisInputSchema},
  output: {schema: StorySynthesisOutputSchema},
  prompt: `You are a creative AI assistant specializing in weaving compelling short stories or descriptive paragraphs in Standard Traditional Chinese (標準繁體中文), complete with an appropriate title.
Ensure the language used is Standard Traditional Chinese (標準繁體中文), natural and fluent for a general Taiwanese audience. Avoid Mainland Chinese specific terminology, and overly niche colloquialisms or dialect-specific terms that might not be widely understood in Taiwan. The content should be safe and appropriate for general audiences, including blog posts.

Given the following 5W1H elements:
Who: {{{who}}}
What: {{{what}}}
When: {{{when}}}
Where: {{{where}}}
Why: {{{why}}}
How: {{{how}}}

1.  First, generate a concise, engaging, and relevant title for the story that captures its essence. The title must be in Standard Traditional Chinese, using language natural for Taiwanese audiences.
2.  Then, combine these elements into a coherent and engaging short story or a descriptive paragraph. The story should be a creative interpretation and expansion of the provided elements, written in a style that is fluent and natural for Taiwanese readers.

Output your response as a JSON object matching the schema, including 'title' and 'story' fields.
  `,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  },
});

const storySynthesisFlow = ai.defineFlow(
  {
    name: 'storySynthesisFlow',
    inputSchema: StorySynthesisInputSchema,
    outputSchema: StorySynthesisOutputSchema,
  },
  async input => {
    try {
      const {output} = await storySynthesisPrompt(input);
      if (!output || !output.story || !output.title) {
        console.error("Story synthesis response was undefined, malformed, or missing title/story for input:", input);
        return {
          title: '生成標題失敗',
          story: '無法合成故事或標題，請稍後再試或調整您的5W1H元素。可能是內容觸發了安全限制。',
        };
      }
      return {
          title: output.title,
          story: output.story,
      };
    } catch (e: any) {
      console.error("Error during story synthesis flow:", e);
      if (e.message && e.message.includes('blocked by safety settings')) {
         return {
          title: '內容生成受阻',
          story: '合成故事時，部分內容可能因觸發安全限制而被阻擋。請嘗試調整輸入的5W1H元素，或簡化內容後再試。',
        };
      }
      return {
        title: '合成發生錯誤',
        story: '合成故事時遇到未預期的問題，請稍後再試。',
      };
    }
  }
);

    