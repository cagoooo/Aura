
import Link from 'next/link';

export default function AppFooter() {
  return (
    <footer className="bg-slate-100 dark:bg-zinc-900 border-t border-slate-300 dark:border-zinc-700 py-5 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <div className="flex items-center justify-center space-x-2 text-sm">
          <span className="text-primary font-bold text-base">© 2025</span>
          <Link
            href="https://www.smes.tyc.edu.tw/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:text-primary font-semibold text-base hover:underline transition-all duration-300 ease-in-out transform hover:scale-105"
          >
            桃園市石門國小資訊組 阿凱老師 設計
          </Link>
        </div>
      </div>
    </footer>
  );
}
