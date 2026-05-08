
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/app-header';
import AppFooter from '@/components/app-footer';
import FloatingAdButton from '@/components/floating-ad-button';
import FloatingAssistantButton from '@/components/floating-assistant-button';
import OnboardingDialog from '@/components/onboarding-dialog';

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
const SITE_TITLE = '5W1H 靈感發射器 🚀';
const SITE_DESCRIPTION = '隨時隨地，點燃你的創意火花！使用 5W1H 靈感發射器，輕鬆產生故事、劇本、文案的絕妙點子。';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: '5W1H 靈感發射器',
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
      alt: '5W1H 靈感發射器 — 點燃你的創意火花',
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
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased flex flex-col flex-grow`}>
        <AppHeader />
        <main className="flex-grow">{children}</main>
        <AppFooter />
        <FloatingAdButton />
        <FloatingAssistantButton />
        <OnboardingDialog />
        <Toaster />
      </body>
    </html>
  );
}
