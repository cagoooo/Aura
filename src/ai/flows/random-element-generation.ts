
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
  prompt: `You are a highly creative AI assistant specializing in generating **truly unique, unexpected, and wildly diverse** story components using natural and fluent Traditional Chinese that is common in Taiwan. Avoid Mainland Chinese specific terminology.
Your task is to provide a **COMPLETELY NEW, FRESH, VIVID, and IMAGINATIVE** phrase or short sentence for the story element: {{{elementLabel}}} (type: {{{elementType}}}).
**All generated text must be suitable for a general audience and avoid any harmful, offensive, controversial, or potentially unsafe topics. Focus on creativity that is universally appropriate and respectful.**

**This generation must be treated as a "blank slate" and achieve genuine surprise with each output.**

It absolutely must NOT be:
- An improvement, variation, or modification of any previous text or common tropes.
- Similar to the provided existing examples (these are only for context of what NOT to generate or be similar to):
  {{#each existingOptions}}
  - {{{this}}}
  {{/each}}
- **Overly reliant on common fantastical or sci-fi themes** such as "宇宙 (universe/space)," "時間旅行 (time travel)," "人工智慧 (AI)," "外星人 (aliens)," "古老預言 (ancient prophecies)," or "神祇 (deities)" UNLESS you can present them with **extreme, mind-bending originality** and as a **rare part of a much broader, truly diverse set of generated ideas.** Your default should be to AVOID these if possible, to maximize true randomness.

Instead, you MUST strive for **MAXIMUM THEMATIC DIVERSITY and UNPREDICTABILITY**. Explore a vast range of possibilities, including but not limited to:
- Mundane everyday life with a peculiar, subtle twist.
- Deeply personal dilemmas or psychological explorations.
- Absurdist humor or bizarre, illogical situations.
- Unique perspectives on historical fiction or alternate histories.
- Philosophical questions grounded in relatable, everyday scenarios.
- Surreal, dreamlike, or metaphorical events that aren't necessarily sci-fi/fantasy.
- Small-scale, intimate mysteries or quiet discoveries.
- Concepts related to art, music, food, specific professions, or obscure hobbies.
- Social commentary or observations on human nature presented creatively.

Think completely outside the box. Your goal is a "fresh start" for this idea, producing something **genuinely random, novel, and entirely independent of ANY prior content, examples, or patterns you might have fallen into.** Each output should feel like a brand new, surprising idea pulled from a hat containing vastly different concepts.

Output your response as a JSON object with a single field "generatedText".
Example for '誰 (Who)', aiming for diversity:
{
  "generatedText": "一位熱愛收集城市噪音的失眠圖書館員"
}
Or for '何事 (What)':
{
  "generatedText": "發現了一本只在雨天才能閱讀的日記"
}
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
    ],
  },
});

const randomElementGenerationFlow = ai.defineFlow(
  {
    name: 'randomElementGenerationFlow',
    inputSchema: RandomElementGenerationInputSchema,
    outputSchema: RandomElementGenerationOutputSchema,
  },
  async (input: RandomElementGenerationInput) => {
    try {
      const {output} = await randomElementGenerationPrompt(input);
      if (!output || !output.generatedText) { 
        const fallbackOptions = W1H_ELEMENTS[input.elementType as W1HKey]?.options || ['一個神秘的點子'];
        const randomFallback = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
        return { generatedText: randomFallback };
      }
      return output;
    } catch (e: any) {
      console.error(`Error during random element generation for ${input.elementType}:`, e);
      // Fallback if AI call fails or is blocked by safety settings
      const fallbackOptions = W1H_ELEMENTS[input.elementType as W1HKey]?.options || ['一個安全的備用點子'];
      const randomFallback = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
      return { generatedText: randomFallback };
    }
  }
);
