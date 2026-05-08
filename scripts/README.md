# Scripts — 維運自動化腳本

## `setup-budget.ps1` — Cloud Functions 預算上限（防破產）

> ⚠️ **執行時機**：等 `MIGRATION.md` 執行完、Firebase Cloud Functions 已部署後再跑。目前還是 Server Actions 架構，跑了預算只會建在還沒掛 Functions 的 GCP 專案上（其實也不錯，先建好沒壞處）。

### 用法

```powershell
# 1. 確保 gcloud 已登入學校教學帳號
gcloud auth login --account=ipad@mail2.smes.tyc.edu.tw

# 2. 啟用 Billing API（首次）
gcloud services enable cloudbilling.googleapis.com billingbudgets.googleapis.com

# 3. 跑腳本（替換成你的 Firebase 專案 ID）
.\scripts\setup-budget.ps1 -ProjectId "your-firebase-project-id"

# 自訂預算金額（預設 NT$300/月）
.\scripts\setup-budget.ps1 -ProjectId "your-firebase-project-id" -MonthlyBudgetTWD 100
```

### 腳本會做什麼

1. 自動切換到指定的 GCP 帳號 + 專案
2. 抓出該專案掛的 Billing Account ID
3. 透過 [Cloud Billing Budgets API](https://cloud.google.com/billing/docs/how-to/budgets) 建立月度預算：
   - 上限：NT$300（可改）
   - 警告閾值：50% / 90% / 100% 當前消耗 + 150% 預測消耗
   - 通知方式：email 給該 Billing Account 所有管理員
4. 提醒你在 `functions/src/index.ts` 設定 `setGlobalOptions` 的 hard cap

### 為什麼預算還要搭配 Functions hard cap？

| 機制 | 防什麼 |
| --- | --- |
| **Billing Budget** | 帳單超標 → email 通知（**不會自動停服務**，只通知） |
| **`maxInstances: 5`** | 同時併發超過 5 → 排隊不擴容 |
| **`timeoutSeconds: 30`** | 單一請求超過 30 秒 → 強制中斷 |
| **`concurrency: 1`** | 每個 instance 一次只處理一個請求（更可預測） |

要真正「自動停服務」必須訂閱 Billing Pub/Sub topic 寫個 Cloud Function 自動 disable billing，這個工太大不在這個腳本範圍。

### 看不到 Billing Account？

代表這個 Firebase 專案還在「Spark」免費方案。要設預算必須先升級到「Blaze」（按用量付費）：
- 到 [Firebase Console](https://console.firebase.google.com/) → 專案 → 用量和帳單 → 修改方案 → Blaze
- Blaze 仍有免費層額度（Functions 每月 2M 次免費），不會立刻收錢
- 升 Blaze 後**先**設預算上限，再部署正式版 Functions
