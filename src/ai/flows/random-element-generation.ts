
'use server';
/**
 * @fileOverview A Genkit flow for generating a random, creative suggestion for a single 5W1H element.
 *
 * - randomElementGenerate - A function that generates a random idea for a given 5W1H element type.
 * - RandomElementGenerationInput - The input type for the randomElementGenerate function.
 * - RandomElementGenerationOutput - The return type for the randomElementGenerate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { W1HKey } from '@/lib/constants';
import { W1H_ELEMENTS } from '@/lib/constants';

const RandomElementGenerationInputSchema = z.object({
  elementType: z.enum(['who', 'what', 'when', 'where', 'why', 'how']).describe('The type of 5W1H element to generate (e.g., "who", "what").'),
  elementLabel: z.string().describe('The display label of the element (e.g., "誰 (Who)").'),
  existingOptions: z.array(z.string()).describe('A list of existing example options for this element, which the AI should try to differ from.'),
});
export type RandomElementGenerationInput = z.infer<typeof RandomElementGenerationInputSchema>;

const RandomElementGenerationOutputSchema = z.object({
  generatedText: z.string().describe('The AI-generated creative suggestion for the element, in Traditional Chinese (Taiwanese style).'),
});
export type RandomElementGenerationOutput = z.infer<typeof RandomElementGenerationOutputSchema>;

export async function randomElementGenerate(input: RandomElementGenerationInput): Promise<RandomElementGenerationOutput> {
  return randomElementGenerationFlow(input);
}

const randomElementGenerationPrompt = ai.definePrompt({
  name: 'randomElementGenerationPrompt',
  input: {schema: RandomElementGenerationInputSchema},
  output: {schema: RandomElementGenerationOutputSchema},
  prompt: `You are a highly creative AI assistant specializing in generating unique and inspiring story components in Traditional Chinese (Taiwanese style).
Your task is to provide a fresh, vivid, and imaginative phrase or short sentence for the story element: {{{elementLabel}}} (type: {{{elementType}}}).

Please ensure your suggestion is:
- In Traditional Chinese, using language and cultural nuances appropriate for Taiwan.
- Concise and directly usable as a story component.
- Significantly different from the following examples:
  {{#each existingOptions}}
  - {{{this}}}
  {{/each}}

Think outside the box and offer something truly original.

Output your response as a JSON object with a single field "generatedText".
Example for '誰 (Who)', if existing options were '偵探', '學生':
{
  "generatedText": "一位穿梭時空的神秘畫家"
}
`,
});

const randomElementGenerationFlow = ai.defineFlow(
  {
    name: 'randomElementGenerationFlow',
    inputSchema: RandomElementGenerationInputSchema,
    outputSchema: RandomElementGenerationOutputSchema,
  },
  async (input: RandomElementGenerationInput) => {
    const {output} = await randomElementGenerationPrompt(input);
    if (!output) {
      // Fallback to a random existing option if AI fails or returns nothing
      const fallbackOptions = W1H_ELEMENTS[input.elementType as W1HKey]?.options || ['一個神秘的點子'];
      const randomFallback = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
      return { generatedText: randomFallback };
    }
    return output;
  }
);
