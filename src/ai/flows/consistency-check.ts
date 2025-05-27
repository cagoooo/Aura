
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
  prompt: `You are an AI assistant that analyzes the consistency of a story described by the 5W1H elements (Who, What, When, Where, Why, How).
All your output, including any suggestions, must be in Traditional Chinese (繁體中文) and tailored to Taiwanese language customs.

Given the following 5W1H elements:
Who: {{{who}}}
What: {{{what}}}
When: {{{when}}}
Where: {{{where}}}
Why: {{{why}}}
How: {{{how}}}

Analyze these elements.
If they are consistent, set 'isConsistent' to true and provide an empty array for 'suggestions'.
If they are not consistent, set 'isConsistent' to false and provide specific 'suggestions' in Traditional Chinese (繁體中文) for adjusting them to ensure the overall narrative is consistent and makes sense.
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
    return output!;
  }
);

