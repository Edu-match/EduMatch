import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isServiceCompareRadarEnabled } from "@/lib/deploy-branch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AXIS_KEYS = [
  "price",
  "functionality",
  "reliability",
  "usability",
  "integration",
  "customization",
] as const;

export type CompareAxisKey = (typeof AXIS_KEYS)[number];

export type CompareScoresPayload = Record<CompareAxisKey, number>;

function clampScore(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 50;
  return Math.max(0, Math.min(100, Math.round(x)));
}

function normalizeScores(raw: Record<string, unknown>): CompareScoresPayload {
  const out = {} as CompareScoresPayload;
  for (const k of AXIS_KEYS) {
    out[k] = clampScore(raw[k]);
  }
  return out;
}

function fallbackScores(): CompareScoresPayload {
  const out = {} as CompareScoresPayload;
  for (const k of AXIS_KEYS) out[k] = 50;
  return out;
}

async function loadServicesForCompare(ids: string[]) {
  const user = await getCurrentUser();
  const visibility = !user
    ? {
        AND: [
          { OR: [{ status: "APPROVED" as const }, { is_published: true }] },
          { is_member_only: false },
        ],
      }
    : { OR: [{ status: "APPROVED" as const }, { is_published: true }] };

  return prisma.service.findMany({
    where: {
      id: { in: ids },
      ...visibility,
    },
    select: {
      id: true,
      title: true,
      description: true,
      content: true,
      category: true,
      price_info: true,
      tags: true,
      provider_display_name: true,
    },
  });
}

async function scoreOneService(service: {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  price_info: string;
  tags: string[];
  provider_display_name: string | null;
}): Promise<CompareScoresPayload> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackScores();

  const openai = new OpenAI({ apiKey });
  const text = [
    `タイトル: ${service.title}`,
    `カテゴリ: ${service.category}`,
    `価格表示: ${service.price_info}`,
    `タグ: ${(service.tags ?? []).join(", ")}`,
    `提供者表示名: ${service.provider_display_name ?? ""}`,
    `概要: ${service.description.slice(0, 4000)}`,
    `本文・ブロック等（抜粋）: ${service.content.slice(0, 8000)}`,
  ].join("\n");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `あなたは教育ICTサービスの比較分析者です。与えられたサービス掲載文のみに基づき、次の6項目をそれぞれ0〜100の整数で評価してください。記載が乏しい項目は低めに。根拠のない水増しは禁止。
出力は必ず次のキーだけを持つJSONオブジェクト1つ: price, functionality, reliability, usability, integration, customization
意味: price=価格・料金の明瞭さ・妥当性, functionality=機能・性能, reliability=信頼性・サポート, usability=使いやすさ, integration=他システム連携性, customization=カスタマイズ性`,
      },
      { role: "user", content: text },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) return fallbackScores();
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return normalizeScores(parsed);
  } catch {
    return fallbackScores();
  }
}

export async function POST(req: NextRequest) {
  if (!isServiceCompareRadarEnabled()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as { serviceIds?: string[] };
    const ids = Array.isArray(body.serviceIds) ? body.serviceIds.filter((x) => typeof x === "string") : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "serviceIds required" }, { status: 400 });
    }
    if (ids.length > 5) {
      return NextResponse.json({ error: "Too many services" }, { status: 400 });
    }

    const services = await loadServicesForCompare(ids);
    if (services.length !== ids.length) {
      return NextResponse.json({ error: "Some services not found or not visible" }, { status: 404 });
    }

    const scores: Record<string, CompareScoresPayload> = {};
    await Promise.all(
      services.map(async (s) => {
        scores[s.id] = await scoreOneService(s);
      })
    );

    return NextResponse.json({ scores });
  } catch (e) {
    console.error("[compare/scores]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
