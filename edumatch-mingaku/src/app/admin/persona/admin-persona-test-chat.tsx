"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, MessageCircleMore, Sparkles, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { generatePersonaTestReply } from "@/app/_actions/persona-admin";

const SAMPLE_POSTS = [
  "子どもがタブレット学習ばかりで、紙のノートを使わなくなりました。このままで大丈夫でしょうか？",
  "探究学習のテーマがなかなか決まらない生徒に、どう声をかけるのが良いと思いますか？",
  "教員の働き方改革、現場では実際どこから手をつけるべきだと思いますか？",
];

type Turn = { role: "user" | "persona"; text: string };

/**
 * テスト会話パネル：サンプル投稿を入力し、ペルソナの声で返信を試せる。
 * フォーラムには一切投稿されない。プロンプト調整のプレビュー用。
 */
export function AdminPersonaTestChat({
  personaName,
  personaAvatarUrl,
}: {
  personaName: string;
  personaAvatarUrl: string | null;
}) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    const body = input.trim();
    if (!body || generating) return;
    setGenerating(true);
    setError(null);
    setTurns((prev) => [...prev, { role: "user", text: body }]);
    setInput("");
    const res = await generatePersonaTestReply(body);
    setGenerating(false);
    if (res.ok && res.text) {
      setTurns((prev) => [...prev, { role: "persona", text: res.text! }]);
    } else {
      setError(res.error ?? "生成に失敗しました");
    }
  }

  function reset() {
    setTurns([]);
    setError(null);
    setInput("");
  }

  return (
    <div className="mb-3 rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold">
            <MessageCircleMore className="h-4 w-4 text-primary" />テスト会話
          </p>
          <p className="text-[11px] text-muted-foreground">
            ペルソナの返信をテストできます（実際には投稿されません）
          </p>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={reset}
            disabled={generating}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-50"
          >
            <RotateCcw className="h-3 w-3" />クリア
          </button>
        )}
      </div>

      <div className="p-4">
        {/* 会話履歴 */}
        {(turns.length > 0 || generating) && (
          <div className="mb-4 space-y-3">
            {turns.map((t, i) =>
              t.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap break-words">
                    {t.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex items-end gap-2">
                  {personaAvatarUrl ? (
                    <Image src={personaAvatarUrl} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" unoptimized />
                  ) : (
                    <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
                  )}
                  <div className="max-w-[85%]">
                    <p className="mb-0.5 ml-1 text-[10px] font-bold text-muted-foreground">{personaName}</p>
                    <div className="rounded-2xl rounded-bl-sm border bg-muted/50 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {t.text}
                    </div>
                  </div>
                </div>
              ),
            )}
            {generating && (
              <div className="flex items-end gap-2">
                {personaAvatarUrl ? (
                  <Image src={personaAvatarUrl} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover" unoptimized />
                ) : (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-muted" />
                )}
                <div className="w-[70%] space-y-2 rounded-2xl rounded-bl-sm border bg-muted/50 px-3.5 py-3">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

        {/* サンプル投稿 */}
        {turns.length === 0 && !generating && (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">よくある質問で試す（クリックで入力欄にセット）</p>
            <div className="flex flex-col gap-1.5">
              {SAMPLE_POSTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s)}
                  className="rounded-lg border bg-background px-3 py-2 text-left text-xs text-foreground/80 transition hover:border-primary/50 hover:bg-primary/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 入力 */}
        <div className="space-y-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="フォーラムに投稿されそうな文章を入力…"
            className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{input.length} / 2000</span>
            <button
              type="button"
              onClick={generate}
              disabled={generating || !input.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {generating ? "生成中…" : "テスト生成"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
