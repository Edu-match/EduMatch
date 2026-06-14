"use client";

import { useState } from "react";
import {
  FileText,
  Trophy,
  MessageSquareHeart,
  ChevronRight,
  Loader2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

const PRESS_RELEASE_URL =
  "https://prtimes.jp/main/html/rd/p/000000046.000161501.html";
const AI_CHAMPIONSHIP_URL =
  "https://ai-ueo.org/2026/04/01/u18-ai-championship-2026/";

type LinkCard = {
  key: string;
  title: string;
  desc: string;
  href: string;
  Icon: LucideIcon;
  glow: string;
  tint: string;
};

const LINK_CARDS: LinkCard[] = [
  {
    key: "information",
    title: "インフォメーション",
    desc: "教育AIサミットのプレスリリースを見る",
    href: PRESS_RELEASE_URL,
    Icon: FileText,
    glow: "#3a90f0",
    tint: "rgba(80,160,255,0.14)",
  },
  {
    key: "championship",
    title: "AIチャンピオンシップ",
    desc: "U18 AIチャンピオンシップ 2026 の特設ページへ",
    href: AI_CHAMPIONSHIP_URL,
    Icon: Trophy,
    glow: "#e0a010",
    tint: "rgba(230,170,20,0.14)",
  },
];

function ExternalCard({ card }: { card: LinkCard }) {
  const { Icon } = card;
  return (
    <a
      href={card.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/[0.1]"
      style={{ boxShadow: `0 8px 30px -12px ${card.glow}55` }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{
          background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.35) 0%, ${card.tint} 60%, rgba(10,20,60,0.25) 100%)`,
          border: `1px solid ${card.glow}66`,
          boxShadow: `0 0 16px ${card.glow}55`,
        }}
      >
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 className="flex items-center gap-1 text-base font-bold text-white">
          {card.title}
          <ChevronRight className="h-4 w-4 opacity-60 transition-transform group-hover:translate-x-0.5" />
        </h3>
        <p className="mt-1 text-sm leading-snug text-white/65">{card.desc}</p>
      </div>
    </a>
  );
}

function VoiceForm() {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  const canSubmit = body.trim().length >= 10 && status !== "sending";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/kaikan/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: name, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "送信に失敗しました");
        setStatus("error");
        return;
      }
      setStatus("done");
      setName("");
      setBody("");
    } catch {
      setError("通信エラーが発生しました");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-8 text-center backdrop-blur">
        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
        <p className="text-base font-bold text-white">
          ご意見ありがとうございました
        </p>
        <p className="text-sm text-white/65">
          いただいた声は今後の活動の参考にさせていただきます。
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-1 text-sm font-medium text-indigo-300 underline-offset-2 hover:underline"
        >
          続けて投稿する
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur"
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{
          background:
            "radial-gradient(circle at 35% 28%, rgba(255,255,255,0.35) 0%, rgba(60,200,80,0.14) 60%, rgba(10,20,60,0.25) 100%)",
          border: "1px solid #38c03866",
          boxShadow: "0 0 16px #38c03855",
        }}
      >
        <MessageSquareHeart className="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 className="text-base font-bold text-white">ご意見・要望</h3>
        <p className="mt-1 text-sm leading-snug text-white/65">
          教育とAIについて、現場の声をお寄せください。
        </p>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="お名前・肩書き（任意）"
        maxLength={40}
        className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400/60 focus:outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="ご意見・ご要望（10文字以上）"
        rows={4}
        maxLength={500}
        className="resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400/60 focus:outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">{body.length} / 500</span>
        {error && <span className="text-xs text-rose-300">{error}</span>}
      </div>
      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-transform enabled:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "sending" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> 送信中…
          </>
        ) : (
          "送信する"
        )}
      </button>
    </form>
  );
}

export function KaikanHub() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {LINK_CARDS.map((card) => (
        <ExternalCard key={card.key} card={card} />
      ))}
      <VoiceForm />
    </div>
  );
}
