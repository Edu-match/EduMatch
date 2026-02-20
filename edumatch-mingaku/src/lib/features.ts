/**
 * 機能フラグ
 * false にすることで UI から非表示にできます。実装は削除していません。
 */
export const FEATURES = {
  /** 投稿者（サービス提供者）としての新規登録 */
  PROVIDER_REGISTRATION: false,
  /** 有料プラン・プラン確認ページ */
  PAID_PLANS: false,
  /** 掲載登録ページ */
  LISTING_REGISTRATION: false,
} as const;
