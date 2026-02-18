"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import type { Post, Profile, Role } from "@prisma/client";

export type PostWithProvider = Post & {
  provider: Pick<Profile, "id" | "name" | "avatar_url">;
};

// ブロックの型定義
export type ContentBlock = {
  id: string;
  type: "heading1" | "heading2" | "heading3" | "paragraph" | "image" | "video" | "quote" | "divider" | "list" | "ordered-list";
  content: string;
  align?: "left" | "center" | "right";
  url?: string;
  caption?: string;
  items?: string[];
};

// 記事作成のInput型
export type CreatePostInput = {
  title: string;
  leadText: string;
  category: string;
  tags: string;
  publishType: "public" | "member" | "draft";
  thumbnailUrl: string;
  blocks: ContentBlock[];
};

// 記事作成の結果型
export type CreatePostResult = {
  success: boolean;
  postId?: string;
  error?: string;
};

type SimpleResult = { success: boolean; error?: string };

async function requireAuthedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: "ログインが必要です" } as const;
  }
  return { user, error: null } as const;
}

async function requireAdmin(): Promise<SimpleResult & { userId?: string }> {
  const { user, error } = await requireAuthedUser();
  if (!user) return { success: false, error };

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (!profile || profile.role !== ("ADMIN" as Role)) {
    return { success: false, error: "権限がありません（管理者のみ）" };
  }

  return { success: true, userId: user.id };
}

/**
 * ブロックをHTML/テキストコンテンツに変換
 */
function blocksToContent(blocks: ContentBlock[], leadText: string): string {
  const parts: string[] = [];
  
  if (leadText) {
    parts.push(leadText);
    parts.push("");
  }
  
  for (const block of blocks) {
    switch (block.type) {
      case "heading1":
        parts.push(`# ${block.content}`);
        break;
      case "heading2":
        parts.push(`## ${block.content}`);
        break;
      case "heading3":
        parts.push(`### ${block.content}`);
        break;
      case "paragraph":
        parts.push(block.content);
        break;
      case "quote":
        parts.push(`> ${block.content}`);
        break;
      case "list":
        if (block.items) {
          block.items.forEach(item => parts.push(`- ${item}`));
        }
        break;
      case "ordered-list":
        if (block.items) {
          block.items.forEach((item, i) => parts.push(`${i + 1}. ${item}`));
        }
        break;
      case "image":
        if (block.url) {
          parts.push(`![${block.caption || "画像"}](${block.url})`);
        }
        break;
      case "video":
        if (block.url) {
          parts.push(`[動画](${block.url})`);
        }
        break;
      case "divider":
        parts.push("---");
        break;
    }
    parts.push("");
  }
  
  return parts.join("\n");
}

/**
 * ブロックから画像URLを抽出
 */
function extractImagesFromBlocks(blocks: ContentBlock[]): string[] {
  return blocks
    .filter(block => block.type === "image" && block.url)
    .map(block => block.url!)
    .filter(url => url.length > 0);
}

/**
 * ブロックからYouTube URLを抽出（最初の1つ）
 */
function extractYoutubeFromBlocks(blocks: ContentBlock[]): string | null {
  const videoBlock = blocks.find(block => block.type === "video" && block.url);
  if (videoBlock?.url) {
    // YouTubeのURLかチェック
    if (videoBlock.url.includes("youtube.com") || videoBlock.url.includes("youtu.be")) {
      return videoBlock.url;
    }
  }
  return null;
}

/**
 * 記事を作成する
 */
export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  try {
    const { user, error } = await requireAuthedUser();
    if (!user) return { success: false, error };
    
    // Profileが存在するか確認し、存在しない場合は作成
    try {
      let profile = await prisma.profile.findUnique({
        where: { id: user.id },
      });
      
      if (!profile) {
        // Profileが存在しない場合は作成
        const userMetadata = user.user_metadata || {};
        const name = userMetadata.name || userMetadata.full_name || user.email?.split("@")[0] || "ユーザー";
        
        profile = await prisma.profile.create({
          data: {
            id: user.id,
            name,
            email: user.email || "",
            role: "PROVIDER",
            subscription_status: "INACTIVE",
            avatar_url: userMetadata.avatar_url || userMetadata.picture || null,
          },
        });
      }
    } catch (dbError) {
      if (isDbUnavailable(dbError)) {
        return { 
          success: false, 
          error: "データベースに接続できません。しばらく待ってから再度お試しください。" 
        };
      }
      console.error("Profile lookup/creation error:", dbError);
      return { 
        success: false, 
        error: "ユーザー情報の取得に失敗しました。プロフィールを登録してください。" 
      };
    }
    
    // コンテンツを生成
    const content = blocksToContent(input.blocks, input.leadText);
    const images = extractImagesFromBlocks(input.blocks);
    const youtubeUrl = extractYoutubeFromBlocks(input.blocks);

    // 承認方式:
    // - draft: 下書き
    // - public/member: 申請（PENDING）→ 管理者承認で公開
    const isDraft = input.publishType === "draft";
    const status = isDraft ? "DRAFT" : "PENDING";
    const now = new Date();
    
    // 記事を作成
    const post = await prisma.post.create({
      data: {
        provider_id: user.id,
        title: input.title,
        content: content,
        thumbnail_url: input.thumbnailUrl || null,
        youtube_url: youtubeUrl,
        images: images,
        is_published: false,
        is_member_only: input.publishType === "member",
        status,
        submitted_at: isDraft ? null : now,
        approved_at: null,
        rejected_at: null,
        rejection_reason: null,
      },
    });
    
    return { success: true, postId: post.id };
  } catch (error) {
    console.error("Error creating post:", error);
    
    if (isDbUnavailable(error)) {
      return { 
        success: false, 
        error: "データベースに接続できません。しばらく待ってから再度お試しください。" 
      };
    }
    
    if (error instanceof Error) {
      // より具体的なエラーメッセージを返す
      if (error.message.includes("Unique constraint")) {
        return { success: false, error: "この記事は既に存在します" };
      }
      if (error.message.includes("Foreign key constraint")) {
        return { success: false, error: "ユーザー情報が見つかりません。プロフィールを登録してください。" };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "記事の作成に失敗しました" };
  }
}

/**
 * 記事を更新する
 */
export async function updatePost(
  id: string,
  input: Partial<CreatePostInput>
): Promise<CreatePostResult> {
  try {
    const { user, error } = await requireAuthedUser();
    if (!user) return { success: false, error };
    
    // 記事の所有者を確認
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { provider_id: true },
    });
    
    if (!existingPost) {
      return { success: false, error: "記事が見つかりません" };
    }
    
    if (existingPost.provider_id !== user.id) {
      return { success: false, error: "この記事を編集する権限がありません" };
    }
    
    // 更新データを構築
    const updateData: Record<string, unknown> = {};
    
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.blocks !== undefined) {
      updateData.content = blocksToContent(input.blocks, input.leadText || "");
      updateData.images = extractImagesFromBlocks(input.blocks);
      updateData.youtube_url = extractYoutubeFromBlocks(input.blocks);
    }
    if (input.thumbnailUrl !== undefined) {
      updateData.thumbnail_url = input.thumbnailUrl || null;
    }
    if (input.publishType !== undefined) {
      const isDraft = input.publishType === "draft";
      updateData.is_published = false;
      updateData.is_member_only = input.publishType === "member";
      updateData.status = isDraft ? "DRAFT" : "PENDING";
      updateData.submitted_at = isDraft ? null : new Date();
      updateData.approved_at = null;
      updateData.rejected_at = null;
      updateData.rejection_reason = null;
    }
    
    await prisma.post.update({
      where: { id },
      data: updateData,
    });
    
    return { success: true, postId: id };
  } catch (error) {
    console.error("Error updating post:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "記事の更新に失敗しました" };
  }
}

/**
 * 管理者: 承認待ちの記事一覧を取得
 */
export async function getPendingPosts(): Promise<PostWithProvider[]> {
  const auth = await requireAdmin();
  if (!auth.success) return [];

  try {
    const posts = await prisma.post.findMany({
      where: { status: "PENDING" },
      include: {
        provider: { select: { id: true, name: true, avatar_url: true } },
      },
      orderBy: { submitted_at: "asc" },
      take: 100,
    });

    return posts.map((post) => ({
      ...post,
      provider: post.provider || { id: post.provider_id, name: "投稿者", avatar_url: null },
    }));
  } catch (e) {
    console.error("Error fetching pending posts:", e);
    return [];
  }
}

/**
 * 管理者: 記事を承認して公開
 */
export async function approvePost(postId: string): Promise<SimpleResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  try {
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "APPROVED",
        is_published: true,
        approved_at: new Date(),
        rejected_at: null,
        rejection_reason: null,
      },
    });
    return { success: true };
  } catch (e) {
    console.error("Error approving post:", e);
    return { success: false, error: "承認に失敗しました" };
  }
}

/**
 * 管理者: 記事を却下
 */
export async function rejectPost(postId: string, reason?: string): Promise<SimpleResult> {
  const auth = await requireAdmin();
  if (!auth.success) return auth;

  try {
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "REJECTED",
        is_published: false,
        rejected_at: new Date(),
        approved_at: null,
        rejection_reason: reason?.slice(0, 500) || null,
      },
    });
    return { success: true };
  } catch (e) {
    console.error("Error rejecting post:", e);
    return { success: false, error: "却下に失敗しました" };
  }
}

function isDbUnavailable(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === "PrismaClientInitializationError" || /Can't reach database server/.test(String(error.message));
  }
  return false;
}

// デモデータ（DB接続不可時に表示）
const DEMO_POSTS: PostWithProvider[] = [
  {
    id: "demo-1",
    provider_id: "demo-provider",
    title: "GIGAスクール構想の最新動向と教育現場への影響",
    content: "GIGAスクール構想が本格化し、全国の学校でICT環境の整備が進んでいます。本記事では、導入から2年が経過した現在の状況と、教育現場で起きている変化について詳しく解説します。\n\n1人1台端末の活用が進む中、教員の指導法にも変化が見られます。デジタル教科書の活用、協働学習ツールの導入、そしてAIを活用した個別最適化学習など、様々な取り組みが広がっています。",
    thumbnail_url: "https://placehold.co/800x450/3b82f6/white?text=GIGA+School",
    youtube_url: null,
    images: [],
    category: "教育ICT",
    tags: ["GIGAスクール", "1人1台端末", "ICT"],
    summary: "GIGAスクール構想の現状と教育現場への影響を解説。1人1台端末やデジタル教科書の活用、個別最適化学習の動向を紹介します。",
    view_count: 1250,
    favorite_count: 45,
    is_published: true,
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 3),
    approved_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
    rejected_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
    updated_at: new Date(),
    is_member_only: false,
    wp_post_id: null,
    provider: { id: "demo-provider-1", name: "教育ICTニュース", avatar_url: null },
  },
  {
    id: "demo-2",
    provider_id: "demo-provider-2",
    title: "AI教材が変える学習体験 - 個別最適化学習の実践事例",
    content: "人工知能（AI）を活用した教材が教育現場に浸透しつつあります。生徒一人ひとりの理解度に合わせて問題を出題するアダプティブラーニングは、従来の一斉授業では難しかった個別対応を可能にしています。\n\n本記事では、実際にAI教材を導入した学校の事例を紹介し、その効果と課題について考察します。",
    thumbnail_url: "https://placehold.co/800x450/10b981/white?text=AI+Learning",
    youtube_url: null,
    images: [],
    category: "教育ICT",
    tags: ["AI", "アダプティブラーニング", "個別最適化"],
    summary: "AI教材とアダプティブラーニングの実践事例を紹介。導入校の効果と課題を考察します。",
    view_count: 890,
    favorite_count: 32,
    is_published: true,
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 25),
    approved_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
    rejected_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updated_at: new Date(),
    is_member_only: false,
    wp_post_id: null,
    provider: { id: "demo-provider-2", name: "EdTech研究所", avatar_url: null },
  },
  {
    id: "demo-3",
    provider_id: "demo-provider-3",
    title: "教員の働き方改革 - ICTで実現する業務効率化",
    content: "教員の長時間労働が社会問題となる中、ICTを活用した業務効率化の取り組みが各地で進んでいます。校務支援システムの導入、保護者連絡のデジタル化、採点業務の自動化など、様々なツールが教員の負担軽減に貢献しています。\n\n本記事では、実際に働き方改革に成功した学校の事例と、導入のポイントを紹介します。",
    thumbnail_url: "https://placehold.co/800x450/8b5cf6/white?text=Work+Reform",
    youtube_url: null,
    images: [],
    category: "学校運営",
    tags: ["働き方改革", "校務支援", "業務効率化"],
    summary: "ICTを活用した教員の働き方改革の事例と、校務支援システムなど導入のポイントを紹介します。",
    view_count: 720,
    favorite_count: 28,
    is_published: true,
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 49),
    approved_at: new Date(Date.now() - 1000 * 60 * 60 * 48),
    rejected_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updated_at: new Date(),
    is_member_only: false,
    wp_post_id: null,
    provider: { id: "demo-provider-3", name: "学校運営サポート", avatar_url: null },
  },
  {
    id: "demo-4",
    provider_id: "demo-provider-4",
    title: "プログラミング教育必修化から3年 - 現場の声と今後の展望",
    content: "2020年に小学校で必修化されたプログラミング教育。導入から3年が経過し、各学校での実践が蓄積されてきました。\n\nScratchやViscuitなどのビジュアルプログラミングから、micro:bitやRaspberry Piを使った実践まで、多様な取り組みが行われています。",
    thumbnail_url: "https://placehold.co/800x450/f59e0b/white?text=Programming",
    youtube_url: null,
    images: [],
    category: "教育ICT",
    tags: ["プログラミング教育", "Scratch", "小学校"],
    summary: "プログラミング教育必修化から3年。現場の実践とビジュアルプログラミング、micro:bitなどの活用を紹介します。",
    view_count: 650,
    favorite_count: 21,
    is_published: true,
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 73),
    approved_at: new Date(Date.now() - 1000 * 60 * 60 * 72),
    rejected_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72),
    updated_at: new Date(),
    is_member_only: false,
    wp_post_id: null,
    provider: { id: "demo-provider-4", name: "プログラミング教育推進室", avatar_url: null },
  },
  {
    id: "demo-5",
    provider_id: "demo-provider-5",
    title: "オンライン授業の質を高める - 双方向コミュニケーションの工夫",
    content: "コロナ禍を経て定着したオンライン授業。対面授業との併用が一般的になる中、オンラインならではの強みを活かした授業設計が求められています。\n\nブレイクアウトルームの活用、デジタルホワイトボードの活用、チャット機能の効果的な使い方など、実践的なテクニックを紹介します。",
    thumbnail_url: "https://placehold.co/800x450/ec4899/white?text=Online+Class",
    youtube_url: null,
    images: [],
    category: "教育ICT",
    tags: ["オンライン授業", "双方向", "授業改善"],
    summary: "オンライン授業の質を高める双方向コミュニケーションの工夫と、ブレイクアウトルーム・デジタルホワイトボードの活用法を紹介します。",
    view_count: 580,
    favorite_count: 18,
    is_published: true,
    status: "APPROVED",
    submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 97),
    approved_at: new Date(Date.now() - 1000 * 60 * 60 * 96),
    rejected_at: null,
    rejection_reason: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 96),
    updated_at: new Date(),
    is_member_only: false,
    wp_post_id: null,
    provider: { id: "demo-provider-5", name: "オンライン教育ラボ", avatar_url: null },
  },
];

/**
 * 最新の公開記事を取得
 * 未ログイン時は会員限定記事を除外する
 * @param limit 取得件数（デフォルト: 10）
 */
export async function getLatestPosts(limit: number = 10): Promise<PostWithProvider[]> {
  try {
    const { user } = await requireAuthedUser();
    const where = !user
      ? {
          AND: [
            { OR: [{ status: "APPROVED" as const }, { is_published: true }] },
            { is_member_only: false },
          ],
        }
      : { OR: [{ status: "APPROVED" as const }, { is_published: true }] };

    const posts = await prisma.post.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });

    // providerがnullの場合はデフォルト値を設定
    return posts.map(post => ({
      ...post,
      provider: post.provider || {
        id: post.provider_id,
        name: "投稿者",
        avatar_url: null,
      },
    }));
  } catch (error) {
    if (isDbUnavailable(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[posts] Database unavailable; showing demo content.");
      }
      return DEMO_POSTS.slice(0, limit);
    }
    console.error("Error fetching latest posts:", error);
    return DEMO_POSTS.slice(0, limit);
  }
}

/**
 * 公開記事のカテゴリ別件数（一覧で0件のカテゴリを非表示にするために使用）
 */
export async function getArticleCategoryCounts(): Promise<Record<string, number>> {
  try {
    const { user } = await requireAuthedUser();
    const where = !user
      ? {
          AND: [
            { OR: [{ status: "APPROVED" as const }, { is_published: true }] },
            { is_member_only: false },
          ],
        }
      : { OR: [{ status: "APPROVED" as const }, { is_published: true }] };

    const result = await prisma.post.groupBy({
      by: ["category"],
      where,
      _count: true,
    });
    const map: Record<string, number> = {};
    for (const r of result) {
      if (r.category) map[r.category] = r._count;
    }
    return map;
  } catch (error) {
    if (isDbUnavailable(error)) return {};
    console.error("Error fetching article category counts:", error);
    return {};
  }
}

/**
 * 人気の記事を取得（view_count順）
 * 未ログイン時は会員限定記事を除外する
 * @param limit 取得件数（デフォルト: 5）
 */
export async function getPopularPosts(limit: number = 5): Promise<PostWithProvider[]> {
  try {
    const { user } = await requireAuthedUser();
    const where = !user
      ? {
          AND: [
            { OR: [{ status: "APPROVED" as const }, { is_published: true }] },
            { is_member_only: false },
          ],
        }
      : { OR: [{ status: "APPROVED" as const }, { is_published: true }] };

    const posts = await prisma.post.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: {
        view_count: "desc",
      },
      take: limit,
    });

    // providerがnullの場合はデフォルト値を設定
    return posts.map(post => ({
      ...post,
      provider: post.provider || {
        id: post.provider_id,
        name: "投稿者",
        avatar_url: null,
      },
    }));
  } catch (error) {
    if (isDbUnavailable(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[posts] Database unavailable; showing demo content.");
      }
      return [...DEMO_POSTS].sort((a, b) => b.view_count - a.view_count).slice(0, limit);
    }
    console.error("Error fetching popular posts:", error);
    return [...DEMO_POSTS].sort((a, b) => b.view_count - a.view_count).slice(0, limit);
  }
}

/**
 * 記事を1件取得
 * @param id 記事ID
 */
export async function getPostById(id: string): Promise<PostWithProvider | null> {
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!post) return null;

    // 公開済み（APPROVED）以外は、投稿者本人 or 管理者のみ閲覧可
    const isPublic = post.status === "APPROVED" || post.is_published === true;
    if (!isPublic) {
      const { user } = await requireAuthedUser();
      if (!user) return null;

      if (user.id !== post.provider_id) {
        const profile = await prisma.profile.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (!profile || profile.role !== ("ADMIN" as Role)) {
          return null;
        }
      }
    }

    // 会員限定記事は未ログインなら非公開
    if (post.is_member_only) {
      const { user } = await requireAuthedUser();
      if (!user) return null;
    }

    // providerがnullの場合はデフォルト値を設定
    if (!post.provider) {
      return { ...post, provider: { id: post.provider_id, name: "投稿者", avatar_url: null } };
    }

    return post;
  } catch (error) {
    if (isDbUnavailable(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[posts] Database unavailable; checking demo data.");
      }
      return DEMO_POSTS.find((p) => p.id === id) || null;
    }
    console.error("Error fetching post:", error);
    return DEMO_POSTS.find((p) => p.id === id) || null;
  }
}
