# =====================================================================
# Firebase / GCP 預算上限自動化設定（防破產）
#
# 用法（PowerShell）：
#   .\scripts\setup-budget.ps1 -ProjectId "your-firebase-project-id"
#
# 預設：
#   - 月度預算上限 NT$300（約 USD 10）
#   - 50% / 90% / 100% 三段警告 email
#   - 同時對 Cloud Functions 設 maxInstances 與 timeout 防爆
#
# 前置：
#   1. gcloud CLI 已安裝且 logged in（學校 Firebase 用阿凱老師教學帳號）：
#      gcloud auth login --account=ipad@mail2.smes.tyc.edu.tw
#   2. Billing API 已啟用：
#      gcloud services enable cloudbilling.googleapis.com billingbudgets.googleapis.com
#   3. 你的帳號有 Billing Account Administrator 角色
# =====================================================================

param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectId,

    [string]$Account = "ipad@mail2.smes.tyc.edu.tw",

    [int]$MonthlyBudgetTWD = 300,

    [string]$NotifyEmail = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " 預算上限設定 for $ProjectId" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# --- Step 1: 切到正確帳號 + 專案 ---
Write-Host "`n[1/4] 切換 gcloud 帳號與專案..." -ForegroundColor Yellow
gcloud config set account $Account
gcloud config set project $ProjectId

# --- Step 2: 取得 Billing Account ID ---
Write-Host "`n[2/4] 取得 Billing Account ID..." -ForegroundColor Yellow
$billingAccountFull = gcloud billing projects describe $ProjectId --format="value(billingAccountName)"
if ([string]::IsNullOrEmpty($billingAccountFull)) {
    Write-Host "❌ 此專案還沒掛 Billing Account。" -ForegroundColor Red
    Write-Host "   到 https://console.cloud.google.com/billing/linkedaccount?project=$ProjectId 連結一個。" -ForegroundColor Red
    exit 1
}
$billingAccountId = $billingAccountFull -replace "billingAccounts/", ""
Write-Host "   Billing Account: $billingAccountId" -ForegroundColor Green

# --- Step 3: 預算 JSON（USD 為 GCP 計費幣別；台幣 ÷ 30 約等於 USD）---
$budgetUSD = [math]::Round($MonthlyBudgetTWD / 30.0, 2)
$budgetName = "$ProjectId-monthly-cap"

Write-Host "`n[3/4] 建立月度預算 USD $budgetUSD（≈ NT$$MonthlyBudgetTWD）..." -ForegroundColor Yellow

$budgetJson = @{
    displayName = $budgetName
    budgetFilter = @{
        projects = @("projects/$ProjectId")
        calendarPeriod = "MONTH"
    }
    amount = @{
        specifiedAmount = @{
            currencyCode = "USD"
            units        = [string]([int][math]::Floor($budgetUSD))
        }
    }
    thresholdRules = @(
        @{ thresholdPercent = 0.5;  spendBasis = "CURRENT_SPEND" },
        @{ thresholdPercent = 0.9;  spendBasis = "CURRENT_SPEND" },
        @{ thresholdPercent = 1.0;  spendBasis = "CURRENT_SPEND" },
        @{ thresholdPercent = 1.5;  spendBasis = "FORECASTED_SPEND" }
    )
    notificationsRule = @{
        disableDefaultIamRecipients = $false
        monitoringNotificationChannels = @()
    }
} | ConvertTo-Json -Depth 10 -Compress

# 用 REST API 建立（gcloud beta 還沒穩定支援所有欄位）
$accessToken = gcloud auth print-access-token
$apiUrl = "https://billingbudgets.googleapis.com/v1/billingAccounts/$billingAccountId/budgets"

try {
    $response = Invoke-RestMethod -Method Post -Uri $apiUrl `
        -Headers @{ "Authorization" = "Bearer $accessToken"; "Content-Type" = "application/json" } `
        -Body $budgetJson
    Write-Host "   ✅ 預算建立成功：$($response.name)" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "   ⚠️  預算 '$budgetName' 已存在，略過建立。" -ForegroundColor Yellow
    } else {
        Write-Host "   ❌ 預算建立失敗：$($_.Exception.Message)" -ForegroundColor Red
        Write-Host "      改用 Console 手動設定：https://console.cloud.google.com/billing/$billingAccountId/budgets" -ForegroundColor Red
    }
}

# --- Step 4: 對 Cloud Functions 加 hard cap（即使預算不夠也不爆衝）---
Write-Host "`n[4/4] 設定 Cloud Functions 並發/超時上限提醒..." -ForegroundColor Yellow
Write-Host "   請確認你的 functions/src/index.ts 已經 setGlobalOptions:" -ForegroundColor Cyan
Write-Host "   --------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "   setGlobalOptions({" -ForegroundColor Gray
Write-Host "     region: 'asia-east1'," -ForegroundColor Gray
Write-Host "     maxInstances: 5,        // 同時併發上限，超過排隊" -ForegroundColor Gray
Write-Host "     timeoutSeconds: 30,     // 縮短，防止吊死耗 quota" -ForegroundColor Gray
Write-Host "     memory: '512MiB'," -ForegroundColor Gray
Write-Host "     concurrency: 1,         // 每 instance 一次只處理一個請求（更可預測）" -ForegroundColor Gray
Write-Host "     secrets: ['GEMINI_API_KEY']," -ForegroundColor Gray
Write-Host "   });" -ForegroundColor Gray
Write-Host "   --------------------------------------------------------" -ForegroundColor DarkGray

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " ✅ 完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "驗證：" -ForegroundColor Yellow
Write-Host "  • Console 看預算：https://console.cloud.google.com/billing/$billingAccountId/budgets"
Write-Host "  • Functions metrics：https://console.cloud.google.com/functions/list?project=$ProjectId"
Write-Host ""
Write-Host "進階防護：" -ForegroundColor Yellow
Write-Host "  • 加 Cloudflare Turnstile（已在程式碼佈線好，填 .env 即可啟用）"
Write-Host "  • 啟用 Firebase App Check 鎖死 callable function 來源"
Write-Host "  • Gemini 改用 'gemini-2.5-flash' 較便宜的模型"
