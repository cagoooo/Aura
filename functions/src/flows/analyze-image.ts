import { z } from 'genkit';
import { getAi } from '../genkit';

export const AnalyzeImageInputSchema = z.object({
  // Data URL (data:image/jpeg;base64,...) — front-end compresses before send
  imageDataUrl: z.string().min(20),
  turnstileToken: z.string().optional(),
});
export type AnalyzeImageInput = z.infer<typeof AnalyzeImageInputSchema>;

export const AnalyzeImageOutputSchema = z.object({
  who: z.string(),
  what: z.string(),
  when: z.string(),
  where: z.string(),
  why: z.string(),
  how: z.string(),
});
export type AnalyzeImageOutput = z.infer<typeof AnalyzeImageOutputSchema>;

const SYSTEM_PROMPT = `你是一位富有想像力的繁體中文（台灣）創意寫作老師，專長是看圖說故事。
請根據使用者上傳的圖片，**自由創作**一個有趣、適合一般觀眾的故事 5W1H 元素。

**重要原則**：
1. 全部用繁體中文（台灣用語），避免中國大陸特有的詞彙。
2. 內容必須適合一般大眾與兒童觀看，**不要**有暴力、恐怖、政治、性暗示等。
3. **不是描述圖片**，而是「以這張圖片為靈感」創作一個原創故事。如果圖片是一隻貓，不要寫「一隻在沙發上的貓」，而要寫「會解開古老謎題的失憶貓偵探」這種有戲劇張力的點子。
4. 6 個元素之間要有故事邏輯，能串成一個完整故事概念。
5. 每個欄位**簡短有力**（10-30 字），不要寫一整段。
6. 風格要有趣、出人意料、富有想像力，但不需要荒誕到難以理解。

**輸出 JSON 格式**：
{
  "who": "故事的主角是誰（簡短的人物描述）",
  "what": "發生了什麼關鍵事件",
  "when": "故事發生在什麼時間（季節、年代、特殊時刻）",
  "where": "故事發生在什麼地點",
  "why": "事件發生的原因或主角的動機",
  "how": "事件如何進行或解決"
}`;

export async function runAnalyzeImage(input: AnalyzeImageInput): Promise<AnalyzeImageOutput> {
  const ai = getAi();

  // Multimodal generate: text + image part. Gemini 2.5 Flash supports
  // direct base64 data URLs in the `media.url` field.
  const { output } = await ai.generate({
    prompt: [
      { text: SYSTEM_PROMPT },
      { text: '請看完這張圖片後，產出一個 5W1H 故事概念：' },
      { media: { url: input.imageDataUrl } },
    ],
    output: { schema: AnalyzeImageOutputSchema },
    config: {
      temperature: 0.95,
      safetySettings: [
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      ],
    },
  });

  if (!output) {
    throw new Error('AI 未能根據圖片產出故事元素，請換張圖片再試。');
  }
  return output;
}
