
import Link from 'next/link';
import { Copyright } from 'lucide-react';

export default function AppFooter() {
  return (
    <footer className="bg-card border-t border-border text-muted-foreground mt-auto">
      <div className="container mx-auto px-4 py-4 text-center"> {/* Reduced py-6 to py-4 for a more compact footer */}
        <div className="flex items-center justify-center space-x-2 text-sm">
          <Copyright className="h-4 w-4" />
          <span>© 2025</span>
          <Link
            href="https://www.smes.tyc.edu.tw/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary hover:underline transition-colors duration-300 ease-in-out"
          >
            桃園市石門國小資訊組 阿凱老師 設計
          </Link>
        </div>
      </div>
    </footer>
  );
}
