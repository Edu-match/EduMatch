/**
 * 井戸端会議まわりのモデレーション通知用。
 * Slack の無料ワークスペースでも Incoming Webhooks は利用可能（ワークスペース管理者がアプリを承認する必要あり）。
 * 有料プランは不要。
 */

export type SlackCommunityAlertPayload = {
  /** 機能名（例: "井戸端会議" / "動画コメント"）。省略時は "井戸端会議" */
  featureLabel?: string;
  kindLabel: string;
  /** 掲載可否に関わらず運営が知りたい要約（日本語） */
  summaryJa: string;
  textExcerpt: string;
  userId: string;
  userName: string;
  blocked: boolean;
  /** 任意のコンテキストリンク（投稿先の動画・部屋など） */
  contextUrl?: string;
  /** トーン分類（"ok" 以外なら警告表示対象）。省略可。 */
  toneFlag?: "ok" | "negative" | "non_constructive" | "harsh";
  toneReason?: string;
};

const TONE_LABEL_JA: Record<string, string> = {
  negative: "ネガティブ",
  non_constructive: "非建設的な否定",
  harsh: "キツい言い方",
};

function excerpt(text: string, max = 600): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export async function sendSlackCommunityAlert(
  webhookUrl: string,
  payload: SlackCommunityAlertPayload
): Promise<void> {
  const featureLabel = payload.featureLabel?.trim() || "井戸端会議";
  const toneJa = payload.toneFlag && payload.toneFlag !== "ok" ? TONE_LABEL_JA[payload.toneFlag] : null;
  const header = payload.blocked
    ? `【${featureLabel}】投稿ブロック`
    : toneJa
      ? `【${featureLabel}】要配慮トーン（掲載は可）`
      : `【${featureLabel}】要レビュー（掲載は可）`;
  const lines = [
    `*${header}*`,
    `*種別:* ${payload.kindLabel}`,
    `*ユーザー:* ${payload.userName} (\`${payload.userId}\`)`,
    `*判定メモ:* ${payload.summaryJa}`,
    `*本文抜粋:*\n\`\`\`${excerpt(payload.textExcerpt)}\`\`\``,
  ];
  if (toneJa) {
    lines.splice(4, 0, `*トーン:* ${toneJa}${payload.toneReason ? ` — ${payload.toneReason}` : ""}`);
  }
  if (payload.contextUrl) {
    lines.splice(2, 0, `*コンテキスト:* ${payload.contextUrl}`);
  }
  const text = lines.join("\n");

  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: ac.signal,
    });
    if (!res.ok) {
      console.error("[slack-community-alert] webhook failed", res.status);
    }
  } catch (e) {
    console.error("[slack-community-alert]", e);
  } finally {
    clearTimeout(t);
  }
}
