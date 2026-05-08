import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Prefix a public/ asset path with the runtime basePath so it works under
 * GitHub Pages sub-path deployments (e.g. /Aura/sounds/x.mp3).
 */
export function assetPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
}
