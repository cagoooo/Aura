import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function FloatingAdButton() {
  return (
    <Link
      href="https://line.me/R/ti/p/@733oiboa?oat_content=url&ts=05120012"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50', // Position with mobile adjustment
        'flex items-center justify-center', // Flex properties
        'px-4 py-3', // Padding
        'text-sm md:text-base font-semibold text-white', // Responsive font size & style
        'bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-400', // Vibrant gradient
        'hover:shadow-xl hover:brightness-110', // Hover effect
        'rounded-full shadow-lg', // Shape and shadow
        'transition-all duration-300 ease-in-out', // Animation
        'transform hover:scale-105', // Hover transform
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-400' // Focus state
      )}
      aria-label="點『石』成金🐝(評語優化)"
    >
      點『石』成金🐝(評語優化)
    </Link>
  );
}
