"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MessageSquare, Clock } from "lucide-react";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { setMyPersonaActive } from "@/app/_actions/persona-admin";

export type MyPersonaCardData = {
  displayName: string;
  avatarUrl: string | null;
  expertise: string[];
  valuesText: string;
  isActive: boolean;
  replyCount: number;
  lastRepliedAt: string | null;
};

/** 自分のAIペルソナのプロフィールカード：アバター・専門タグ・価値観・自動返信トグル・統計。 */
export function AdminMyPersonaCard({ persona }: { persona: MyPersonaCardData }) {
  const router = useRouter();
  const [active, setActive] = useState(persona.isActive);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aiName = persona.displayName.startsWith("AI") ? persona.displayName : `AI${persona.displayName}`;

  async function handleToggle(next: boolean) {
    setToggling(true);
    setError(null);
    setActive(next); // 楽観的更新
    const res = await setMyPersonaActive(next);
    setToggling(false);
    if (!res.ok) {
      setActive(!next);
      setError(res.error ?? "更新に失敗しました");
    } else {
      router.refresh();
    }
  }

  return (
    <div className="mb-3 overflow-hidden rounded-xl border bg-card">
      <div className="flex items-start gap-4 p-4">
        {persona.avatarUrl ? (
          <Image src={persona.avatarUrl} alt="" width={64} height={64} className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-primary/20" unoptimized />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-full bg-muted ring-2 ring-primary/10" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-bold">{aiName}</p>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-bold ${active ? "text-emerald-600" : "text-muted-foreground"}`}>
                自動返信 {active ? "有効" : "オフ"}
              </span>
              <ToggleSwitch checked={active} onCheckedChange={handleToggle} disabled={toggling} />
            </div>
          </div>

          {persona.expertise.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {persona.expertise.map((tag) => (
                <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {persona.valuesText && (
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">{persona.valuesText}</p>
          )}

          {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
        </div>
      </div>

      {/* 統計 */}
      <div className="flex divide-x border-t bg-muted/30 text-xs">
        <div className="flex flex-1 items-center gap-1.5 px-4 py-2.5 text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          返信数 <span className="font-bold text-foreground">{persona.replyCount.toLocaleString()}</span>
        </div>
        <div className="flex flex-1 items-center gap-1.5 px-4 py-2.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          最終返信{" "}
          <span className="font-bold text-foreground">
            {persona.lastRepliedAt
              ? new Date(persona.lastRepliedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
