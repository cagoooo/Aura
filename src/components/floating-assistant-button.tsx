import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function FloatingAssistantButton() {
  return (
    <Link
      href="https://document-ai-companion-ipad4.replit.app"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50', // Positioned above the other button
        'flex items-center justify-center', // Flex properties
        'px-4 py-3', // Padding
        'text-sm md:text-base font-semibold text-white', // Responsive font size & style
        'bg-gradient-to-r from-purple-500 via-pink-500 to-blue-400', // Unicorn-themed gradient
        'hover:shadow-xl hover:brightness-110', // Hover effect
        'rounded-full shadow-lg', // Shape and shadow
        'transition-all duration-300 ease-in-out', // Animation
        'transform hover:scale-105', // Hover transform
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400' // Focus state
      )}
      aria-label="創建專屬助手🦄"
    >
      創建專屬助手🦄
    </Link>
  );
}
