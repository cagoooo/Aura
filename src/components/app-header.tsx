"use client";

import { Lightbulb, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'aura.onboarding.v1.dismissed';

export default function AppHeader() {
  const showHelp = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    window.location.reload();
  };

  return (
    <header className="bg-card border border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-center relative">
        <Link
          href="/"
          className="group flex items-center gap-2 text-primary transition-colors duration-300 ease-in-out"
        >
          <Lightbulb className="h-7 w-7 sm:h-8 md:h-9 text-primary group-hover:text-accent group-hover:rotate-[15deg] group-hover:scale-125 transition-all duration-300 ease-in-out" />
          <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight group-hover:text-accent">
            5W1H 靈感發射器 🚀
          </span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={showHelp}
          aria-label="顯示使用說明"
          className="absolute right-2 sm:right-4 text-muted-foreground hover:text-primary"
        >
          <HelpCircle className="h-5 w-5 sm:mr-1" />
          <span className="hidden sm:inline">使用說明</span>
        </Button>
      </div>
    </header>
  );
}
