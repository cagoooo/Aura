"use client";

import { useEffect, useState } from 'react';
import InspirationGeneratorClient from '@/components/inspiration-generator-client';
import SharedStoryView from '@/components/shared-story-view';

const SHARE_HASH_PREFIX = '#/s/';
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function HomePage() {
  // null = client hasn't checked yet (SSR); '' = no share id; non-empty = share view
  const [sharedId, setSharedId] = useState<string | null>(null);

  useEffect(() => {
    const detect = () => {
      const h = window.location.hash || '';
      if (h.startsWith(SHARE_HASH_PREFIX)) {
        const id = h.slice(SHARE_HASH_PREFIX.length).split(/[?#]/)[0];
        if (/^[a-z0-9]{6,16}$/.test(id)) {
          setSharedId(id);
          return;
        }
      }
      setSharedId('');
    };
    detect();
    window.addEventListener('hashchange', detect);
    return () => window.removeEventListener('hashchange', detect);
  }, []);

  if (sharedId === null) {
    // Avoid flash of main UI on first paint while we read window.location
    return null;
  }

  if (sharedId !== '') {
    return (
      <div className="min-h-[calc(100vh-var(--header-height,4rem))]">
        <SharedStoryView storyId={sharedId} basePath={BASE_PATH} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-var(--header-height,4rem))]">
      <InspirationGeneratorClient />
    </div>
  );
}
