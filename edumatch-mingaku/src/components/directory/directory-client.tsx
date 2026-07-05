"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Award, MessageCircle, Check, Loader2, Users } from "lucide-react";
import { setDirectoryOptIn, type DirectoryMember, type MyDirectoryStatus } from "@/app/_actions/directory";

function MemberCard({ m }: { m: DirectoryMember }) {
  return (
    <li className="flex flex-col rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        {m.avatar_url ? (
          <Image src={m.avatar_url} alt={m.name} width={48} height={48} className="h-12 w-12 rounded-full object-cover" unoptimized />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold">{m.name}</p>
            {m.ai_kentei_passed && (
              <span title="生成AI活用ガイドライン検定 合格">
                <Award className="h-4 w-4 shrink-0 text-amber-500" />
              </span>
            )}
          </div>
          {m.role_label && (
            <Badge variant="secondary" className="mt-0.5 font-normal">
              {m.role_label}
            </Badge>
          )}
        </div>
      </div>

      {m.bio && <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{m.bio}</p>}

      {m.interests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {m.interests.slice(0, 6).map((i) => (
            <span key={i} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              #{i}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Button asChild size="sm" variant="outline">
          <Link href="/forum">
            <MessageCircle className="mr-1 h-4 w-4" /> 教育のひろばで話す
          </Link>
        </Button>
      </div>
    </li>
  );
}

function OptInCard({ status }: { status: MyDirectoryStatus }) {
  const router = useRouter();
  const [optIn, setOptIn] = useState(status.optIn);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !optIn;
    startTransition(async () => {
      const res = await setDirectoryOptIn(next);
      if (res.success) {
        setOptIn(next);
        router.refresh();
      }
    });
  }

  const incomplete = !status.bio && status.interests.length === 0;

  return (
    <div className="mb-6 rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">
            {optIn ? "あなたは名鑑に掲載されています" : "名鑑に載って、つながりを増やしませんか？"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            掲載されるのは名前・立場・自己紹介・関心のみ。連絡先は公開されません。いつでも取り下げられます。
          </p>
          {optIn && incomplete && (
            <p className="mt-1 text-sm text-amber-600">
              自己紹介・関心を設定すると、あなたに合う人から見つけてもらいやすくなります（プロフィール編集から）。
            </p>
          )}
        </div>
        <Button onClick={toggle} disabled={pending} variant={optIn ? "outline" : "default"}>
          {pending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : optIn ? (
            <Check className="mr-1 h-4 w-4" />
          ) : null}
          {optIn ? "掲載を取り下げる" : "名鑑に掲載する"}
        </Button>
      </div>
    </div>
  );
}

export function DirectoryClient({
  members,
  interests,
  myStatus,
}: {
  members: DirectoryMember[];
  interests: string[];
  myStatus: MyDirectoryStatus | null;
}) {
  const [activeInterest, setActiveInterest] = useState<string | null>(null);

  const filtered = useMemo(
    () => (activeInterest ? members.filter((m) => m.interests.includes(activeInterest)) : members),
    [members, activeInterest]
  );

  return (
    <div>
      {myStatus && <OptInCard status={myStatus} />}

      {interests.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveInterest(null)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              activeInterest === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            すべて
          </button>
          {interests.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveInterest(i)}
              className={`rounded-full px-3 py-1 text-sm transition-colors ${
                activeInterest === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              #{i}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p>{activeInterest ? "この関心のメンバーはまだいません。" : "まだ掲載メンバーがいません。最初の一人になりませんか？"}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MemberCard key={m.id} m={m} />
          ))}
        </ul>
      )}
    </div>
  );
}
