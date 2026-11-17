
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/app-header';
import AppFooter from '@/components/app-footer';
import FloatingAdButton from '@/components/floating-ad-button';
import FloatingAssistantButton from '@/components/floating-assistant-button';
import OnboardingDialog from '@/components/onboarding-dialog';
import VersionWatcher from '@/components/version-watcher';
import { AuthProvider } from '@/components/auth-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Absolute URL for OG / Twitter — social bots don't resolve relative paths.
const SITE_URL = 'https://cagoooo.github.io/Aura';
// Next.js metadata API does NOT auto-prefix icon/manifest URLs with basePath,
// so we hardcode it here. Matches NEXT_PUBLIC_BASE_PATH in next.config.ts.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
// NEXT_PUBLIC_BUILD_ID is injected by GitHub Actions so each deploy gets a
// fresh og:image URL, forcing FB / LINE / Twitter to re-crawl.
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
const OG_IMAGE_URL = `${SITE_URL}/og-preview.png?v=${BUILD_ID}`;
const SITE_TITLE = '5W1H 靈感發射器 Pro 🚀';
const SITE_DESCRIPTION = '✨ Pro 升級體驗版上線！全新 AI 看圖編故事、雲端跨裝置同步、永久分享連結 — 隨時隨地點燃你的創意火花，輕鬆產生故事、劇本、文案的絕妙點子。';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: '5W1H 靈感發射器 Pro',
  authors: [{ name: '桃園市石門國小資訊組 阿凱老師' }],
  keywords: ['5W1H', '靈感', '創意', '故事', 'AI', '繁體中文', '台灣', '教學'],
  manifest: `${BASE_PATH}/site.webmanifest`,
  icons: {
    icon: [
      { url: `${BASE_PATH}/icon.svg`, type: 'image/svg+xml' },
      { url: `${BASE_PATH}/icon-32.png`, type: 'image/png', sizes: '32x32' },
      { url: `${BASE_PATH}/icon-192.png`, type: 'image/png', sizes: '192x192' },
      { url: `${BASE_PATH}/icon-512.png`, type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: `${BASE_PATH}/apple-touch-icon.png`, sizes: '180x180' }],
    shortcut: `${BASE_PATH}/icon-32.png`,
  },
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: SITE_URL + '/',
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{
      url: OG_IMAGE_URL,
      secureUrl: OG_IMAGE_URL,
      width: 1200,
      height: 630,
      alt: '5W1H 靈感發射器 Pro — 點燃你的創意火花',
      type: 'image/png',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_URL],
  },
  themeColor: '#4285F4',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="flex flex-col min-h-screen">
      <head>
        {/* 🛡️ App 內建瀏覽器防護：Google OAuth 禁止在 WebView 登入（403 disallowed_useragent）
            LINE → 自動帶 openExternalBrowser=1 跳系統預設瀏覽器
            FB/IG/Messenger/微信/Kakao → Android 自動用 intent:// 叫出 Chrome 開本頁（只試一次），並顯示引導與「用 Chrome 開啟」按鈕；iPhone 只能顯示引導 */}
        <script
          dangerouslySetInnerHTML={{
            __html: String.raw`
                (function () {
                    var ua = navigator.userAgent || "";
                    var isLine = /\bLine\//i.test(ua);
                    var isOtherInApp = /FBAN|FBAV|FB_IAB|Instagram|Messenger|MicroMessenger|KAKAOTALK/i.test(ua);
                    var isAndroid = /Android/i.test(ua);

                    if (isLine && location.search.indexOf("openExternalBrowser=1") === -1) {
                        // LINE 官方參數：自動改用外部瀏覽器重開本頁（保留原有 query 與 hash）
                        var sep = location.search ? "&" : "?";
                        location.replace(location.href.split("#")[0] + sep + "openExternalBrowser=1" + location.hash);
                        return;
                    }
                    if (!isOtherInApp && !isLine) return;

                    // Android：用 intent:// 指定 Chrome 開啟本頁（保留 query 與 hash）。
                    // 沒裝 Chrome 時改回內建瀏覽器開「帶 iabEscape=1 的本頁」，不再重試，避免無限跳轉。
                    var chromeIntent = "";
                    if (isAndroid) {
                        var fallback = location.href.split("#")[0]
                            + (location.search ? "&" : "?") + "iabEscape=1" + location.hash;
                        chromeIntent = "intent://" + location.host + location.pathname + location.search + location.hash
                            + "#Intent;scheme=" + location.protocol.replace(":", "")
                            + ";package=com.android.chrome"
                            + ";S.browser_fallback_url=" + encodeURIComponent(fallback) + ";end";
                    }
                    var autoJump = false;
                    if (chromeIntent) {
                        autoJump = location.search.indexOf("iabEscape=1") === -1;
                        try { autoJump = autoJump && sessionStorage.getItem("iabEscapeTried") !== "1"; } catch (e) { }
                    }

                    // 自動跳轉沒生效（舊版 App、沒裝 Chrome、iPhone）→ 顯示全版引導，避免使用者白撞 Google 封鎖
                    document.addEventListener("DOMContentLoaded", function () {
                        var d = document.createElement("div");
                        d.id = "inapp-browser-guide";
                        d.style.cssText = "position:fixed;inset:0;z-index:99999;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,'Microsoft JhengHei',sans-serif;";
                        var chromeBtn = chromeIntent
                            ? '<a id="inapp-open-chrome" href="' + chromeIntent.replace(/"/g, "&quot;") + '" style="display:block;margin:22px 0 4px;padding:14px 18px;border-radius:999px;background:#22c55e;color:#052e16;font-size:17px;font-weight:800;text-decoration:none;">用 Chrome 開啟</a>'
                                + '<p style="font-size:13px;color:#94a3b8;margin:8px 0 18px;">按了沒反應，再照下面的方法</p>'
                            : "";
                        d.innerHTML = '<div style="max-width:420px;width:100%;box-sizing:border-box;text-align:center;background:#1e293b;border-radius:16px;padding:32px 26px;">'
                            + '<div style="font-size:52px;">🌐</div>'
                            + '<h4 style="font-weight:800;margin:14px 0 10px;">請改用瀏覽器開啟</h4>'
                            + '<p style="font-size:15px;line-height:1.8;color:#cbd5e1;margin:0;">您目前在 <b style="color:#fbbf24;">App 內建瀏覽器</b>（LINE／FB 等）中開啟本頁，Google 基於安全政策<b>禁止在此環境登入</b>。</p>'
                            + chromeBtn
                            + '<p style="font-size:15px;line-height:1.8;color:#cbd5e1;margin:' + (chromeIntent ? "0" : "14px 0 0") + ';">請點右上／右下角「<b>⋯</b>」→ 選「<b style="color:#4ade80;">用預設瀏覽器開啟</b>」。<br><br>💡 也可以把本站「加入主畫面」，之後從桌面圖示開啟最穩定。</p>'
                            + '<button type="button" id="inapp-guide-dismiss" onclick="this.parentNode.parentNode.remove()" style="margin-top:18px;background:transparent;border:1px solid #475569;color:#cbd5e1;border-radius:999px;padding:10px 18px;font-size:14px;">先不登入，繼續瀏覽</button>'
                            + '</div>';
                        document.body.appendChild(d);
                        // 先把引導畫出來再自動叫 Chrome：就算跳轉被 App 擋下，畫面也不會停在空白
                        if (autoJump) {
                            try { sessionStorage.setItem("iabEscapeTried", "1"); } catch (e) { }
                            setTimeout(function () { location.href = chromeIntent; }, 300);
                        }
                    });
                })();
        `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex flex-col flex-grow`}>
        <AuthProvider>
          <AppHeader />
          <main className="flex-grow">{children}</main>
          <AppFooter />
          <FloatingAdButton />
          <FloatingAssistantButton />
          <OnboardingDialog />
          <VersionWatcher />
          <Toaster />
        {/*
          Cloudflare Web Analytics — privacy-respecting, no cookies, free.
          Set NEXT_PUBLIC_CF_ANALYTICS_TOKEN as a GitHub Secret to enable.
          (Get the token from CF dashboard → Web Analytics → Add a site.)
          Empty token means analytics is disabled — site still works.
        */}
        {process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN}"}`}
          />
        )}
        </AuthProvider>
      </body>
    </html>
  );
}
