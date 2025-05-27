
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
  existingOptions: z.array(z.string()).describe('A list of existing example options for this element, which the AI should try to differ from significantly. The AI should also avoid generating content similar to what it might have generated recently or common tropes, aiming for true novelty each time.'),
});
export type RandomElementGenerationInput = z.infer<typeof RandomElementGenerationInputSchema>;

const RandomElementGenerationOutputSchema = z.object({
  generatedText: z.string().describe('The AI-generated creative suggestion for the element, in natural and fluent Traditional Chinese commonly used in Taiwan. This suggestion must be completely new, fresh, and distinct from any previous examples or common themes, and avoid Mainland Chinese specific terminology.'),
});
export type RandomElementGenerationOutput = z.infer<typeof RandomElementGenerationOutputSchema>;

export async function randomElementGenerate(input: RandomElementGenerationInput): Promise<RandomElementGenerationOutput> {
  return randomElementGenerationFlow(input);
}

const randomElementGenerationPrompt = ai.definePrompt({
  name: 'randomElementGenerationPrompt',
  input: {schema: RandomElementGenerationInputSchema},
  output: {schema: RandomElementGenerationOutputSchema},
  prompt: `You are a highly creative AI assistant specializing in generating unique and inspiring story components using natural and fluent Traditional Chinese that is common in Taiwan. Avoid Mainland Chinese specific terminology.
Your task is to provide a **completely new, fresh, vivid, and imaginative** phrase or short sentence for the story element: {{{elementLabel}}} (type: {{{elementType}}}).
**This generation must be treated as a "blank slate". It absolutely must NOT be an improvement, variation, or modification of any previous text, examples provided for this element, or common tropes you might typically consider. Your goal is to achieve true randomness and surprise with each generation.**

Please ensure your suggestion is:
- In Traditional Chinese, using natural and fluent language commonly understood and used in Taiwan. Avoid Mainland Chinese specific terminology.
- Concise and directly usable as a story component.
- **Fundamentally different, distinct, and entirely unrelated to** the following examples (these are only provided as context of what NOT to generate or be similar to):
  {{#each existingOptions}}
  - {{{this}}}
  {{/each}}
- **Strive for a wide variety of themes and concepts. Avoid overly common tropes or generating multiple elements that are thematically very similar (e.g., avoid repeatedly focusing on specific deities, folklore, or narrow cultural references like "阿嬤" or "媽祖" unless approached with extreme originality and as part of a diverse set of ideas). Your goal is to explore diverse possibilities such as science fiction, everyday life, abstract concepts, historical scenarios, personal dilemmas, humorous situations, philosophical questions, surreal events, etc.**

Think completely outside the box and offer something **truly original and entirely independent of ANY prior content, examples for this specific element, or patterns you might have fallen into.** Your goal is a "fresh start" for this idea, exploring diverse and unexpected directions. Ensure each generation is **genuinely random** and not merely a permutation of a recurring theme. Each output should feel like a brand new, surprising idea.

Output your response as a JSON object with a single field "generatedText".
Example for '誰 (Who)', if existing options were '偵探', '學生':
{
  "generatedText": "一位能夠倒轉局部時間的摺紙藝術家"
}
Or for '何事 (What)':
{
  "generatedText": "城市中所有貓咪突然學會了人類的語言"
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
    if (!output || !output.generatedText) { 
      const fallbackOptions = W1H_ELEMENTS[input.elementType as W1HKey]?.options || ['一個神秘的點子'];
      const randomFallback = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
      return { generatedText: randomFallback };
    }
    return output;
  }
);

