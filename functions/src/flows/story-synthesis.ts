import { z } from 'genkit';
import { getAi } from '../genkit';
import { StoryStyleSchema, GradeLevelSchema, buildStyleAndGradeHints } from '../prompt-modifiers';

export const StorySynthesisInputSchema = z.object({
  who: z.string(),
  what: z.string(),
  when: z.string(),
  where: z.string(),
  why: z.string(),
  how: z.string(),
  turnstileToken: z.string().optional(),
  style: StoryStyleSchema,
  gradeLevel: GradeLevelSchema,
});
export type StorySynthesisInput = z.infer<typeof StorySynthesisInputSchema>;

export const StorySynthesisOutputSchema = z.object({
  title: z.string(),
  story: z.string(),
});
export type StorySynthesisOutput = z.infer<typeof StorySynthesisOutputSchema>;

const PROMPT = `You are a creative AI assistant specializing in weaving compelling short stories or descriptive paragraphs in Standard Traditional Chinese (標準繁體中文), complete with an appropriate title.
Ensure the language used is Standard Traditional Chinese (標準繁體中文), natural and fluent for a general Taiwanese audience. Avoid Mainland Chinese specific terminology, and overly niche colloquialisms or dialect-specific terms that might not be widely understood in Taiwan.

**Crucially, the content must be safe and appropriate for general audiences, including blog posts and other common online platforms.**
Be extremely mindful of generating content that is broadly suitable. **Avoid themes, language, or imagery that could inadvertently violate common "Acceptable Use Policies" on various platforms, even if not strictly harmful or explicit by typical safety filter definitions.**
This includes, but is not limited to:
- Themes that might be considered unsettling, overly dark, or promoting unhealthy behaviors.
- Abstract or philosophical explorations of existence, consciousness, death, or spirituality if they could be misinterpreted or flagged by automated systems.
- Content that could be perceived as depicting or encouraging self-harm, violence (even fantastical if too graphic), or **dangerous activities (e.g., accidental ingestion of harmful substances, risky behaviors presented humorously, or glorification of unsafe practices).**
- Subtle allusions that sensitive automated filters might flag.

Aim for imaginative, engaging, yet **grounded storytelling suitable for a very wide audience.** If a creative idea seems like it might push the boundaries of what is typically acceptable on a general content platform, please err on the side of caution and choose a safer, more universally appropriate narrative direction. Prioritize clarity, positive or neutral themes, and widely understandable scenarios.

Given the following 5W1H elements:
Who: {{{who}}}
What: {{{what}}}
When: {{{when}}}
Where: {{{where}}}
Why: {{{why}}}
How: {{{how}}}

1.  First, generate a concise, engaging, and relevant title for the story that captures its essence. The title must be in Standard Traditional Chinese, using language natural for Taiwanese audiences. **Try to naturally incorporate the main character (from the 'Who' element: {{{who}}}) into the title if it fits well with the story's theme and enhances the title. If including the 'Who' element makes the title awkward or too long, prioritize a creative and fitting title even without it.**
2.  Then, combine these elements into a coherent and engaging short story or a descriptive paragraph. The story should be a creative interpretation and expansion of the provided elements, written in a style that is fluent and natural for Taiwanese readers, while adhering to the safety and appropriateness guidelines above.

Output your response as a JSON object matching the schema, including 'title' and 'story' fields.
`;

export async function runStorySynthesis(
  input: StorySynthesisInput
): Promise<StorySynthesisOutput> {
  const ai = getAi();
  const styleGradeHint = buildStyleAndGradeHints(input);

  // Inline-replace template vars; runtime-built prompt avoids registry warnings
  const promptText = (PROMPT + styleGradeHint)
    .replace(/\{\{\{who\}\}\}/g, input.who)
    .replace(/\{\{\{what\}\}\}/g, input.what)
    .replace(/\{\{\{when\}\}\}/g, input.when)
    .replace(/\{\{\{where\}\}\}/g, input.where)
    .replace(/\{\{\{why\}\}\}/g, input.why)
    .replace(/\{\{\{how\}\}\}/g, input.how);

  try {
    const { output } = await ai.generate({
      prompt: promptText,
      output: { schema: StorySynthesisOutputSchema },
      config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
    });
    if (!output || !output.story || !output.title) {
      console.error('Story synthesis response missing title/story:', input);
      return {
        title: '生成標題失敗',
        story: '無法合成故事或標題，請稍後再試或調整您的5W1H元素。可能是內容觸發了安全限制或未能正確回應。',
      };
    }
    return output;
  } catch (e: any) {
    console.error('Error during story synthesis flow:', e);
    if (e?.message && (e.message.includes('blocked by safety settings') || e.message.includes('candidate was blocked by safety reasons'))) {
      return {
        title: '內容生成受阻',
        story: '合成故事時，部分內容可能因觸發安全限制而被阻擋。請嘗試調整輸入的5W1H元素，或簡化內容後再試。',
      };
    }
    return {
      title: '合成發生錯誤',
      story: '合成故事時遇到未預期的問題，請稍後再試。',
    };
  }
}
