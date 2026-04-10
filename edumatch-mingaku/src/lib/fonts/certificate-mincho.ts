import { Shippori_Mincho } from 'next/font/google'

/** 認定証プレビュー用（日本語明朝） */
export const certificateMincho = Shippori_Mincho({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
})
