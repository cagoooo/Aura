"use client";

import { useEffect, useState } from 'react';
import InspirationGeneratorClient from '@/components/inspiration-generator-client';
import SharedStoryView from '@/components/shared-story-view';
import DiscoverView from '@/components/discover-view';

const SHARE_HASH_PREFIX = '#/s/';
const DISCOVER_HASH = '#/discover';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

type Route = { kind: 'main' } | { kind: 'shared'; id: string } | { kind: 'discover' };

export default function HomePage() {
  // null = SSR / first paint, undecided
  const [route, setRoute] = useState<Route | null>(null);

  useEffect(() => {
    const detect = () => {
      const h = window.location.hash || '';
      if (h === DISCOVER_HASH || h.startsWith(`${DISCOVER_HASH}/`) || h.startsWith(`${DISCOVER_HASH}?`)) {
        setRoute({ kind: 'discover' });
        return;
      }
      if (h.startsWith(SHARE_HASH_PREFIX)) {
        const id = h.slice(SHARE_HASH_PREFIX.length).split(/[?#]/)[0];
        if (/^[a-z0-9]{6,16}$/.test(id)) {
          setRoute({ kind: 'shared', id });
          return;
        }
      }
      setRoute({ kind: 'main' });
    };
    detect();
    window.addEventListener('hashchange', detect);
    return () => window.removeEventListener('hashchange', detect);
  }, []);

  if (route === null) return null;  // avoid flash of wrong screen

  return (
    <div className="min-h-[calc(100vh-var(--header-height,4rem))]">
      {route.kind === 'main' && <InspirationGeneratorClient />}
      {route.kind === 'shared' && <SharedStoryView storyId={route.id} basePath={BASE_PATH} />}
      {route.kind === 'discover' && <DiscoverView basePath={BASE_PATH} />}
    </div>
  );
}
