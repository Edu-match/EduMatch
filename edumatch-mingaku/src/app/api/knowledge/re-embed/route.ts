import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 50;

/**
 * POST /api/knowledge/re-embed
 * 管理者専用：全チャンクの embedding を OpenAI で再生成して DB を更新する。
 * ダミー値や別モデルの embedding が入っている場合に使用する。
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY が設定されていません" }, { status: 500 });
  }

  const supabase = createServiceRoleClient();
  const openai = new OpenAI({ apiKey });

  // 全チャンクを取得（id + content のみ）
  const { data: chunks, error: fetchErr } = await supabase
    .from("knowledge_chunks")
    .select("id, content")
    .order("chunk_index");

  if (fetchErr) {
    return NextResponse.json(
      { error: "チャンク取得エラー: " + fetchErr.message },
      { status: 500 }
    );
  }

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ message: "チャンクが存在しません", updated: 0 });
  }

  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  // バッチ処理
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c: { id: string; content: string }) => c.content);

    let embeddings: number[][];
    try {
      const embRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
        dimensions: 1536,
      });
      embeddings = embRes.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`batch ${i}-${i + batch.length}: ${msg}`);
      failed += batch.length;
      continue;
    }

    if (embeddings.length !== batch.length) {
      errors.push(`batch ${i}: embedding count mismatch (${embeddings.length} vs ${batch.length})`);
      failed += batch.length;
      continue;
    }

    // 各チャンクを更新
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j] as { id: string; content: string };
      const embeddingStr = `[${embeddings[j].join(",")}]`;
      const { error: updateErr } = await supabase
        .from("knowledge_chunks")
        .update({ embedding: embeddingStr })
        .eq("id", chunk.id);

      if (updateErr) {
        errors.push(`chunk ${chunk.id}: ${updateErr.message}`);
        failed++;
      } else {
        updated++;
      }
    }
  }

  return NextResponse.json({
    total: chunks.length,
    updated,
    failed,
    errors: errors.slice(0, 10),
  });
}
