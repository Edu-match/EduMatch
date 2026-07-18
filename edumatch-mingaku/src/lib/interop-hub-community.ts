/**
 * インタロップ／教育のひろばハブ内「自由に書く」コミュニティトピック。
 * ハブ下部のストリップから開く固定ルーム群。DB の forum_room / interop_topics
 * どちらにも存在しないため、初回アクセス時に ensureInteropForumRoom が
 * ここの定義でルームを自動作成する（未定義だと 404 になる）。
 */
export const INTEROP_HUB_COMMUNITY = [
  { id: "interop-2026-freewrite",   name: "ひとことメッセージ", emoji: "💬", color: "#9fb4e8" },
  { id: "interop-2026-ai-edu",      name: "AI×教育の体験",     emoji: "🤖", color: "#7dd4fc" },
  { id: "interop-2026-future",      name: "未来の学校像",       emoji: "🏫", color: "#86efac" },
  { id: "interop-2026-field-voice", name: "現場の声",           emoji: "📢", color: "#fca5a5" },
  { id: "interop-2026-idea",        name: "教育アイデア",       emoji: "💡", color: "#fcd34d" },
] as const;

type HubCommunityRoom = { id: string; name: string; emoji: string; color: string };

export const INTEROP_HUB_COMMUNITY_MAP = new Map<string, HubCommunityRoom>(
  INTEROP_HUB_COMMUNITY.map((r) => [r.id, r]),
);
