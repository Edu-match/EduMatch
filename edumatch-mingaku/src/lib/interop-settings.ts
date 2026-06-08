// クライアント・サーバー両用の型と既定値（prisma 等のサーバー専用依存は持たない）。
// 実データ取得は interop-settings.server.ts を参照。

export type InteropThemeMode = "auto" | "dawn" | "day" | "dusk" | "night";

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
  /** フッターのクレジット */
  footerCredit: string;
  /** 背景テーマ（auto＝時刻で自動切替） */
  themeMode: InteropThemeMode;
};

export const DEFAULT_INTEROP_SETTINGS: InteropSettings = {
  title: "教育AIサミット",
  subtitle: "in Interop Tokyo 2026",
  dateVenue: "6/10–12 幕張メッセ",
  registerUrl: "https://www.interop.jp/",
  registerLabel: "来場登録（無料）",
  guideText: "気になるエリアをタップして、セミナー・展示・登壇情報を探そう",
  footerCredit: "青楓館高等学院 / みんがく / AI検定協会 / AI部 © 2026",
  themeMode: "auto",
};
