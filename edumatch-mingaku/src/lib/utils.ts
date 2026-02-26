import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** サービスサムネイルがないときのプレースホルダーURL（サービス名をテキストで表示） */
export function serviceThumbnailPlaceholder(serviceName: string, width = 400, height = 300): string {
  const text = encodeURIComponent(serviceName.slice(0, 30))
  return `https://placehold.co/${width}x${height}/e0f2fe/0369a1?text=${text}`
}
