import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gpt-5.4";

const SYSTEM_PROMPT = `あなたは日本の教育関係者向けプラットフォームの動画要約アシスタントです。
入力として、動画タイトル・説明・運営メモが与えられます。
出力ルール:
- 日本語で出力する
- 「要点」を3〜5つの箇条書きで示し、最後に短いまとめを1〜2文添える
- マークダウン記法（- や **）を使ってよい
- 全体で300文字以内に収める
- 動画を見ていない読者にも内容が伝わるように、抽象的な決まり文句は避けて具体的に書く`;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== "ADMIN") {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI APIキーが未設定です" }, { status: 503 });
    }

    const { id } = await params;
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const sourceParts = [
      `タイトル: ${video.title}`,
      video.description?.trim() ? `説明: ${video.description.trim()}` : null,
      video.notes?.trim() ? `運営メモ: ${video.notes.trim()}` : null,
      `YouTube URL: ${video.youtube_url}`,
    ].filter(Boolean);

    if (!video.description?.trim() && !video.notes?.trim()) {
      return NextResponse.json(
        {
          error:
            "要約の素材が不足しています。説明文または運営メモを入力してから生成してください。",
        },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey });
    let summary = "";
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_completion_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: sourceParts.join("\n") },
        ],
      });
      summary = completion.choices[0]?.message?.content?.trim() ?? "";
    } catch (e) {
      console.error("[videos/:id/ai-summary] OpenAI", e);
      return NextResponse.json(
        { error: "AI要約の生成に失敗しました。時間をおいて再度お試しください。" },
        { status: 502 }
      );
    }

    if (!summary) {
      return NextResponse.json(
        { error: "AI要約の本文が空でした。" },
        { status: 502 }
      );
    }

    const updated = await prisma.video.update({
      where: { id },
      data: { ai_summary: summary },
    });

    return NextResponse.json({
      aiSummary: updated.ai_summary,
      updatedAt: updated.updated_at.toISOString(),
    });
  } catch (err) {
    console.error("[videos/:id/ai-summary POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
