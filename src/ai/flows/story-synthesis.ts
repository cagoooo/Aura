
'use server';
/**
 * @fileOverview This file defines a Genkit flow for synthesizing a story from 5W1H elements.
 *
 * - `storySynthesis`: Takes 5W1H elements and generates a coherent story or paragraph.
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
  prompt: `You are a creative AI assistant specializing in weaving compelling short stories or descriptive paragraphs in Standard Traditional Chinese (標準繁體中文).
Ensure the language used is formal and suitable for a general Taiwanese audience, avoiding colloquialisms or dialect-specific terms.

Given the following 5W1H elements:
Who: {{{who}}}
What: {{{what}}}
When: {{{when}}}
Where: {{{where}}}
Why: {{{why}}}
How: {{{how}}}

Combine these elements into a coherent and engaging short story or a descriptive paragraph.
The story should be a creative interpretation and expansion of the provided elements.
Output the story as a single string in the 'story' field of the JSON response, using Standard Traditional Chinese.
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
    if (!output) {
      // Handle the case where the AI response could not be parsed or was empty
      console.error("Story synthesis AI response was undefined or malformed for input:", input);
      return {
        story: 'AI無法合成故事，請稍後再試或調整您的5W1H元素。',
      };
    }
    return output;
  }
);

