import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getCurrentProfile } from "@/lib/auth";
import { PersonaCreator } from "@/components/persona/persona-creator";
import { AdminPersonaReplyTool, type ReplyTargetPost } from "./admin-persona-reply-tool";
import { AdminHistoricalPersona, type SpecialPersonaRow } from "./admin-historical-persona";
import { AdminMyPersonaPrompt } from "./admin-my-persona-prompt";

export const dynamic = "force-dynamic";

export default async function AdminPersonaPage() {
  await requireAdmin();
  const profile = await getCurrentProfile();

  const persona = profile
    ? await prisma.userAiPersona.findUnique({
        where: { profile_id: profile.id },
        select: { display_name: true, avatar_url: true, expertise: true, values_text: true, persona_prompt: true, is_active: true },
      }).catch(() => null)
    : null;

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
            <div className="mb-3 flex items-center gap-3 rounded-xl border bg-card p-3">
              {persona.avatar_url ? (
                <Image src={persona.avatar_url} alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover" unoptimized />
              ) : (
                <div className="h-14 w-14 rounded-full bg-muted" />
              )}
              <div className="min-w-0 text-xs text-muted-foreground">
                <p className="text-sm font-bold text-foreground">{persona.display_name}</p>
                {persona.expertise.length > 0 && <p className="truncate">得意分野: {persona.expertise.join("、")}</p>}
                <p className={persona.is_active ? "text-emerald-600" : "text-amber-600"}>
                  自動返信: {persona.is_active ? "有効" : "オフ（フォーラム管理で有効化できます）"}
                </p>
              </div>
            </div>
            {/* システムプロンプト表示・編集 */}
            <AdminMyPersonaPrompt initialPrompt={persona.persona_prompt} />
          </>
        ) : (
          <p className="mb-3 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">まだペルソナがありません。下のフォームで作成してください。</p>
        )}

        <PersonaCreator
          defaults={{
            name: profile?.name ?? "",
            bio: profile?.bio ?? undefined,
            interests: profile?.interests ?? [],
          }}
          currentAvatarUrl={persona?.avatar_url ?? null}
        />
      </section>

      {/* 投稿に返信 */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-bold">投稿を選んで返信を作成</h2>
        <p className="mb-3 text-xs text-muted-foreground">井戸端会議の直近の投稿から選び、AIで返信ドラフトを作成・編集して投稿できます。</p>
        <AdminPersonaReplyTool posts={posts} hasPersona={!!persona?.persona_prompt} />
      </section>

      {/* 特別AIペルソナ */}
      <section className="mt-8">
        <h2 className="mb-1 text-sm font-bold">AIペルソナを作成</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          名前と任意の説明からAIペルソナとオリジナルイラストを生成します。説明が空の場合はネット検索で自動調査します。
          <br />※法的チェックはAIによる参考判定です。最終的な公開可否は運営でご判断ください。
        </p>
        <AdminHistoricalPersona existing={specialPersonas} />
      </section>
    </main>
  );
}
