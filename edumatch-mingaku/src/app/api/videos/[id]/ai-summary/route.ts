import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile } from "@/lib/auth";
import { fetchYoutubeTranscript } from "@/lib/youtube-transcript";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "gpt-5.4";

const SYSTEM_PROMPT = `あなたは日本の教育関係者向けプラットフォームの動画要約アシスタントです。
入力として、YouTube動画のタイトルと字幕テキスト（または動画説明文）が与えられます。
動画の内容を実際に分析し、視聴者が要点を素早く把握できる要約を書いてください。

出力ルール:
- 日本語で出力する
- 「要点」を3〜5つの箇条書きで示し、最後に短いまとめを1〜2文添える
- マークダウン記法（- や **）を使ってよい
- 全体で300文字以内に収める
- 字幕・説明文に基づき、具体的な内容を反映する（抽象的な決まり文句は避ける）`;

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

    const transcript = await fetchYoutubeTranscript(video.youtube_id);
    if (!transcript) {
      return NextResponse.json(
        {
          error:
            "YouTube から字幕・説明文を取得できませんでした。動画に字幕が有効か、説明文があるか確認してください。",
        },
        { status: 400 }
      );
    }

    const sourceLabel =
      transcript.source === "captions"
        ? `字幕（${transcript.languageCode}）`
        : "YouTube 説明文";

    const userContent = [
      `タイトル: ${video.title}`,
      `分析ソース: ${sourceLabel}`,
      video.description?.trim() ? `サイト上の補足説明: ${video.description.trim()}` : null,
      "---",
      transcript.text,
    ]
      .filter(Boolean)
      .join("\n");

    const openai = new OpenAI({ apiKey });
    let summary = "";
    try {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.3,
        max_completion_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
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
      analyzedFrom: sourceLabel,
      updatedAt: updated.updated_at.toISOString(),
    });
  } catch (err) {
    console.error("[videos/:id/ai-summary POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
