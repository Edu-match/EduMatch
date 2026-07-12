import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentProfile } from "@/lib/auth";
import { AdminPersonaReplyTool, type ReplyTargetPost } from "./admin-persona-reply-tool";
import { AdminHistoricalPersona, type SpecialPersonaRow } from "./admin-historical-persona";
import { AdminMyPersonaPrompt } from "./admin-my-persona-prompt";
import { AdminMyPersonaCard } from "./admin-persona-card";
import { AdminPersonaTestChat } from "./admin-persona-test-chat";

export const dynamic = "force-dynamic";

export default async function AdminPersonaPage() {
  await requireAdmin();
  const profile = await getCurrentProfile();

  const persona = profile
    ? await prisma.userAiPersona.findUnique({
        where: { profile_id: profile.id },
        select: { display_name: true, avatar_url: true, expertise: true, values_text: true, persona_prompt: true, is_active: true, last_replied_at: true },
      }).catch(() => null)
    : null;

  // ペルソナの返信数（フォーラム上でAIペルソナとして投稿した返信）
  const personaReplyCount = profile && persona
    ? await prisma.forumReply.count({
        where: { author_id: profile.id, author_role: "AIペルソナ" },
      }).catch(() => 0)
    : 0;

  // 井戸端会議の投稿（forum_posts）。一般カテゴリ→部屋(ルーム)→投稿 の構造。
  const rawPosts = await prisma.forumPost.findMany({
    where: { is_hidden: false },
    orderBy: { created_at: "desc" },
    take: 400,
    select: {
      id: true, author_name: true, body: true, created_at: true,
      room: { select: { name: true, category: { select: { name: true } } } },
      _count: { select: { replies: true } },
    },
  }).catch(() => []);

  const specialRows = await prisma.aiSpecialPersona.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    select: { id: true, name: true, expertise: true, avatar_url: true, legal_status: true, legal_note: true, is_active: true, persona_prompt: true },
  }).catch(() => []);
  const specialPersonas: SpecialPersonaRow[] = specialRows.map((s) => ({
    id: s.id,
    name: s.name,
    expertise: s.expertise,
    avatarUrl: s.avatar_url,
    legalStatus: s.legal_status,
    legalNote: s.legal_note,
    isActive: s.is_active,
    personaPrompt: s.persona_prompt,
  }));

  const posts: ReplyTargetPost[] = rawPosts.map((p) => ({
    id: p.id,
    authorName: p.author_name,
    body: p.body,
    categoryName: p.room?.category?.name ?? "未分類",
    subCategoryName: p.room?.name ?? "部屋",
    replyCount: p._count?.replies ?? 0,
    createdAt: p.created_at.toISOString(),
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">AIペルソナ</h1>
      <p className="mt-1 text-sm text-muted-foreground">あなたの分身AIペルソナを作成・再生成し、井戸端会議の投稿に本人らしく返信できます。</p>

      {/* 現在のペルソナ */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold">あなたのAIペルソナ</h2>
        {persona?.persona_prompt ? (
          <>
            {/* ペルソナカード（アバター・専門タグ・自動返信トグル・統計） */}
            <AdminMyPersonaCard
              persona={{
                displayName: persona.display_name,
                avatarUrl: persona.avatar_url,
                expertise: persona.expertise,
                valuesText: persona.values_text,
                isActive: persona.is_active,
                replyCount: personaReplyCount,
                lastRepliedAt: persona.last_replied_at?.toISOString() ?? null,
              }}
            />
            {/* システムプロンプト表示・編集 */}
            <AdminMyPersonaPrompt initialPrompt={persona.persona_prompt} />
            {/* テスト会話（フォーラムには投稿されない） */}
            <AdminPersonaTestChat
              personaName={persona.display_name.startsWith("AI") ? persona.display_name : `AI${persona.display_name}`}
              personaAvatarUrl={persona.avatar_url}
            />
          </>
        ) : (
          <p className="mb-3 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">まだペルソナがありません。下のフォームで作成してください。</p>
        )}

      </section>

      {/* 投稿に返信 */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-bold">投稿を選んで返信を作成</h2>
        <p className="mb-3 text-xs text-muted-foreground">井戸端会議の直近の投稿から選び、AIで返信ドラフトを作成・編集して投稿できます。</p>
        <AdminPersonaReplyTool posts={posts} hasPersona={!!persona?.persona_prompt} />
      </section>

      {/* AIペルソナ作成・管理 */}
      <section className="mt-8">
        <AdminHistoricalPersona existing={specialPersonas} />
      </section>
    </main>
  );
}
