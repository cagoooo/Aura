
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
  refinedText: z.string().describe('The grammatically improved text for the element, in Traditional Chinese (Taiwanese style).'),
});
export type GrammarImprovementOutput = z.infer<typeof GrammarImprovementOutputSchema>;

export async function grammarImprovement(input: GrammarImprovementInput): Promise<GrammarImprovementOutput> {
  return grammarImprovementFlow(input);
}

const grammarImprovementPrompt = ai.definePrompt({
  name: 'grammarImprovementPrompt',
  input: {schema: GrammarImprovementInputSchema},
  output: {schema: GrammarImprovementOutputSchema},
  prompt: `You are a helpful assistant specialized in improving the grammar and fluency of sentences in Taiwanese Mandarin.
You will receive a single story element type (e.g., '誰 (Who)'), its current text.
Improve the grammar and fluency of this text so that it is natural for Taiwanese Mandarin speakers.

Element Label: {{{elementLabel}}}
Element Type: {{{elementType}}}
Current Text: {{{text}}}

Return the improved text in the following JSON format:
{
  "refinedText": "improved text for the element"
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
    if (!output || !output.refinedText) {
      // Fallback to original text if AI fails or returns empty
      return { refinedText: input.text };
    }
    return output;
  }
);

