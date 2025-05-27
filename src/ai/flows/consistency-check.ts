
// consistency-check.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for checking the consistency of 5W1H elements.
 *
 * - `consistencyCheck`: Analyzes the generated 5W1H elements and suggests adjustments to ensure narrative consistency.
 * - `ConsistencyCheckInput`: The input type for the `consistencyCheck` function.
 * - `ConsistencyCheckOutput`: The return type for the `consistencyCheck` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ConsistencyCheckInputSchema = z.object({
  who: z.string().describe('Who is involved in the story.'),
  what: z.string().describe('What happened in the story.'),
  when: z.string().describe('When the story took place.'),
  where: z.string().describe('Where the story took place.'),
  why: z.string().describe('Why the story happened.'),
  how: z.string().describe('How the story happened.'),
});

export type ConsistencyCheckInput = z.infer<typeof ConsistencyCheckInputSchema>;

const ConsistencyCheckOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('Suggestions for adjusting the 5W1H elements to improve consistency. These suggestions should be in Traditional Chinese (繁體中文).'),
  isConsistent: z.boolean().describe('Whether the 5W1H elements are consistent.'),
});

export type ConsistencyCheckOutput = z.infer<typeof ConsistencyCheckOutputSchema>;

export async function consistencyCheck(input: ConsistencyCheckInput): Promise<ConsistencyCheckOutput> {
  return consistencyCheckFlow(input);
}

const consistencyCheckPrompt = ai.definePrompt({
  name: 'consistencyCheckPrompt',
  input: {schema: ConsistencyCheckInputSchema},
  output: {schema: ConsistencyCheckOutputSchema},
  prompt: `You are an expert story editor AI that analyzes the consistency of a story concept described by the 5W1H elements (Who, What, When, Where, Why, How).
All your output, including any suggestions, must be in Traditional Chinese (繁體中文) and tailored to Taiwanese language customs.

Given the following 5W1H elements:
Who: {{{who}}}
What: {{{what}}}
When: {{{when}}}
Where: {{{where}}}
Why: {{{why}}}
How: {{{how}}}

Analyze these elements for narrative coherence and logical consistency.

If they are fundamentally consistent and form a plausible (even if fantastical) basis for a story, set 'isConsistent' to true and provide an empty array for 'suggestions'.

If they are not consistent, or if the combination presents clear narrative challenges or plot holes, set 'isConsistent' to false. Then, provide **constructive, specific, and actionable suggestions** in Traditional Chinese (繁體中文) for adjusting one or more elements. Your suggestions should:
- Clearly explain the inconsistency or narrative weakness you identified.
- Offer concrete examples of how to modify elements to resolve the issue. For example, "Consider changing 'Where' to 'X' to better align with 'Who' being 'Y', because..."
- Focus on improving logical flow, thematic resonance, and the overall believability or engagement of the story concept.
- If possible, offer 2-3 distinct suggestions if multiple inconsistencies are found or if there are multiple ways to resolve a single issue.
- Aim to help the user develop a more compelling and coherent story foundation.
- Ensure suggestions are practical and can be implemented by changing the text of one or more 5W1H elements.

Format your output as a JSON object matching the schema.
  `,
});

const consistencyCheckFlow = ai.defineFlow(
  {
    name: 'consistencyCheckFlow',
    inputSchema: ConsistencyCheckInputSchema,
    outputSchema: ConsistencyCheckOutputSchema,
  },
  async input => {
    const {output} = await consistencyCheckPrompt(input);
    if (!output) {
      // Handle the case where the AI response could not be parsed or was empty
      console.error("Consistency check AI response was undefined or malformed for input:", input);
      return {
        isConsistent: false,
        suggestions: ['AI分析內容時發生錯誤，無法提供一致性建議，請稍後再試或調整輸入內容。'],
      };
    }
    return output;
  }
);

