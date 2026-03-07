import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** サービスサムネイルがないときのプレースホルダーURL。日本語など非ASCIIの場合は「No Image」表示（placehold.coは日本語で????になるため） */
export function serviceThumbnailPlaceholder(serviceName: string, width = 400, height = 300): string {
  const asciiOnly = /^[\x00-\x7F]*$/.test(serviceName)
  const text = asciiOnly ? encodeURIComponent(serviceName.slice(0, 30)) : "No+Image"
  return `https://placehold.co/${width}x${height}/e0f2fe/0369a1?text=${text}`
}
