'use server';

/**
 * @fileOverview This file contains a Genkit flow for improving the grammar of 5W1H elements in Taiwanese Mandarin.
 *
 * - grammarImprovement - A function that takes 5W1H elements and returns grammatically improved versions.
 * - GrammarImprovementInput - The input type for the grammarImprovement function.
 * - GrammarImprovementOutput - The return type for the grammarImprovement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GrammarImprovementInputSchema = z.object({
  who: z.string().describe('The "Who" element of the 5W1H elements.'),
  what: z.string().describe('The "What" element of the 5W1H elements.'),
  when: z.string().describe('The "When" element of the 5W1H elements.'),
  where: z.string().describe('The "Where" element of the 5W1H elements.'),
  why: z.string().describe('The "Why" element of the 5W1H elements.'),
  how: z.string().describe('The "How" element of the 5W1H elements.'),
});
export type GrammarImprovementInput = z.infer<typeof GrammarImprovementInputSchema>;

const GrammarImprovementOutputSchema = z.object({
  who: z.string().describe('The improved "Who" element.'),
  what: z.string().describe('The improved "What" element.'),
  when: z.string().describe('The improved "When" element.'),
  where: z.string().describe('The improved "Where" element.'),
  why: z.string().describe('The improved "Why" element.'),
  how: z.string().describe('The improved "How" element.'),
});
export type GrammarImprovementOutput = z.infer<typeof GrammarImprovementOutputSchema>;

export async function grammarImprovement(input: GrammarImprovementInput): Promise<GrammarImprovementOutput> {
  return grammarImprovementFlow(input);
}

const grammarImprovementPrompt = ai.definePrompt({
  name: 'grammarImprovementPrompt',
  input: {schema: GrammarImprovementInputSchema},
  output: {schema: GrammarImprovementOutputSchema},
  prompt: `You are a helpful assistant specialized in improving the grammar and fluency of sentences in Taiwanese Mandarin. You will receive the 5W1H elements and must improve the grammar and fluency of each element so that it is natural for Taiwanese Mandarin speakers.

Here are the 5W1H elements:
Who: {{{who}}}
What: {{{what}}}
When: {{{when}}}
Where: {{{where}}}
Why: {{{why}}}
How: {{{how}}}

Return the improved 5W1H elements in the following JSON format:
{
  "who": "improved who",
  "what": "improved what",
  "when": "improved when",
  "where": "improved where",
  "why": "improved why",
  "how": "improved how",
}
`,
});

const grammarImprovementFlow = ai.defineFlow(
  {
    name: 'grammarImprovementFlow',
    inputSchema: GrammarImprovementInputSchema,
    outputSchema: GrammarImprovementOutputSchema,
  },
  async input => {
    const {output} = await grammarImprovementPrompt(input);
    return output!;
  }
);
