import OpenAI from "openai";
import {
  moderateCommunityText,
  type CommunityModerationKind,
  type CommunityModerationOutcome,
} from "@/lib/community-moderation";
import {
  sendSlackCommunityAlert,
  type SlackCommunityAlertPayload,
} from "@/lib/slack-community-alert";

const KIND_LABEL: Record<CommunityModerationKind, string> = {
  comment: "コメント",
  room: "ルーム",
  topic: "話題・テーマ",
};

export type ModerateAndNotifyArgs = {
  text: string;
  kind: CommunityModerationKind;
  featureLabel: string;
  userId: string;
  userName: string;
  /** Slack 通知に含めるリンク（任意） */
  contextUrl?: string;
};

export type ModerateAndNotifyResult = CommunityModerationOutcome & {
  /** OpenAI APIキー未設定など、サーバー設定不備の場合は true（呼び出し側で 503 を返す） */
  skipped?: boolean;
};

/**
 * 投稿/コメントを審査し、必要に応じて Slack へ通知する。
 *
 * 設計方針:
 * - OPENAI_API_KEY が未設定 → skipped:true を返し、呼び出し側で 503 を選択可能にする
 * - 判定エラー → allowed:false で返し、UI 側はエラー表示
 * - allowed/slackAlert は moderateCommunityText の結果に従う
 */
export async function moderateAndNotify(
  args: ModerateAndNotifyArgs
): Promise<ModerateAndNotifyResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      allowed: false,
      slackAlert: false,
      slackSummaryJa: "OPENAI_API_KEY 未設定",
      source: "error",
      toneFlag: "ok",
      toneReason: "",
      skipped: true,
    };
  }

  const openai = new OpenAI({ apiKey });
  const outcome = await moderateCommunityText(openai, args.text, args.kind);

  const webhook = process.env.SLACK_COMMUNITY_ALERT_WEBHOOK_URL?.trim();
  if (webhook && outcome.slackAlert) {
    const payload: SlackCommunityAlertPayload = {
      featureLabel: args.featureLabel,
      kindLabel: KIND_LABEL[args.kind],
      summaryJa: outcome.slackSummaryJa,
      textExcerpt: args.text,
      userId: args.userId,
      userName: args.userName,
      blocked: !outcome.allowed,
      contextUrl: args.contextUrl,
      toneFlag: outcome.toneFlag,
      toneReason: outcome.toneReason,
    };
    void sendSlackCommunityAlert(webhook, payload);
  }

  return outcome;
}
