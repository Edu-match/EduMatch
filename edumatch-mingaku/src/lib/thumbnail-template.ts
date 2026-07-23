/**
 * 記事サムネイル用テンプレート（国内=青 / 海外=黄 / 募集=赤系 / その他=緑）
 * 画像は public/thumbnail-templates に配置するか、NEXT_PUBLIC_ARTICLE_THUMBNAIL_TEMPLATE_BASE で Supabase 等のベースURLを指定。
 */
export const THUMBNAIL_TEMPLATE_KINDS = [
  "domestic",
  "overseas",
  "recruitment",
  "other",
] as const;

export type ThumbnailTemplateKind = (typeof THUMBNAIL_TEMPLATE_KINDS)[number];

export const THUMBNAIL_TEMPLATE_LABELS: Record<ThumbnailTemplateKind, string> = {
  domestic: "国内記事（青）",
  overseas: "海外記事（黄）",
  recruitment: "募集（赤）",
  other: "その他（緑）",
};

const TEMPLATE_FILES: Record<ThumbnailTemplateKind, string> = {
  domestic: "domestic.png",
  overseas: "overseas.png",
  recruitment: "recruitment.png",
  other: "other.png",
};

export function getThumbnailTemplateImageUrl(kind: ThumbnailTemplateKind): string {
  const base =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_ARTICLE_THUMBNAIL_TEMPLATE_BASE
      ? process.env.NEXT_PUBLIC_ARTICLE_THUMBNAIL_TEMPLATE_BASE.replace(/\/$/, "")
      : "";
  const file = TEMPLATE_FILES[kind];
  if (base) {
    return `${base}/${file}`;
  }
  return `/thumbnail-templates/${file}`;
}

export function parseThumbnailKind(v: unknown): ThumbnailTemplateKind {
  if (typeof v === "string" && THUMBNAIL_TEMPLATE_KINDS.includes(v as ThumbnailTemplateKind)) {
    return v as ThumbnailTemplateKind;
  }
  return "other";
}
