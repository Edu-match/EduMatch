/**
 * 記事サムネイル用スタイル定義（5スタイル）
 *
 * 背景は Canvas でプログラム描画するため画像ファイルは不要。
 * 旧カテゴリ型テンプレ（domestic/overseas/recruitment/other）は
 * 後方互換のため受け付け、対応するスタイルにマップする。
 */

/** 新しい5つのサムネイルスタイル */
export const THUMBNAIL_STYLE_KINDS = [
  "gradient",
  "illustration",
  "tech",
  "professional",
  "creative",
] as const;

export type ThumbnailStyleKind = (typeof THUMBNAIL_STYLE_KINDS)[number];

/** 旧カテゴリ型テンプレ（後方互換用） */
export const LEGACY_THUMBNAIL_KINDS = [
  "domestic",
  "overseas",
  "recruitment",
  "other",
] as const;

export type LegacyThumbnailKind = (typeof LEGACY_THUMBNAIL_KINDS)[number];

/** サムネイル生成に渡せる種別（新スタイル＋旧カテゴリ） */
export type ThumbnailTemplateKind = ThumbnailStyleKind | LegacyThumbnailKind;

/** UI に表示するスタイル一覧（旧カテゴリは表示しない） */
export const THUMBNAIL_TEMPLATE_KINDS = THUMBNAIL_STYLE_KINDS;

/** 旧カテゴリ → 新スタイルのマッピング */
export const LEGACY_KIND_TO_STYLE: Record<LegacyThumbnailKind, ThumbnailStyleKind> = {
  domestic: "professional",
  overseas: "gradient",
  recruitment: "creative",
  other: "illustration",
};

export function isLegacyThumbnailKind(v: string): v is LegacyThumbnailKind {
  return (LEGACY_THUMBNAIL_KINDS as readonly string[]).includes(v);
}

export function isThumbnailStyleKind(v: string): v is ThumbnailStyleKind {
  return (THUMBNAIL_STYLE_KINDS as readonly string[]).includes(v);
}

/** 旧カテゴリを含む任意の kind を新スタイルに解決する */
export function resolveThumbnailStyle(kind: ThumbnailTemplateKind): ThumbnailStyleKind {
  if (isThumbnailStyleKind(kind)) return kind;
  return LEGACY_KIND_TO_STYLE[kind];
}

export interface ThumbnailStyleMeta {
  label: string;
  description: string;
  previewBackground: string;
  previewTextColor: string;
  emoji: string;
}

export const THUMBNAIL_STYLE_META: Record<ThumbnailStyleKind, ThumbnailStyleMeta> = {
  gradient: {
    label: "グラデーション",
    description: "やわらかいパステルの色合い",
    previewBackground: "linear-gradient(135deg, #fbc2d4 0%, #d8c6f0 55%, #b8c8f2 100%)",
    previewTextColor: "#41365a",
    emoji: "🌈",
  },
  illustration: {
    label: "イラスト",
    description: "ゆるくて温かい手描き風",
    previewBackground:
      "radial-gradient(circle at 20% 25%, #cdeedd 0%, #cdeedd 22%, transparent 23%), radial-gradient(circle at 82% 75%, #ffd9c0 0%, #ffd9c0 26%, transparent 27%), #fff6e9",
    previewTextColor: "#5b4636",
    emoji: "🎨",
  },
  tech: {
    label: "テック",
    description: "ダーク×グリッドのツール紹介向け",
    previewBackground:
      "linear-gradient(rgba(78,168,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(78,168,255,0.14) 1px, transparent 1px), #0b1220",
    previewTextColor: "#e8f2ff",
    emoji: "💻",
  },
  professional: {
    label: "プロフェッショナル",
    description: "白基調×アクセントバーの信頼感",
    previewBackground:
      "linear-gradient(90deg, #1d5bd8 0%, #1d5bd8 7%, #f6f8fb 7%, #f6f8fb 100%)",
    previewTextColor: "#1f2937",
    emoji: "💼",
  },
  creative: {
    label: "クリエイティブ",
    description: "絵の具のスプラッシュで元気に",
    previewBackground:
      "radial-gradient(circle at 12% 18%, #ff5a7a 0%, #ff5a7a 12%, transparent 13%), radial-gradient(circle at 88% 20%, #ffc233 0%, #ffc233 10%, transparent 11%), radial-gradient(circle at 85% 82%, #00b8a9 0%, #00b8a9 13%, transparent 14%), radial-gradient(circle at 15% 80%, #7c4dff 0%, #7c4dff 9%, transparent 10%), #ffffff",
    previewTextColor: "#24252d",
    emoji: "✨",
  },
};

/** 旧 API 互換：ラベル参照（旧カテゴリを含むすべての kind に対応） */
export const THUMBNAIL_TEMPLATE_LABELS: Record<ThumbnailTemplateKind, string> = {
  gradient: THUMBNAIL_STYLE_META.gradient.label,
  illustration: THUMBNAIL_STYLE_META.illustration.label,
  tech: THUMBNAIL_STYLE_META.tech.label,
  professional: THUMBNAIL_STYLE_META.professional.label,
  creative: THUMBNAIL_STYLE_META.creative.label,
  domestic: "国内記事（旧）",
  overseas: "海外記事（旧）",
  recruitment: "募集（旧）",
  other: "その他（旧）",
};

const LEGACY_TEMPLATE_FILES: Record<LegacyThumbnailKind, string> = {
  domestic: "domestic.png",
  overseas: "overseas.png",
  recruitment: "recruitment.png",
  other: "other.png",
};

/**
 * 旧カテゴリ型テンプレの PNG URL（後方互換用）。
 * 新スタイルは Canvas 描画のため URL を持たない（null を返す）。
 */
export function getThumbnailTemplateImageUrl(kind: ThumbnailTemplateKind): string | null {
  if (!isLegacyThumbnailKind(kind)) return null;
  const base =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_ARTICLE_THUMBNAIL_TEMPLATE_BASE
      ? process.env.NEXT_PUBLIC_ARTICLE_THUMBNAIL_TEMPLATE_BASE.replace(/\/$/, "")
      : "";
  const file = LEGACY_TEMPLATE_FILES[kind];
  if (base) {
    return `${base}/${file}`;
  }
  return `/thumbnail-templates/${file}`;
}

/**
 * 未知の値を安全に kind へ変換する。
 * 新スタイル・旧カテゴリの両方を受け付け、不明な値は "gradient" にフォールバック。
 */
export function parseThumbnailKind(v: unknown): ThumbnailTemplateKind {
  if (typeof v === "string") {
    if (isThumbnailStyleKind(v)) return v;
    if (isLegacyThumbnailKind(v)) return v;
  }
  return "gradient";
}
