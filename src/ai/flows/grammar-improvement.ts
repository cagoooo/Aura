
'use server';

/**
 * @fileOverview This file contains a Genkit flow for improving the grammar of a single 5W1H element in Taiwanese Mandarin.
 *
 * - grammarImprovement - A function that takes a single 5W1H element and returns its grammatically improved version.
 * - GrammarImprovementInput - The input type for the grammarImprovement function.
 * - GrammarImprovementOutput - The return type for the grammarImprovement function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { W1HKey } from '@/lib/constants';

const GrammarImprovementInputSchema = z.object({
  elementType: z.enum(['who', 'what', 'when', 'where', 'why', 'how']).describe('The type of 5W1H element (e.g., "who", "what").'),
  text: z.string().describe('The current text of the element to be improved.'),
  elementLabel: z.string().describe('The display label of the element (e.g., "誰 (Who)").'),
});
export type GrammarImprovementInput = z.infer<typeof GrammarImprovementInputSchema>;

const GrammarImprovementOutputSchema = z.object({
  refinedText: z.string().describe('The grammatically improved text for the element, in Traditional Chinese, using natural phrasing for Taiwanese users and avoiding Mainland Chinese specific terms. This should be a significant improvement if the original text was awkward or ungrammatical.'),
});
export type GrammarImprovementOutput = z.infer<typeof GrammarImprovementOutputSchema>;

export async function grammarImprovement(input: GrammarImprovementInput): Promise<GrammarImprovementOutput> {
  return grammarImprovementFlow(input);
}

const grammarImprovementPrompt = ai.definePrompt({
  name: 'grammarImprovementPrompt',
  input: {schema: GrammarImprovementInputSchema},
  output: {schema: GrammarImprovementOutputSchema},
  prompt: `You are an expert editor specializing in refining and enhancing text in Traditional Chinese for a Taiwanese audience. Your goal is not just to correct grammatical errors, but to significantly improve the fluency, naturalness, and impact of the provided text. If the text is already perfect or requires no substantial improvement for clarity and naturalness in Taiwanese Mandarin, return it unchanged. However, if it can be made more concise, vivid, grammatically correct, or engaging while maintaining its original meaning for the element type, please make those improvements.

You will receive a single story element type, its display label, and its current text.
Thoroughly review the 'Current Text'.
If the text is awkward, unclear, ungrammatical, or could be phrased more naturally or impactfully for Taiwanese Mandarin speakers, provide a refined version.
Ensure the 'refinedText' uses common Traditional Chinese phrasing found in Taiwan and avoids Mainland Chinese colloquialisms or specific terminology. The refined text should be a clear and noticeable improvement.

Element Label: {{{elementLabel}}}
Element Type: {{{elementType}}}
Current Text: {{{text}}}

Return the improved text in the following JSON format:
{
  "refinedText": "The significantly improved and natural-sounding text for the element, or the original text if no substantial improvement was necessary or possible."
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
    // If input text is empty, no need to call AI.
    if (!input.text.trim()) {
      return { refinedText: input.text };
    }
    const {output} = await grammarImprovementPrompt(input);
    if (!output || typeof output.refinedText === 'undefined') {
      // Fallback to original text if AI fails or returns malformed response
      return { refinedText: input.text };
    }
    return output;
  }
);

