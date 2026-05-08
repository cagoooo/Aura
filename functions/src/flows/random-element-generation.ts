import { z } from 'genkit';
import { getAi } from '../genkit';
import { W1H_ELEMENTS, type W1HKey } from '../constants';

export const RandomElementGenerationInputSchema = z.object({
  elementType: z.enum(['who', 'what', 'when', 'where', 'why', 'how']),
  elementLabel: z.string(),
  existingOptions: z.array(z.string()),
  turnstileToken: z.string().optional(),
});
export type RandomElementGenerationInput = z.infer<typeof RandomElementGenerationInputSchema>;

export const RandomElementGenerationOutputSchema = z.object({
  generatedText: z.string(),
});
export type RandomElementGenerationOutput = z.infer<typeof RandomElementGenerationOutputSchema>;

const PROMPT = `You are a highly creative AI assistant specializing in generating **truly unique, unexpected, and widely diverse** story components using natural and fluent Traditional Chinese that is common in Taiwan. Avoid Mainland Chinese specific terminology.
Your task is to provide a **CONCISE yet IMPACTFUL, COMPLETELY NEW, FRESH, VIVID, and IMAGINATIVE** phrase or short sentence for the story element: {{{elementLabel}}} (type: {{{elementType}}}). Aim for brevity without sacrificing creativity or clarity.

**CRITICALLY IMPORTANT: All generated text MUST be suitable for a GENERAL audience and EXTREMELY UNLIKELY to be flagged by automated content moderation systems on common public platforms (e.g., blogs, social media). This means avoiding not only overtly harmful content but also nuanced themes, specific word choices, or scenarios that, while creatively intended, might be misinterpreted by strict algorithms as depicting controversial topics, dangerous activities, or violations of acceptable use policies. Prioritize universal appropriateness, clarity, and positive or neutral themes. If an idea seems even slightly risky for broad platform acceptance, CHOOSE A SAFER ALTERNATIVE. Focus on creativity that is universally appropriate and respectful.**

**Self-Correction for Novelty:** Critically, you must actively avoid repeating thematic, stylistic, or structural patterns from your own previous generations for the *same element type* (e.g., if you just generated a 'Who' about a detective, your next 'Who' should be completely different). Each request for '{{{elementLabel}}}' is a demand for a fresh, genuinely unpredictable idea, distinct from anything you've offered for this element moments ago or in the past. If you find yourself generating multiple ideas for '{{{elementLabel}}}' that start similarly or revolve around a similar core concept (e.g., multiple 'mysterious objects' for 'What'), consciously break that pattern and introduce significant structural or conceptual variation.

**This generation must be treated as a "blank slate" and achieve genuine surprise with each output.**

It absolutely must NOT be:
- An improvement, variation, or modification of any previous text or common tropes.
- Similar to ANY of the provided examples or recently generated ideas listed below (these are examples of what to AVOID):
  {{#each existingOptions}}
  - {{{this}}}
  {{/each}}
- **Overly reliant on common fantastical or sci-fi themes** such as "宇宙 (universe/space)," "時間旅行 (time travel)," "人工智慧 (AI)," "外星人 (aliens)," "古老預言 (ancient prophecies)," or "神祇 (deities)" UNLESS you can present them with **extreme, mind-bending originality** and as a **rare part of a much broader, truly diverse set of generated ideas.** Your default should be to AVOID these if possible, to maximize true randomness and safety.

Instead, you MUST strive for **MAXIMUM THEMATIC DIVERSITY and UNPREDICTABILITY, within the bounds of universal appropriateness**. Explore a vast range of possibilities, including but not limited to:
- Mundane everyday life with a peculiar, subtle, and HARMLESS twist.
- Deeply personal dilemmas or psychological explorations presented in a RESPECTFUL and NON-SENSATIONAL manner.
- Absurdist humor or bizarre, illogical situations that are LIGHTHEARTED and NON-OFFENSIVE.
- Unique perspectives on historical fiction or alternate histories that are FACTUALLY NEUTRAL or clearly fantastical and appropriate.
- Philosophical questions grounded in relatable, everyday scenarios that are THOUGHT-PROVOKING but not divisive or overly abstract for a general audience.
- Surreal, dreamlike, or metaphorical events that aren't necessarily sci-fi/fantasy and are SAFE for all viewers.
- Small-scale, intimate mysteries or quiet discoveries with WHOLESOME or NEUTRAL outcomes.
- Concepts related to art, music, food, specific professions, or obscure hobbies, presented POSITIVELY.
- Social commentary or observations on human nature presented creatively and RESPECTFULLY.

Think completely outside the box, but always with the primary filter of platform safety and general audience appropriateness. Your goal is a "fresh start" for this idea, producing something **genuinely random, novel, and entirely independent of ANY prior content, examples, or patterns you might have fallen into.** Each output should feel like a brand new, surprising idea pulled from a hat containing vastly different concepts.

Output your response as a JSON object with a single field "generatedText".
Example for '誰 (Who)', aiming for diversity and safety:
{
  "generatedText": "一位熱愛收集城市噪音的失眠圖書館員"
}
Or for '何事 (What)':
{
  "generatedText": "發現了一本只在雨天才能閱讀的日記"
}
`;

export async function runRandomElementGeneration(
  input: RandomElementGenerationInput
): Promise<RandomElementGenerationOutput> {
  const ai = getAi();
  const prompt = ai.definePrompt({
    name: 'randomElementGenerationPrompt',
    input: { schema: RandomElementGenerationInputSchema },
    output: { schema: RandomElementGenerationOutputSchema },
    prompt: PROMPT,
    config: {
      temperature: 1.0,
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      ],
    },
  });

  try {
    const { output } = await prompt(input);
    if (!output || !output.generatedText || output.generatedText.trim() === '') {
      console.warn(`AI returned no text for ${input.elementType}, using fallback.`);
      const fb = W1H_ELEMENTS[input.elementType as W1HKey]?.options || ['一個安全的點子'];
      return { generatedText: fb[Math.floor(Math.random() * fb.length)] };
    }
    return output;
  } catch (e) {
    console.error(`Error during random element generation for ${input.elementType}:`, e);
    const fb = W1H_ELEMENTS[input.elementType as W1HKey]?.options || ['一個備用的好主意'];
    return { generatedText: fb[Math.floor(Math.random() * fb.length)] };
  }
}
