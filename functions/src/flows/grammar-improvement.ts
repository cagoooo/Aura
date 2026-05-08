import { z } from 'genkit';
import { getAi } from '../genkit';

export const GrammarImprovementInputSchema = z.object({
  elementType: z.enum(['who', 'what', 'when', 'where', 'why', 'how']),
  text: z.string(),
  elementLabel: z.string(),
  turnstileToken: z.string().optional(),
});
export type GrammarImprovementInput = z.infer<typeof GrammarImprovementInputSchema>;

export const GrammarImprovementOutputSchema = z.object({
  refinedText: z.string(),
});
export type GrammarImprovementOutput = z.infer<typeof GrammarImprovementOutputSchema>;

const PROMPT = `You are an expert editor specializing in refining and enhancing text in Traditional Chinese for a Taiwanese audience. Your goal is not just to correct grammatical errors, but to significantly improve the fluency, naturalness, and impact of the provided text. If the text is already perfect or requires no substantial improvement for clarity and naturalness in Taiwanese Mandarin, return it unchanged. However, if it can be made more concise, vivid, grammatically correct, or engaging while maintaining its original meaning for the element type, please make those improvements.

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
`;

export async function runGrammarImprovement(
  input: GrammarImprovementInput
): Promise<GrammarImprovementOutput> {
  if (!input.text.trim()) return { refinedText: input.text };

  const ai = getAi();
  const prompt = ai.definePrompt({
    name: 'grammarImprovementPrompt',
    input: { schema: GrammarImprovementInputSchema },
    output: { schema: GrammarImprovementOutputSchema },
    prompt: PROMPT,
  });

  const { output } = await prompt(input);
  if (!output || typeof output.refinedText === 'undefined') {
    return { refinedText: input.text };
  }
  return output;
}
