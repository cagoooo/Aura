# 後續優化改良建議

> 給「5W1H 靈感發射器 Pro」未來迭代的參考。每一條都附：**為什麼要做、難度、預估工時、收益**，可依優先順序逐項挑選。
>
> 最後更新：2026-05-08（4 波部署完成）

---

## ✅ 已完成（4 波，22 個主功能）

### 🌊 Wave 1 — 基礎遷移與 SaaS 化（路線 B + skill 新增）
| # | 內容 | 影響 |
| --- | --- | --- |
| 1 | Server Actions → Firebase Cloud Functions（路線 B 遷移）| 真 serverless，[https://cagoooo.github.io/Aura/](https://cagoooo.github.io/Aura/) 上線 |
| 2 | Cloudflare Turnstile（前端 widget + server verify + race condition / token 序列化修復）| 防 bot 燒 quota，invisible |
| 3 | 音效檔 confetti-{short,grand}.mp3（ffmpeg 合成）| 修正既有 bug |
| 4 | favicon SVG + 4 size PNGs + apple-touch-icon | 瀏覽器標籤頁有 icon |
| 5 | OG 預覽圖 1200×630（@napi-rs/canvas + Noto Sans TC subset）| LINE/FB 卡片中文不變方框 |
| 6 | `footer-year-update` skill（新建）| 未來自動掃過期版權年份 |
| 7 | docs：USAGE.md / MIGRATION.md / OPTIMIZATION.md / 完整 README | 接手友善 |

### 🌊 Wave 2 — 速度與體驗優化（9 items）
| # | 內容 | 收益 |
| --- | --- | --- |
| 8 | bulk endpoint + 樂觀 UI | 初始載入 6-10s → ~3s + 0s 感知延遲 |
| 9 | 預算上限 NT$100/月 + 4 段警戒 | 防破產 |
| 10 | 拿掉 `ignoreBuildErrors`（typecheck 0 錯）| 嚴格 TS 防偷渡 |
| 11 | CI 自動部署 functions（service account + GitHub Secret）| push 自動上線後端 |
| 12 | bulk 化「潤飾語法」 | 6s → 2-3s |
| 13 | 合成內容打字機動效（fake stream）| 不無聊 |
| 14 | 鍵盤快捷鍵（Space/G/C/S/1-6）| 老師熟練超快 |
| 15 | Onboarding Dialog 5 步驟教學（localStorage flag）| 第一次進來知道怎麼用 |
| 16 | PDF 列印（window.print + @media print CSS）| 教學現場必備 |
| 17 | 多格式複製（純文字/Markdown/LINE/W1H-only）| 分享更彈性 |

### 🌊 Wave 3 — 殺手級功能（3 items）
| # | 內容 | 殺手程度 |
| --- | --- | --- |
| 18 | **📷 看圖編故事**（Gemini 2.5 vision 多模態）| ⭐⭐⭐⭐⭐ |
| 19 | **🎯 一鍵生成簡報**（Gamma + NotebookLM deep links）| ⭐⭐⭐ |
| 20 | **🔗 永久分享連結**（Firestore + 90 天 TTL + #/s/ hash route）| ⭐⭐⭐⭐ |

### 🌊 Wave 4 — 體驗打磨（4 items）
| # | 內容 | 細節 |
| --- | --- | --- |
| 21 | Skeleton loader 取代 spinner | 3 行 shimmer 模擬「AI 起草中」 |
| 22 | Stagger 動畫（120ms cascade）| 6 張卡依序變內容，不再 snap |
| 23 | Cold start 訊息（>1.5s 才顯示）| 第一次按按鈕不冷場 |
| 24 | SW 版本號自動偵測（version.json polling + sticky toast）| 部署新版 5 分鐘內告知 |

**累計工時**：~12 小時 ｜ **代碼量**：26 個 commit, 30+ 個新檔, 6 個 Cloud Functions, 1 個 Firestore collection

---

## 🚦 推薦的下一步走法

按優先級排序的 4 個方向（先選 1-2 個，做完再回來看下個）：

| 方向 | 工時 | 適合什麼時候做 |
| --- | --- | --- |
| **A. 教學現場深度**（學習單、課堂模式、語音輸入）| 半天~1天 | 想真正進教室用 |
| **B. 跨裝置 + 個人帳號**（Firebase Auth + saved drafts）| 一個下午 | 自己用得勤 |
| **C. 創意風格擴展**（風格切換、擴寫/縮寫、AI 對話迭代）| 一個下午 | 想要「下一波 wow」 |
| **D. 維運加固**（Sentry、rate limiting、App Check、E2E）| 半天 | 開放給更多老師用之前 |

我會用接下來的章節分波列出，但**沒有強制順序** — 你想先做哪個就做哪個。

---

## 🎓 第五波 · 教學現場深度（2-3 天，最高 ROI）

### 25. 課堂模式 / Live Mode（投影專用）
**為什麼**：用投影機投到大螢幕時，目前介面字太小、太多互動細節分心。
**難度**：⭐⭐ ｜**工時**：1 小時
**做法**：
- 加 `?mode=live` 或 `F11` 切換 → 進入「投影模式」
- 隱藏 floating buttons / header 縮小
- 字級 +30%、卡片 padding 加大、按鈕變超大
- 顏色對比度拉高（防投影機褪色）
- 「全部隨機」自動連發 N 次（給老師 cold open 一節課）

### 26. 學習單模式（PDF 模板）
**為什麼**：老師印出來給學生填，是國小資訊課常見作業形式。
**難度**：⭐⭐⭐ ｜**工時**：2 小時
**做法**：
- 列印按鈕加 dropdown：「列印故事」/ 「列印學習單（空白）」/ 「列印學習單（含答案）」
- 學習單版本：6 個 W1H 變成空白格 + 學生姓名/座號欄
- 用 print CSS 控制版面，不依賴 jsPDF

### 27. 班級語音輸入（Web Speech API）
**為什麼**：學生口頭發想容易，打字速度慢；用嘴巴說出來，文字自動填入卡片。
**難度**：⭐⭐ ｜**工時**：1 小時
**做法**：
- 每張卡片右側加麥克風按鈕
- `webkitSpeechRecognition` 抓 zh-TW
- 邊講邊把文字寫進 textarea
- iPhone Safari 不支援 → fallback 到「按一下、講完、再按一下」模式

### 28. AI 點評學生作答
**為什麼**：學生填完自己的 5W1H → AI 給創意/邏輯/語法回饋 → 老師教學減負擔。
**難度**：⭐⭐⭐ ｜**工時**：1 小時
**做法**：
- 新 endpoint `evaluateStudentWork({ w1h })` → 回 `{ creativity: 7/10, logic: 8/10, grammar: 9/10, feedback: "..." }`
- 卡片下方多一顆「📝 請 AI 點評」按鈕
- 結果用 Recharts 雷達圖顯示

### 29. 對齊九年一貫課綱
**為什麼**：教育部每階段語文目標不同，AI 可以差異化生成。
**難度**：⭐⭐ ｜**工時**：1 小時
**做法**：
- 設定下拉選單「年級」：低年級 / 中年級 / 高年級 / 國中
- 不同年級切換不同 system prompt（用詞難度、句長、文化內涵）
- 預設 = 中年級（國小四年級）

### 30. 班級廣播（多人同步檢視）
**為什麼**：老師分享連結 → 全班同時打開 → 老師按「Sync」→ 學生螢幕一起跳到同一張 → 像簡報但是互動式。
**難度**：⭐⭐⭐⭐ ｜**工時**：1 天
**做法**：
- Firestore realtime 監聽
- 老師端「廣播模式」按鈕，學生端進入後自動追隨
- 簡單做：透過 hash URL `?room=abc123` 加入廣播間

---

## 🔐 第六波 · 個人帳號 + 跨裝置（一個下午）

### 31. Firebase Auth + saved drafts
**為什麼**：在學校做的草稿，回家想繼續編輯但已經沒了。**用 Firebase Auth 比 Supabase 簡單**（已是 Firebase 生態）。
**難度**：⭐⭐⭐ ｜**工時**：3-4 小時
**做法**：
- Firebase Auth + Google one-tap 登入
- 每位 user 雲端存最後 N 個 drafts（卡片 + 最近合成）
- 自動同步當前 6 張卡狀態（debounce 5 秒）
- 換裝置打開自動載入
- 已經有 Firestore 設好，直接加 `users/{uid}/drafts/{id}` 結構

### 32. 個人故事庫（Personal Story Library）
**為什麼**：合成過的故事希望永久收藏，可以回顧。
**難度**：⭐⭐ ｜**工時**：2 小時
**做法**：
- 登入後加「我的故事」抽屜
- 列出歷史合成的故事（標題 + 日期）
- 點擊回填到主畫面繼續編輯
- 建立在 #31 之上

### 33. 公開故事 Hall of Fame（社群感）
**為什麼**：使用者按「公開」可以讓故事進入瀏覽頁，建立社群感、增加用戶停留。
**難度**：⭐⭐⭐ ｜**工時**：3 小時
**做法**：
- 分享連結加 checkbox「公開到瀏覽頁」
- 新 route `/Aura/#/discover` 列出最近 50 個公開故事
- 加按讚 / 收藏功能（無登入也能按）
- 老師審核機制（你 own admin role 看得到「下架」按鈕）

---

## ✨ 第七波 · 創意內容擴展（一個下午）

### 34. 風格切換器（武俠 / 科幻 / 童話 / 推理）
**為什麼**：教學主題會輪換 — 上週上童話，這週上推理 — 內容風格不同會更帶感。
**難度**：⭐⭐ ｜**工時**：1 小時
**做法**：
- toolbar 加 dropdown「風格」：自由 / 童話 / 武俠 / 科幻 / 推理 / 校園 / 民間
- 6 個 W1H 的 prompt 都加風格 hint
- 預設值「自由」=現有行為

### 35. 故事擴寫 / 縮寫
**為什麼**：合成完故事，老師想要「擴寫成 5 倍長」當教材，或「縮寫成 100 字」當摘要練習。
**難度**：⭐⭐ ｜**工時**：1 小時
**做法**：
- 故事卡上加「擴寫 ↗」「縮寫 ↘」兩顆按鈕
- 新 endpoint `rewriteStory({ originalStory, mode: 'expand' | 'compress', targetWordCount })`
- 用既有 typewriter UI 漸顯結果

### 36. AI 對話迭代（"make it darker"）
**為什麼**：合成完故事不滿意？想要「更黑暗」「換成第一人稱」「加個轉折」。
**難度**：⭐⭐⭐ ｜**工時**：2-3 小時
**做法**：
- 故事卡下加 chatbox：「請給我一個更 ___ 的版本」
- 新 endpoint `iterateStory({ currentStory, instruction })`
- 結果取代既有故事 + 保留歷史版本可回滾

### 37. 多圖串故事
**為什麼**：上傳 2-3 張圖 → AI 串成連續分場故事，做漫畫腳本超適合。
**難度**：⭐⭐⭐ ｜**工時**：2 小時
**做法**：
- 圖片上傳對話框改可選多張
- analyzeImage 改 multi-image，每張對應一個「場景」
- 6 W1H 由多場景共同決定主角/事件/動機

### 38. Imagen 故事插圖（Gemini 圖片生成）
**為什麼**：合成完故事，產 4 張對應場景的插圖 → 國小美術課可直接用。
**難度**：⭐⭐⭐⭐ ｜**工時**：3-4 小時
**做法**：
- Gemini 2.5 Flash Image / Imagen 3 API
- 新 endpoint `illustrateStory({ story, sceneCount: 4 })`
- 結果 4 張圖排版做「故事板」（三段式：開頭 / 高潮 / 結尾）
- ⚠️ Imagen 需 Vertex AI，計費另算，先估 quota

---

## 🛡️ 第八波 · 維運加固（半天，開放更多老師用之前必做）

### 39. Sentry 錯誤回報
**為什麼**：使用者出問題不會主動回報；Sentry 會自動收集 stack trace + replay。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：
- 註冊 Sentry 免費帳號（5K events/月）
- `npm install @sentry/nextjs` + `@sentry/serverless`（functions 端）
- 每個 catch error 都自動回報

### 40. Rate limiting per IP（防個別人燒 quota）
**為什麼**：Turnstile 擋 bot，但人類使用者可能無聊一直按。設個 IP 限額穩妥。
**難度**：⭐⭐ ｜**工時**：1 小時
**做法**：
- Functions 內用 in-memory LRU cache（同一 instance 內共享）
- 每 IP 每分鐘最多 30 次 call、每天最多 500 次
- 超限回 429 + retry-after header

### 41. Firebase App Check
**為什麼**：再加一層「只有 cagoooo.github.io 能 call functions」鎖。雙保險。
**難度**：⭐⭐⭐ ｜**工時**：1 小時
**做法**：
- App Check + reCAPTCHA Enterprise（或重複用 Turnstile）
- Functions `enforceAppCheck: true`
- 前端 SDK `initializeAppCheck`

### 42. LINE 警報（出錯通知到我手機）
**為什麼**：站掛了 / Quota 爆了沒人會發現。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：
- Functions catch 重大 error → 推到 LINE 個人帳號
- 整合 line-messaging-firebase skill

### 43. Lighthouse CI
**為什麼**：performance / a11y 退化要擋 PR merge。
**難度**：⭐⭐ ｜**工時**：30 分鐘
**做法**：
- GitHub Actions 加 `lhci/cli`
- assertions：performance > 80, a11y > 90, best-practices > 90, seo > 90
- 退化的 PR 自動 fail

### 44. Playwright E2E 測試
**為什麼**：5 個關鍵流程（初始載入 / 合成 / 分享 / 看圖 / 打開分享連結）跑通才能 deploy。
**難度**：⭐⭐⭐ ｜**工時**：2 小時
**做法**：
- `npm install -D @playwright/test`
- 寫 5 個 spec
- GitHub Actions deploy 前先跑

---

## 💎 第九波 · 細節打磨（隨意挑著做）

### 45. 主題切換 + dark mode（next-themes）
**為什麼**：學生喜歡換主題增加新鮮感。
**工時**：1-2 小時

### 46. A11y 強化
- 卡片加 `role="region"` + `aria-labelledby`
- 撒花尊重 `prefers-reduced-motion`
- 鎖定狀態用 `aria-pressed`
- 鍵盤焦點環優化
**工時**：1 小時

### 47. SEO + sitemap
- `app/sitemap.ts` + `app/robots.ts`
- 提交 Google Search Console
**工時**：30 分鐘

### 48. Plausible / Umami analytics
- 知道有沒有人在用
**工時**：15 分鐘

### 49. Drag & drop 圖片上傳
**工時**：30 分鐘

### 50. Cmd+V 貼上圖片（從剪貼簿）
**工時**：30 分鐘

### 51. Sonner toast 取代既有 shadcn toast
- 動畫更現代
**工時**：1 小時

### 52. 真 Service Worker（offline-first）
- 不只 polling 偵測新版，加 cache shell + 上次內容
- 沒網路也能看上次合成
- ⚠️ SW 雷區多，搭配 `pwa-cache-bust` skill 才不會卡死
**工時**：3-4 小時

### 53. README 完整介紹（已被多次提及）
- Banner / Demo 連結 / 課堂使用情境 / LICENSE
**工時**：30 分鐘

---

## 🌐 第十波 · 平台延伸（投資型，每項 1 天+）

### 54. iOS / Android App
- Capacitor 包裝既有網站（最快）
- 還是 React Native 重寫（最自然）
- App Store / Play Store 上架手續

### 55. LINE Bot 版
- 在 LINE 內聊「靈感」→ 跳出 5W1H 卡片
- 結合 line-messaging-firebase skill

### 56. Chrome Extension
- 在任何網頁右鍵「為這段文字產生 5W1H」
- popup 嵌入既有 widget

### 57. 學校網站嵌入元件
- 提供 `<iframe>` / Web Component 版本，其他老師可以嵌進自己的教學網站

---

## 📊 一頁式優先順序總表（依價值/工時比排序）

| # | 項目 | 優先級 | 工時 | 收益 |
| --- | --- | --- | --- | --- |
| 48 | Plausible analytics | 🔥 P0 | 15 min | 知道有沒有人用 |
| 25 | 課堂模式（投影專用）| 🔥 P0 | 1 hr | 教學現場立刻有感 |
| 27 | 語音輸入卡片 | 🔥 P0 | 1 hr | 學生用起來超方便 |
| 39 | Sentry 錯誤回報 | 🔥 P0 | 30 min | 出事第一時間知道 |
| 42 | LINE 警報 | 🔥 P0 | 30 min | 站掛了立刻通知 |
| 34 | 風格切換器 | ⭐ P1 | 1 hr | 同樣教材新鮮感 |
| 35 | 故事擴寫 / 縮寫 | ⭐ P1 | 1 hr | 教材彈性 |
| 29 | 對齊九年一貫 | ⭐ P1 | 1 hr | 課堂專業度 |
| 28 | AI 點評學生作答 | ⭐ P1 | 1 hr | 教學減負擔 |
| 47 | SEO sitemap | ⭐ P1 | 30 min | Google 找得到 |
| 53 | README 完整介紹 | ⭐ P1 | 30 min | 公開 repo 第一印象 |
| 31 | Firebase Auth + saved drafts | ⭐ P1 | 3-4 hr | 跨裝置同步 |
| 26 | 學習單模式 | ⭐ P1 | 2 hr | 國小作業必備 |
| 36 | AI 對話迭代 | ⭐ P2 | 2-3 hr | 重新感受 AI |
| 37 | 多圖串故事 | ⭐ P2 | 2 hr | 漫畫腳本利器 |
| 33 | 公開 Hall of Fame | ⭐ P2 | 3 hr | 社群感 |
| 32 | 個人故事庫 | ⭐ P2 | 2 hr | 配合 #31 |
| 41 | App Check | ⭐ P2 | 1 hr | 雙保險 |
| 40 | Rate limiting | ⭐ P2 | 1 hr | 防個別濫用 |
| 38 | Imagen 插圖 | 🌱 P2 | 3-4 hr | 美術課利器 |
| 30 | 班級廣播 | 🌱 P2 | 1 day | 課堂同步 |
| 52 | 真 SW offline | 🌱 P2 | 3-4 hr | 離線可用 |
| 44 | Playwright E2E | 🌱 P3 | 2 hr | 防 regression |
| 43 | Lighthouse CI | 🌱 P3 | 30 min | 防退化 |
| 45 | 主題切換 dark mode | 💎 隨興 | 1-2 hr | 新鮮感 |
| 51 | Sonner toast | 💎 隨興 | 1 hr | 動畫升級 |
| 49 | Drag-drop 上傳 | 💎 隨興 | 30 min | 體驗微調 |
| 50 | Cmd+V 貼圖 | 💎 隨興 | 30 min | 體驗微調 |
| 54 | iOS / Android App | 🌐 投資 | 1+ 天 | 平台擴張 |
| 55 | LINE Bot | 🌐 投資 | 1 天 | 平台擴張 |
| 56 | Chrome Extension | 🌐 投資 | 1 天 | 平台擴張 |

---

## 🚦 給阿凱老師的 4 種 weekend 套餐

**🎯 套餐 A（教學現場立刻爽，半天）**
#48 → #25 → #27 → #34 → #29
快速分析統計上線 → 課堂模式 → 語音輸入 → 風格切換 → 課綱對齊
✅ 下週上課就能直接用，學生有感

**🎯 套餐 B（個人帳號生態，一個下午）**
#31 → #32 → #33
登入 → 雲端 saved drafts → 公開瀏覽頁
✅ 從「玩具」變「平台」

**🎯 套餐 C（創意 wow factor，一個下午）**
#36 → #34 → #35 → #37
AI 對話迭代 → 風格切換 → 擴寫縮寫 → 多圖串故事
✅ 4 個新 wow，足夠拿出去 demo

**🎯 套餐 D（維運生產等級，半天）**
#39 → #42 → #40 → #41
Sentry → LINE 警報 → Rate limit → App Check
✅ 開放給其他老師用之前的安全閘門

---

## 💡 從這次 12 小時 marathon 學到的（給未來的我）

**架構選型**
1. 路線 A vs B 真的要先勸退 B（如同 skill 提醒）— 但既然做了 B，剩下的擴展都好做
2. **不要太早做真 Service Worker** — version.json polling 是 GitHub Pages 的最佳折衷
3. **bulk endpoint > 個別 endpoint** — 同樣的事 1/3 時間 + 1/6 quota
4. **樂觀 UI 是免費的速度** — 永遠先填預設、AI 來再 swap

**安全 / Secret 管理**
5. **System reminder 也算 leak 通道** — 寫 secret 進 .env.local 會被 file-modified diff 帶到 chat（gcp-api-key-secure-create skill 應該強化此警告）
6. **stdin pipe 是 secret 移動唯一安全方式** — 任何中間 echo 都是風險
7. **每個 API key 一個用途** — 一個出事不會全炸

**前端模式**
8. **stagger > 同步 update** — bulk 結果 6 張卡同時 snap 視覺感很差，120ms cascade 立刻變優雅
9. **skeleton > spinner** — 模擬「AI 在思考」比 loading 圈圈更可信
10. **typewriter 不需要真 streaming** — 拿到全部結果後 setTimeout 假打字 80% 體驗、5% 工時

**Cloud Functions 雷**
11. **第一次部署多個 v2 function 會 race** — 預期 3-4 個會 503，要重試
12. **新 Function 必須 `gcloud run services add-iam-policy-binding ... allUsers run.invoker`** — 否則 403
13. **firebase-admin v12 → v13 才解 google-cloud/firestore peer dep**
14. **CI 嚴格 TS 模式會掃 functions/** — root tsconfig 要 exclude

**Gemini / AI**
15. **gemini-2.0-flash 已 deprecated**（2026-04 消失）— 升 2.5
16. **multimodal `ai.generate({prompt:[{text},{media}]})` 簡單** — 不用學新 API
17. **prompt 要明確說「不要描述圖片，要創作故事」** — 不然 AI 會回「一隻貓在沙發」

**部署 / DevOps**
18. **gcloud beta budgets 幣別必須 match billing account**（aura 是 TWD 不是 USD）
19. **PowerShell .ps1 中文檔沒 BOM 會被 Big5 解析炸** — 別放中文進 ps1，或加 BOM
20. **每次 `npm uninstall` 都要 `rm -rf node_modules package-lock.json` 才乾淨** — Cloud Build 上會踩到

**結論**：這 12 小時的部署 + 4 波優化，從「能跑」走到了「production-grade SaaS」。剩下的功能都是 nice-to-have，可以慢慢加。
