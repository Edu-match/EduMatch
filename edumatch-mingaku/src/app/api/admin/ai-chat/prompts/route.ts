import { NextResponse } from "next/server";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import {
  getAiChatPrompts,
  isAiMode,
  resetAiChatPrompt,
  saveAiChatPrompt,
} from "@/lib/ai-chat-prompts";

export const dynamic = "force-dynamic";

async function requireAdminApi() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const profile = await getCurrentProfile();
  if (profile?.role !== "ADMIN") {
    return NextResponse.json({ error: "ADMIN権限が必要です" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const prompts = await getAiChatPrompts();
  return NextResponse.json({ prompts });
}

export async function PATCH(request: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;
  const profile = await getCurrentProfile();

  let body: { mode?: string; prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON が不正です" }, { status: 400 });
  }

  const mode = body.mode ?? "";
  const prompt = (body.prompt ?? "").trim();
  if (!isAiMode(mode)) return NextResponse.json({ error: "mode が不正です" }, { status: 400 });
  if (!prompt) return NextResponse.json({ error: "prompt は必須です" }, { status: 400 });

  await saveAiChatPrompt(mode, prompt, profile?.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "";
  if (!isAiMode(mode)) return NextResponse.json({ error: "mode が不正です" }, { status: 400 });

  await resetAiChatPrompt(mode);
  return NextResponse.json({ ok: true });
}
