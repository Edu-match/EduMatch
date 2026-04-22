import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK_SIZE_TOKENS = 500;
const CHUNK_OVERLAP_TOKENS = 50;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const VALID_SOURCE_TYPES = [
  "curriculum_elementary",
  "curriculum_middle",
  "curriculum_high",
  "mext_giga",
  "mext_digital",
  "mext_special",
  "mext_guideline",
  "oecd_learning",
  "oecd_teaching",
  "oecd_other",
  "school_standard",
  "education_plan",
  "cue_answer",
  "law_education",
  "other",
] as const;

type SourceType = (typeof VALID_SOURCE_TYPES)[number];

// ─── テキストチャンク分割（トークン近似：4文字≒1トークン） ────────────────────

function splitIntoChunks(text: string): string[] {
  const approxCharSize = CHUNK_SIZE_TOKENS * 4;
  const approxOverlap = CHUNK_OVERLAP_TOKENS * 4;

  // 段落単位で分割してから結合
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > approxCharSize) {
      if (current) {
        chunks.push(current.trim());
        // オーバーラップ: 末尾から approxOverlap 文字を次チャンクの先頭に持ち越す
        current = current.slice(-approxOverlap) + "\n\n" + para;
      } else {
        // 単一段落が限界を超えた場合はそのまま追加
        chunks.push(para.slice(0, approxCharSize).trim());
        current = para.slice(approxCharSize - approxOverlap);
      }
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.filter((c) => c.length > 20);
}

// ─── PDF テキスト抽出 ────────────────────────────────────────────────────────

async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return (result.text ?? "").replace(/\s{3,}/g, "\n\n").trim();
  } finally {
    await parser.destroy();
  }
}

// ─── Embedding バッチ生成 ────────────────────────────────────────────────────

async function generateEmbeddings(
  openai: OpenAI,
  texts: string[]
): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
    dimensions: 1536,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

// ─── POST ハンドラ ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // 管理者チェック
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!profile || profile.role !== "ADMIN") {
    return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI APIキーが設定されていません" },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "フォームデータの解析に失敗しました" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const title = (formData.get("title") as string | null)?.trim();
  const sourceType = (formData.get("source_type") as string | null)?.trim() as SourceType | undefined;
  const sourceTypeOther = (formData.get("source_type_other") as string | null)?.trim() || null;
  const sourceUrl = (formData.get("source_url") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!title) {
    return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
  }
  if (!sourceType || !VALID_SOURCE_TYPES.includes(sourceType)) {
    return NextResponse.json({ error: "有効な文書種別を指定してください" }, { status: 400 });
  }
  if (sourceType === "other" && !sourceTypeOther) {
    return NextResponse.json({ error: "「その他」を選んだ場合は種別名を入力してください" }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "ファイルを選択してください" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `ファイルは${MAX_FILE_BYTES / (1024 * 1024)}MB以下にしてください` },
      { status: 400 }
    );
  }

  // テキスト抽出
  let rawText: string;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".pdf")) {
    if (buffer.length < 5 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json({ error: "有効なPDFファイルではありません" }, { status: 400 });
    }
    try {
      rawText = await extractPdfText(buffer);
    } catch (e) {
      console.error("[knowledge/upload] PDF parse error:", e);
      return NextResponse.json(
        { error: "PDFからテキストを抽出できませんでした" },
        { status: 422 }
      );
    }
  } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    rawText = buffer.toString("utf8");
  } else {
    return NextResponse.json(
      { error: "対応ファイル形式: PDF, TXT, MD" },
      { status: 400 }
    );
  }

  if (rawText.length < 50) {
    return NextResponse.json({ error: "テキストが短すぎます（50文字以上必要）" }, { status: 422 });
  }

  // チャンク分割
  const chunks = splitIntoChunks(rawText);
  if (chunks.length === 0) {
    return NextResponse.json({ error: "チャンクを生成できませんでした" }, { status: 422 });
  }

  // Embedding 生成（OpenAI は 1リクエストで最大2048テキスト）
  const openai = new OpenAI({ apiKey });
  const BATCH = 100;
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await generateEmbeddings(openai, batch);
    allEmbeddings.push(...embeddings);
  }

  // Supabase クライアント（service_role ではなく認証済みセッション）
  const supabase = await createClient();

  // KnowledgeDocument 登録（Prisma 経由）
  const doc = await prisma.knowledgeDocument.create({
    data: {
      title,
      source_type: sourceType,
      source_type_other: sourceType === "other" ? sourceTypeOther : null,
      source_url: sourceUrl,
      description,
    },
  });

  // KnowledgeChunk + embedding 登録（pgvector は Prisma Unsupported のため Supabase client で INSERT）
  const rows = chunks.map((content, idx) => ({
    document_id: doc.id,
    chunk_index: idx,
    content,
    embedding: `[${allEmbeddings[idx].join(",")}]`,
  }));

  const { error: insertError } = await supabase
    .from("knowledge_chunks")
    .insert(rows);

  if (insertError) {
    // ドキュメントも削除してロールバック
    await prisma.knowledgeDocument.delete({ where: { id: doc.id } });
    console.error("[knowledge/upload] Supabase insert error:", insertError);
    return NextResponse.json(
      { error: "チャンクの保存に失敗しました: " + insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    document_id: doc.id,
    chunk_count: chunks.length,
  });
}

// ─── GET: 文書一覧 ───────────────────────────────────────────────────────────

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

  const docs = await prisma.knowledgeDocument.findMany({
    orderBy: { created_at: "desc" },
    include: { _count: { select: { chunks: true } } },
  });

  return NextResponse.json({ documents: docs });
}

// ─── DELETE: 文書削除（cascadeでchunkも消える） ─────────────────────────────

export async function DELETE(req: NextRequest) {
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

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "idが必要です" }, { status: 400 });
  }

  await prisma.knowledgeDocument.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
