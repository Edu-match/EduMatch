// クライアント・サーバー両用の型と定数（prisma 等のサーバー専用依存は持たない）。
// 実データ取得は interop-content.server.ts を参照。

/** 本体エデュマッチから引っ張るコンテンツ種別（fetchContentCandidates の contentKind と対応） */
export type InteropContentKind = "article" | "service" | "media" | "events-info";

export const INTEROP_CONTENT_KINDS: { value: InteropContentKind; label: string }[] = [
  { value: "article", label: "記事" },
  { value: "service", label: "サービス" },
  { value: "media", label: "動画" },
  { value: "events-info", label: "イベント" },
];

/** sourceType（DB由来）→ 表示ラベル */
export const SOURCE_TYPE_LABEL: Record<string, string> = {
  post: "記事",
  service: "サービス",
  video: "動画",
  seminar_event: "イベント",
  custom: "おすすめ",
};

/** 自作（アップロード）コンテンツで選べるラベル → sourceType */
export const CUSTOM_LABEL_OPTIONS: { label: string; sourceType: string }[] = [
  { label: "おすすめ", sourceType: "custom" },
  { label: "記事", sourceType: "post" },
  { label: "動画", sourceType: "video" },
  { label: "サービス", sourceType: "service" },
  { label: "イベント", sourceType: "seminar_event" },
];

export type InteropContentItem = {
  /** ピンならpin id、自動なら source_type:source_id の合成キー */
  id: string;
  sourceType: string;
  sourceId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  href: string;
  meta?: string;
  kindLabel: string;
  /** 手動ピン（最上位固定）か */
  pinned: boolean;
};
