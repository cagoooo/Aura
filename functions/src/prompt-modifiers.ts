// Shared prompt fragments for #34 (style) + #29 (grade level).
// Each flow that wants to honor user settings calls these helpers and
// concatenates the fragment into its system prompt.

import { z } from 'genkit';

export const StoryStyleSchema = z.enum([
  'free', 'fairytale', 'wuxia', 'scifi', 'mystery', 'school', 'folklore',
]).optional();

export const GradeLevelSchema = z.enum([
  'auto', 'lower', 'middle', 'upper', 'junior',
]).optional();

export type StoryStyle = z.infer<typeof StoryStyleSchema>;
export type GradeLevel = z.infer<typeof GradeLevelSchema>;

const STYLE_HINT: Record<NonNullable<StoryStyle>, string> = {
  free: '',  // 自由 = 不限風格（既有行為）
  fairytale: '故事**風格**：童話。要溫暖、夢幻、適合兒童，可以有擬人化的動植物、王子公主、會說話的物品、會發光的森林等。語氣輕鬆、結局正面。',
  wuxia: '故事**風格**：武俠。要有江湖、武林、輕功、武功招式、復仇/俠義/恩怨、客棧、武林大會、寶劍/秘笈等元素。用詞偏古典文言，但不要太晦澀。',
  scifi: '故事**風格**：科幻。要涉及未來科技、太空旅行、AI、虛擬世界、生物工程、時空、量子、機械、外星文明等。要有科學感但不要硬到學生看不懂。',
  mystery: '故事**風格**：推理。要有謎團、線索、嫌疑人、不在場證明、轉折、真相揭露。讀者要能跟著主角推理，不要靠運氣破案。',
  school: '故事**風格**：校園。要發生在校園或學生日常生活，有同學、老師、社團、考試、暗戀、校慶、畢業旅行等元素。語氣青春、貼近學生。',
  folklore: '故事**風格**：民間故事。要有台灣或華人傳統文化背景，例如媽祖、土地公、虎姑婆、廟會、夜市、農曆節慶、家族故事等。語氣樸實有人情味。',
};

const GRADE_HINT: Record<NonNullable<GradeLevel>, string> = {
  auto: '',  // 預設：一般成人語言
  lower: '**適用年級：國小一二年級**。用詞要極簡單（國小低年級認字量約 1500 字內），句子短（10 字內為宜），可以多用注音可拼出的字。避免成語與抽象詞彙。每個 5W1H 元素 8-15 字。',
  middle: '**適用年級：國小三四年級**。用詞中等難度（中年級認字量約 2000-3000 字），可以用少量成語與簡單比喻。句子 10-20 字。每個 5W1H 元素 10-25 字。',
  upper: '**適用年級：國小五六年級**。可以使用較豐富的詞彙與修辭（譬喻、擬人、誇飾），句子可以稍長有層次。每個 5W1H 元素 15-35 字。',
  junior: '**適用年級：國中**。可以用較深的詞彙與較複雜的句構，但仍要清楚易讀。允許文學性的表達、隱喻、引用。每個 5W1H 元素 15-40 字。',
};

/**
 * Return a paragraph of additional instructions to append onto the base
 * system prompt. Empty string if user picked defaults.
 */
export function buildStyleAndGradeHints(input: {
  style?: StoryStyle;
  gradeLevel?: GradeLevel;
}): string {
  const parts: string[] = [];
  const s = input.style;
  const g = input.gradeLevel;
  if (s && s !== 'free' && STYLE_HINT[s]) parts.push(STYLE_HINT[s]);
  if (g && g !== 'auto' && GRADE_HINT[g]) parts.push(GRADE_HINT[g]);
  if (parts.length === 0) return '';
  return '\n\n=== 使用者偏好（必須遵守） ===\n' + parts.join('\n\n');
}
