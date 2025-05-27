
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
  existingOptions: z.array(z.string()).describe('A list of existing example options for this element, which the AI should try to differ from significantly.'),
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
Your task is to provide a **completely new, fresh, vivid, and imaginative** phrase or short sentence for the story element: {{{elementLabel}}} (type: {{{elementType}}}).
**This generation should be a "blank slate" and must NOT be an improvement, variation, or modification of any previous text or examples provided for this element.**

Please ensure your suggestion is:
- In Traditional Chinese, using language and cultural nuances appropriate for Taiwan.
- Concise and directly usable as a story component.
- **Fundamentally different, distinct, and unrelated to** the following examples (these are only provided as context of what NOT to generate or be similar to):
  {{#each existingOptions}}
  - {{{this}}}
  {{/each}}
- **Strive for a wide variety of themes and concepts. Avoid overly common tropes or generating multiple elements that are thematically very similar (e.g., repeatedly focusing on specific deities, folklore, or narrow cultural references unless approached with extreme originality). Your goal is to explore diverse possibilities such as science fiction, everyday life, abstract concepts, historical scenarios, personal dilemmas, humorous situations, etc.**

Think completely outside the box and offer something truly original and **entirely independent of any prior content or examples for this specific element.** Your goal is a "fresh start" for this idea, exploring diverse and unexpected directions. Ensure each generation is genuinely random and not merely a permutation of a recurring theme.

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
    if (!output || !output.generatedText) { // Check if generatedText is empty too
      // Fallback to a random existing option if AI fails or returns nothing or empty string
      const fallbackOptions = W1H_ELEMENTS[input.elementType as W1HKey]?.options || ['一個神秘的點子'];
      const randomFallback = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
      return { generatedText: randomFallback };
    }
    return output;
  }
);

