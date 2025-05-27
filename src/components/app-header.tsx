import { Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function AppHeader() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center">
        <Link
          href="/"
          className="group flex items-center gap-2 text-primary transition-colors duration-300 ease-in-out"
        >
          <Lightbulb className="h-7 w-7 sm:h-8 md:h-9 text-primary group-hover:text-accent group-hover:rotate-[15deg] group-hover:scale-125 transition-all duration-300 ease-in-out" />
          <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight group-hover:text-accent">
            靈感發射器
          </span>
        </Link>
      </div>
    </header>
  );
}
