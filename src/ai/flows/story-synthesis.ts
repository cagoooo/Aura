
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
  title: z.string().describe('A creative and concise title for the synthesized story, in Standard Traditional Chinese (標準繁體中文).'),
  story: z.string().describe('The synthesized story or paragraph based on the 5W1H elements. This content should be in Standard Traditional Chinese (標準繁體中文).'),
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
Ensure the language used is formal and suitable for a general Taiwanese audience, avoiding colloquialisms or dialect-specific terms.

Given the following 5W1H elements:
Who: {{{who}}}
What: {{{what}}}
When: {{{when}}}
Where: {{{where}}}
Why: {{{why}}}
How: {{{how}}}

1.  First, generate a concise, engaging, and relevant title for the story that captures its essence. The title must be in Standard Traditional Chinese.
2.  Then, combine these elements into a coherent and engaging short story or a descriptive paragraph. The story should be a creative interpretation and expansion of the provided elements.

Output your response as a JSON object matching the schema, including 'title' and 'story' fields.
  `,
});

const storySynthesisFlow = ai.defineFlow(
  {
    name: 'storySynthesisFlow',
    inputSchema: StorySynthesisInputSchema,
    outputSchema: StorySynthesisOutputSchema,
  },
  async input => {
    const {output} = await storySynthesisPrompt(input);
    if (!output || !output.story) {
      // Handle the case where the AI response could not be parsed or was empty for the story
      console.error("Story synthesis AI response was undefined or malformed for input:", input);
      return {
        title: 'AI生成標題失敗',
        story: 'AI無法合成故事，請稍後再試或調整您的5W1H元素。',
      };
    }
    return {
        title: output.title || 'AI未提供標題', // Provide a fallback if title is missing but story exists
        story: output.story,
    };
  }
);

