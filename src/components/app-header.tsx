"use client";

import { Lightbulb, HelpCircle, Globe } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAppSettings } from '@/hooks/use-app-settings';
import SettingsPopover from '@/components/settings-popover';
import AuthMenu from '@/components/auth-menu';
import { useEffect } from 'react';

const ONBOARDING_STORAGE_KEY = 'aura.onboarding.v1.dismissed';

export default function AppHeader() {
  const { settings, update, hydrated } = useAppSettings();

  // F11 already triggers browser fullscreen — we intercept Esc to also exit
  // liveMode if active, so user has a quick "back to normal" button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && settings.liveMode) {
        update('liveMode', false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings.liveMode, update]);

  const showHelp = () => {
    try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch { /* ignore */ }
    window.location.reload();
  };

  return (
    <header className="bg-card border border-border sticky top-0 z-50 no-print live-hidden">
      <div className="container mx-auto px-4 py-3 flex items-center justify-center relative">
        <Link
          href="/"
          className="group flex items-center gap-2 text-primary transition-colors duration-300 ease-in-out"
        >
          <Lightbulb className="h-7 w-7 sm:h-8 md:h-9 text-primary group-hover:text-accent group-hover:rotate-[15deg] group-hover:scale-125 transition-all duration-300 ease-in-out" />
          <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight group-hover:text-accent flex items-center gap-1.5 sm:gap-2">
            5W1H 靈感發射器
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-black tracking-wider
                         bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-white
                         shadow-[0_2px_8px_-2px_rgba(245,158,11,0.5)]
                         border border-amber-300/40"
              aria-label="Pro 版"
            >
              PRO
            </span>
            🚀
          </span>
        </Link>
        <div className="absolute right-2 sm:right-4 flex items-center gap-1">
          {/* Hash-route link. Next.js Link auto-prepends basePath; passing
              the path WITHOUT /Aura avoids the double-prefix bug. */}
          <Link
            href="/#/discover"
            aria-label="瀏覽公開故事 Hall of Fame"
            className="inline-flex items-center justify-center h-9 w-9 sm:w-auto sm:px-3 rounded-md hover:bg-accent/30 text-muted-foreground hover:text-primary transition-colors"
          >
            <Globe className="h-5 w-5 sm:mr-1" />
            <span className="hidden sm:inline text-sm font-medium">瀏覽</span>
          </Link>
          {hydrated && (
            <SettingsPopover
              style={settings.style}
              gradeLevel={settings.gradeLevel}
              liveMode={settings.liveMode}
              onChangeStyle={(v) => update('style', v)}
              onChangeGrade={(v) => update('gradeLevel', v)}
              onToggleLiveMode={(v) => update('liveMode', v)}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={showHelp}
            aria-label="顯示使用說明"
            className="text-muted-foreground hover:text-primary"
          >
            <HelpCircle className="h-5 w-5 sm:mr-1" />
            <span className="hidden sm:inline">使用說明</span>
          </Button>
          <AuthMenu onOpenLibrary={() => window.dispatchEvent(new CustomEvent('aura:open-library'))} />
        </div>
      </div>
    </header>
  );
}
