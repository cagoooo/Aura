
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
import { verifyTurnstileToken } from '@/lib/turnstile-server';

const ConsistencyCheckInputSchema = z.object({
  who: z.string().describe('Who is involved in the story.'),
  what: z.string().describe('What happened in the story.'),
  when: z.string().describe('When the story took place.'),
  where: z.string().describe('Where the story took place.'),
  why: z.string().describe('Why the story happened.'),
  how: z.string().describe('How the story happened.'),
  turnstileToken: z.string().optional().describe('Cloudflare Turnstile token for bot protection.'),
});

export type ConsistencyCheckInput = z.infer<typeof ConsistencyCheckInputSchema>;

const ConsistencyCheckOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('Suggestions for adjusting the 5W1H elements to improve consistency. These suggestions should be in natural and fluent Traditional Chinese (繁體中文) commonly used in Taiwan. Each string in the array should represent a distinct suggestion or point of feedback.'),
  isConsistent: z.boolean().describe('Whether the 5W1H elements are consistent.'),
});

export type ConsistencyCheckOutput = z.infer<typeof ConsistencyCheckOutputSchema>;

export async function consistencyCheck(input: ConsistencyCheckInput): Promise<ConsistencyCheckOutput> {
  await verifyTurnstileToken(input.turnstileToken);
  return consistencyCheckFlow(input);
}

const consistencyCheckPrompt = ai.definePrompt({
  name: 'consistencyCheckPrompt',
  input: {schema: ConsistencyCheckInputSchema},
  output: {schema: ConsistencyCheckOutputSchema},
  prompt: `You are an expert story editor AI that analyzes the consistency of a story concept described by the 5W1H elements (Who, What, When, Where, Why, How).
All your output, including any suggestions, must be in natural and fluent Traditional Chinese (繁體中文) commonly used in Taiwan, avoiding Mainland Chinese specific terminology. Your suggestions should be clear, easy to understand, and directly applicable for a user in Taiwan.

Given the following 5W1H elements:
Who: {{{who}}}
What: {{{what}}}
When: {{{when}}}
Where: {{{where}}}
Why: {{{why}}}
How: {{{how}}}

Analyze these elements for narrative coherence and logical consistency.

If they are fundamentally consistent and form a plausible (even if fantastical) basis for a story, set 'isConsistent' to true and provide an empty array for 'suggestions'.

If they are not consistent, or if the combination presents clear narrative challenges or plot holes, set 'isConsistent' to false. Then, provide **constructive, specific, and actionable suggestions** in natural and fluent Traditional Chinese (繁體中文) commonly used in Taiwan. Your suggestions should adhere to the following formatting guidelines to ensure clarity in the UI:

1.  **Granular Suggestions**: For each distinct problem you identify (e.g., an issue with 'Why', a separate issue with 'Where', or a conflict between 'When' and 'What'), formulate it as a **separate string** in the 'suggestions' array. This means if you have three major points of feedback, the 'suggestions' array should contain three strings.

2.  **Structured Content within Each Suggestion String**: For each string in the 'suggestions' array, structure the content clearly. For example:
    *   Start by identifying the element(s) in question: "關於「為何 (Why)」元素："
    *   Clearly state the problem: "問題點：目前的「為何」與「事件 (What)」的連結較弱。"
    *   Offer concrete, actionable advice: "建議調整：可以考慮將「為何」修改為 '...'，因為這樣更能突顯主角的動機並與事件的核心衝突呼應。"
    *   If offering multiple alternative solutions for a single problem point, use simple numbered lists (e.g., "1. ...", "2. ...") or bullet points (e.g., "- ...") within that string.
    *   Use newlines (\n) within the string to separate these parts (identification, problem, suggestion) for better readability.

3.  **Focus**:
    *   Clearly explain the inconsistency or narrative weakness you identified.
    *   Offer concrete examples of how to modify elements to resolve the issue. For example, "考慮將「地點 (Where)」從 'X' 改為 'Y'，以更好地配合「人物 (Who)」的背景設定 'Z'，因為..."
    *   Focus on improving logical flow, thematic resonance, and the overall believability or engagement of the story concept.
    *   Aim to help the user develop a more compelling and coherent story foundation.
    *   Ensure suggestions are practical and can be implemented by changing the text of one or more 5W1H elements.

Example of a **single string** in the 'suggestions' array if addressing one issue with 'Why':
"關於「為何 (Why)」元素：\n問題點：目前的動機「尋找遺失的食譜」與「外太空的科幻冒險 (What, Where)」主題不太協調。\n建議調整：\n1. 將「為何」改為「尋找失落的古代外星科技」，更能融入科幻背景。\n2. 或者，將「為何」設定為「為了拯救被食譜詛咒的母星」，將看似不相關的元素巧妙連結。"

If you have another separate issue with 'When', it would be a *new string* in the 'suggestions' array.

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
    if (!output || !output.suggestions) { 
      console.error("Consistency check response was undefined, malformed, or missing suggestions for input:", input);
      return {
        isConsistent: false,
        suggestions: ['分析內容時發生錯誤，無法提供一致性建議，請稍後再試或調整輸入內容。'],
      };
    }
    return output;
  }
);

    