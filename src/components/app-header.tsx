import { Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function AppHeader() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
          <Lightbulb className="h-7 w-7" />
          <span>靈感發射器</span>
        </Link>
      </div>
    </header>
  );
}
