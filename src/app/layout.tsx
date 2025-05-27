
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import AppHeader from '@/components/app-header';
import AppFooter from '@/components/app-footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '5W1H 靈感發射器 🚀',
  description: '隨時隨地，點燃你的創意火花！使用5W1H靈感發射器，輕鬆產生故事、劇本、文案的絕妙點子。🚀',
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
        <Toaster />
      </body>
    </html>
  );
}
