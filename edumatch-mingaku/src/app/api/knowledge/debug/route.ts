import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/knowledge/debug
 * 管理者専用 RAG 診断エンドポイント
 * - DB内のチャンク数・null embedding数を確認
 * - match_knowledge_chunks RPC のテスト実行
 */
export async function GET() {
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

  const result: Record<string, unknown> = {};

  try {
    const supabase = createServiceRoleClient();

    // 1. ドキュメント数
    const { count: docCount, error: docErr } = await supabase
      .from("knowledge_documents")
      .select("*", { count: "exact", head: true });
    result.document_count = docErr ? `ERROR: ${JSON.stringify(docErr)}` : docCount;

    // 2. チャンク総数
    const { count: chunkCount, error: chunkErr } = await supabase
      .from("knowledge_chunks")
      .select("*", { count: "exact", head: true });
    result.chunk_count = chunkErr ? `ERROR: ${JSON.stringify(chunkErr)}` : chunkCount;

    // 3. embedding が null のチャンク数
    const { count: nullEmbCount, error: nullErr } = await supabase
      .from("knowledge_chunks")
      .select("*", { count: "exact", head: true })
      .is("embedding", null);
    result.null_embedding_count = nullErr ? `ERROR: ${JSON.stringify(nullErr)}` : nullEmbCount;

    // 4. 最初の数件のチャンクを確認（embeddingが存在するかのみ）
    const { data: sampleChunks, error: sampleErr } = await supabase
      .from("knowledge_chunks")
      .select("id, chunk_index, content, document_id")
      .limit(3);
    result.sample_chunks = sampleErr ? `ERROR: ${JSON.stringify(sampleErr)}` : sampleChunks;

    // 5. OpenAI Embedding生成テスト
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      result.embedding_test = "SKIP: OPENAI_API_KEY not set";
    } else {
      try {
        const openai = new OpenAI({ apiKey });
        const embRes = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: "IT教育 制度 導入障壁",
          dimensions: 1536,
        });
        const testEmbedding = embRes.data[0]?.embedding;
        result.embedding_test = testEmbedding
          ? `OK: ${testEmbedding.length} dims, first=[${testEmbedding.slice(0, 3).join(",")}...]`
          : "FAIL: no embedding returned";

        if (testEmbedding) {
          // 6. RPC テスト（文字列形式）
          const embStr = `[${testEmbedding.join(",")}]`;
          const { data: rpcData, error: rpcErr } = await supabase.rpc(
            "match_knowledge_chunks",
            {
              query_embedding: embStr,
              match_count: 5,
              match_threshold: 0.1, // 非常に低い閾値でテスト
            }
          );
          if (rpcErr) {
            result.rpc_test_string = `ERROR: ${JSON.stringify(rpcErr)}`;
          } else {
            result.rpc_test_string = `OK: ${rpcData?.length ?? 0} hits`;
            if (rpcData && rpcData.length > 0) {
              result.rpc_top_hit = {
                doc_title: rpcData[0].doc_title,
                similarity: rpcData[0].similarity,
                content_preview: String(rpcData[0].content).slice(0, 100),
              };
            }
          }

          // 7. RPC テスト（配列形式）
          const { data: rpcData2, error: rpcErr2 } = await supabase.rpc(
            "match_knowledge_chunks",
            {
              query_embedding: testEmbedding,
              match_count: 5,
              match_threshold: 0.1,
            }
          );
          if (rpcErr2) {
            result.rpc_test_array = `ERROR: ${JSON.stringify(rpcErr2)}`;
          } else {
            result.rpc_test_array = `OK: ${rpcData2?.length ?? 0} hits`;
          }
        }
      } catch (e) {
        result.embedding_test = `EXCEPTION: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    result.status = "ok";
  } catch (e) {
    result.status = "error";
    result.error = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(result, { status: 200 });
}
