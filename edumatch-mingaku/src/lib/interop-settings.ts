// クライアント・サーバー両用の型と既定値（prisma 等のサーバー専用依存は持たない）。
// 実データ取得は interop-settings.server.ts を参照。

export type InteropThemeMode = "auto" | "dawn" | "day" | "dusk" | "night";

/** 中心ハブをタップしたときに出る項目。リンク先遷移(link) か 投稿ページ(board) を選べる。 */
export type CenterHubItem = {
  id: string;
  name: string;
  kind: "link" | "board";
  /** kind=link のとき：外部/内部URL */
  url?: string;
  /** kind=board のとき：interopサブカテゴリID（その掲示板へ遷移） */
  subId?: string;
};

/**
 * 外部リンクを安全に正規化する。
 * - 空なら fallback
 * - http(s):// や mailto: はそのまま
 * - スキームが無い（例: "edu-match.com/..."）は https:// を補う
 *   （特設サブドメインで相対リンク化して壊れるのを防ぐ）
 */
export function ensureExternalUrl(url: string | undefined, fallback = ""): string {
  const raw = (url ?? "").trim();
  if (!raw) return fallback;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(raw)) return raw;
  return `https://${raw.replace(/^\/+/, "")}`;
}

export type InteropSettings = {
  /** ヘッダー大見出し */
  title: string;
  /** ヘッダー小見出し */
  subtitle: string;
  /** 開催情報（日程・会場） */
  dateVenue: string;
  /** 来場登録ボタンのリンク */
  registerUrl: string;
  /** 来場登録ボタンの文言 */
  registerLabel: string;
  /** マップ上部のガイド文 */
  guideText: string;
  /** 中心ハブ（中央の玉）の表示名。空なら中心カテゴリ名にフォールバック。 */
  centerLabel: string;
  /** 中心ハブをタップしたときに出る項目。空なら既定（インフォメーション/AIチャンピオンシップ/ご意見）。 */
  centerHubItems: CenterHubItem[];
  /** フッターのクレジット */
  footerCredit: string;
  /** 背景テーマ（auto＝時刻で自動切替） */
  themeMode: InteropThemeMode;

  /* ───── トップマップのサテライト表示（特設由来の3面） ───── */
  /** 最新ニュース（左上） */
  showLatestNews: boolean;
  /** 登壇者への質問（右上） */
  showSpeakerQa: boolean;
  /** ご意見BOX（下） */
  showOpinionBox: boolean;

  /* ───── AI自動返信（管理者ペルソナ） ───── */
  /** 管理者ペルソナによる自動返信エンジンの全体マスタースイッチ。
   *  OFF の間は、各管理者が自分のペルソナを有効化していても自動返信は一切行われない。 */
  personaAutoReplyEnabled: boolean;

  /* ───── ジオフェンス（会場を出たときの演出） ───── */
  /** 会場退出演出を有効にするか */
  geofenceEnabled: boolean;
  /** 会場の中心緯度 */
  venueLat: number;
  /** 会場の中心経度 */
  venueLng: number;
  /** 会場とみなす半径（メートル）。これを超えたら「退出」 */
  venueRadiusM: number;
  /** 退出モーダルの見出し */
  exitTitle: string;
  /** 退出モーダルの本文 */
  exitMessage: string;
  /** 退出CTAの文言 */
  exitCtaLabel: string;
  /** 退出CTAのリンク（エデュマッチ登録など） */
  exitCtaUrl: string;
};

export const DEFAULT_INTEROP_SETTINGS: InteropSettings = {
  title: "教育AIサミット",
  subtitle: "in Interop Tokyo 2026",
  dateVenue: "6/10–12 幕張メッセ",
  registerUrl: "https://www.interop.jp/",
  registerLabel: "来場登録（無料）",
  guideText: "気になるエリアをタップして、セミナー・展示・登壇情報を探そう",
  centerLabel: "教育AIサミット2026＠衆議院第一議員会館",
  centerHubItems: [],
  footerCredit: "青楓館高等学院 / みんがく / AI検定協会 / AI部 © 2026",
  themeMode: "auto",

  showLatestNews: true,
  showSpeakerQa: true,
  showOpinionBox: true,

  // 既定OFF（安全側）。明示的にONにしたときだけ自動返信エンジンが動く。
  personaAutoReplyEnabled: false,

  geofenceEnabled: true,
  venueLat: 35.6485, // 幕張メッセ
  venueLng: 140.0347,
  venueRadiusM: 800,
  exitTitle: "また会いましょう。",
  exitMessage:
    "教育AIサミットの世界は、ここでいったんお別れ。\nでも学びの冒険はまだ続きます。エデュマッチに登録すると、全国の教育コンテンツや、サミットの続きの体験がいつでもあなたのそばに。",
  exitCtaLabel: "エデュマッチに無料登録",
  exitCtaUrl: "https://edu-match.com/auth/login",
};
