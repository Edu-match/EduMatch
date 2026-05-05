function publicSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (explicit) return explicit;
  const v = process.env.VERCEL_URL;
  if (v) return `https://${v.replace(/^https?:\/\//, "")}`;
  return "";
}

export type SlackUserReportPayload = {
  reportId: string;
  reporterName: string;
  reporterId: string;
  reportedName: string;
  reportedUserId: string;
  reasonLabel: string;
  detail: string | null;
  contextKind: string;
  contextExcerpt: string | null;
};

function excerpt(text: string | null | undefined, max = 800): string {
  if (!text) return "—";
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export async function sendSlackUserReport(
  webhookUrl: string,
  p: SlackUserReportPayload
): Promise<void> {
  const text = [
    "*【ユーザー報告】*",
    `*報告ID:* \`${p.reportId}\``,
    `*報告者:* ${p.reporterName} (\`${p.reporterId}\`)`,
    `*対象ユーザー:* ${p.reportedName} (\`${p.reportedUserId}\`)`,
    `*理由:* ${p.reasonLabel}`,
    `*詳細:* ${p.detail?.trim() ? p.detail.trim() : "—"}`,
    `*文脈:* ${p.contextKind}`,
    `*抜粋:*\n\`\`\`${excerpt(p.contextExcerpt)}\`\`\``,
    `*管理画面:* ${publicSiteOrigin() ? `${publicSiteOrigin()}/admin/user-reports` : "/admin/user-reports（サイトURLを環境変数で設定してください）"}`,
  ].join("\n");

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
      console.error("[slack-user-report] webhook failed", res.status);
    }
  } catch (e) {
    console.error("[slack-user-report]", e);
  } finally {
    clearTimeout(t);
  }
}
