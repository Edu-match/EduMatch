import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServiceRoleClient } from "@/utils/supabase/server-admin";

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

const MAX_FILES = 10;

// ─── 1ファイルを処理してDBに保存する内部関数 ─────────────────────────────────

async function processAndSaveFile(
  file: File,
  docTitle: string,
  sourceType: SourceType,
  sourceTypeOther: string | null,
  sourceUrl: string | null,
  description: string | null,
  openai: OpenAI
): Promise<{ document_id: string; chunk_count: number }> {
  const fileName = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // テキスト抽出
  let rawText: string;
  if (fileName.endsWith(".pdf")) {
    if (buffer.length < 5 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      throw new Error("有効なPDFファイルではありません");
    }
    rawText = await extractPdfText(buffer);
  } else if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    rawText = buffer.toString("utf8");
  } else {
    throw new Error("対応ファイル形式: PDF, TXT, MD");
  }

  if (rawText.length < 50) {
    throw new Error("テキストが短すぎます（50文字以上必要）");
  }

  // チャンク分割
  const chunks = splitIntoChunks(rawText);
  if (chunks.length === 0) {
    throw new Error("チャンクを生成できませんでした");
  }

  // Embedding 生成（バッチ処理）
  const BATCH = 100;
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await generateEmbeddings(openai, batch);
    allEmbeddings.push(...embeddings);
  }

  if (allEmbeddings.length !== chunks.length) {
    throw new Error(
      `Embeddingの生成件数が一致しません（chunks=${chunks.length}, embeddings=${allEmbeddings.length}）`
    );
  }

  // KnowledgeDocument 登録
  const doc = await prisma.knowledgeDocument.create({
    data: {
      title: docTitle,
      source_type: sourceType,
      source_type_other: sourceType === "other" ? sourceTypeOther : null,
      source_url: sourceUrl,
      description,
    },
  });

  // KnowledgeChunk + embedding 登録（service_role client で INSERT）
  const supabase = createServiceRoleClient();
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
    await prisma.knowledgeDocument.delete({ where: { id: doc.id } });
    throw new Error("チャンクの保存に失敗しました: " + insertError.message);
  }

  return { document_id: doc.id, chunk_count: chunks.length };
}

// ─── POST ハンドラ ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ error: "OpenAI APIキーが設定されていません" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "フォームデータの解析に失敗しました" }, { status: 400 });
  }

  // ─── 共通フィールド ───────────────────────────────────────────────────────
  const title = (formData.get("title") as string | null)?.trim();
  const sourceType = (formData.get("source_type") as string | null)?.trim() as SourceType | undefined;
  const sourceTypeOther = (formData.get("source_type_other") as string | null)?.trim() || null;
  const description = (formData.get("description") as string | null)?.trim() || null;

  if (!title) {
    return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
  }
  if (!sourceType || !VALID_SOURCE_TYPES.includes(sourceType)) {
    return NextResponse.json({ error: "有効な文書種別を指定してください" }, { status: 400 });
  }
  if (sourceType === "other" && !sourceTypeOther) {
    return NextResponse.json(
      { error: "「その他」を選んだ場合は種別名を入力してください" },
      { status: 400 }
    );
  }

  // ─── 複数ファイル取得（files[] / labels[] / source_urls[]） ──────────────
  const files = formData.getAll("files") as File[];
  const labels = (formData.getAll("labels") as string[]).map((s) => s.trim());
  const sourceUrls = (formData.getAll("source_urls") as string[]).map(
    (s) => s.trim() || null
  );

  if (files.length === 0) {
    return NextResponse.json({ error: "ファイルを1つ以上選択してください" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `ファイルは最大${MAX_FILES}件までです` },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey });

  type DocResult = { index: number; title: string; document_id: string; chunk_count: number };
  type DocError = { index: number; title: string; error: string };

  const results: DocResult[] = [];
  const errors: DocError[] = [];

  // ─── 各ファイルを順次処理 ────────────────────────────────────────────────
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const label = labels[i] ?? "";
    const sourceUrl = sourceUrls[i] ?? null;
    const docTitle = label ? `${title}（${label}）` : title;

    if (file.size === 0) {
      errors.push({ index: i, title: docTitle, error: "空のファイルです" });
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push({
        index: i,
        title: docTitle,
        error: `ファイルが${MAX_FILE_BYTES / (1024 * 1024)}MBを超えています`,
      });
      continue;
    }

    try {
      const result = await processAndSaveFile(
        file,
        docTitle,
        sourceType,
        sourceTypeOther,
        sourceUrl,
        description,
        openai
      );
      results.push({ index: i, title: docTitle, ...result });
      console.log(`[knowledge/upload] saved: "${docTitle}" (${result.chunk_count} chunks)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[knowledge/upload] error on file[${i}] "${docTitle}":`, msg);
      errors.push({ index: i, title: docTitle, error: msg });
    }
  }

  if (results.length === 0) {
    return NextResponse.json(
      { error: "すべてのファイルの処理に失敗しました", details: errors },
      { status: 422 }
    );
  }

  return NextResponse.json({
    success: true,
    document_count: results.length,
    total_chunk_count: results.reduce((s, r) => s + r.chunk_count, 0),
    documents: results,
    errors,
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
