"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  CheckCircle2,
  GraduationCap,
  Lightbulb,
  Loader2,
  Mic,
  PenLine,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { TalentProfile } from "@/app/_actions/talent";

const ALL_REQUEST_TYPES: Record<string, { icon: React.ElementType; label: string }> = {
  lecture:    { icon: Mic,           label: "講演依頼" },
  teaching:   { icon: GraduationCap, label: "講師依頼" },
  work:       { icon: Briefcase,     label: "仕事依頼" },
  workshop:   { icon: Users,         label: "研修・ワークショップ" },
  advisor:    { icon: Lightbulb,     label: "顧問・アドバイザー" },
  consulting: { icon: Briefcase,     label: "コンサルティング" },
  writing:    { icon: PenLine,       label: "執筆・寄稿" },
};

type FormState = {
  requestType: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  message: string;
};

export default function TalentRequestForm({
  profile,
  currentUserName,
  currentUserEmail,
}: {
  profile: TalentProfile;
  currentUserName?: string;
  currentUserEmail?: string;
}) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    requestType: profile.talent_badges[0] ?? "",
    name: currentUserName ?? "",
    email: currentUserEmail ?? "",
    phone: "",
    organization: "",
    message: "",
  });

  // Available types: talent's accepted badges (or all if none specified)
  const availableTypes =
    profile.talent_badges.length > 0
      ? profile.talent_badges.filter((b) => ALL_REQUEST_TYPES[b])
      : Object.keys(ALL_REQUEST_TYPES);

  const set = (key: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.requestType || !form.message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/talent/${profile.id}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesterName: form.name.trim(),
          requesterEmail: form.email.trim(),
          requesterPhone: form.phone.trim() || null,
          requesterOrg: form.organization.trim() || null,
          requestType: form.requestType,
          message: form.message.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "送信に失敗しました");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-background p-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <h2 className="text-xl font-bold">依頼を送信しました</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {profile.name}さんへの依頼が送信されました。
          内容を確認のうえ、ご連絡いたします。
        </p>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={() => router.push(`/talent/${profile.id}`)}>
            プロフィールに戻る
          </Button>
          <Button onClick={() => router.push("/talent")}>
            一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 依頼種別 */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">
          依頼の種類 <span className="text-destructive">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {availableTypes.map((key) => {
            const t = ALL_REQUEST_TYPES[key];
            if (!t) return null;
            const Icon = t.icon;
            const selected = form.requestType === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setForm((p) => ({ ...p, requestType: key }))}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
                  selected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 依頼者情報 */}
      <div className="rounded-xl border bg-background p-5 space-y-4">
        <h3 className="text-sm font-semibold">ご依頼者情報</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              お名前 <span className="text-destructive">*</span>
            </Label>
            <Input id="name" value={form.name} onChange={set("name")} placeholder="山田 太郎" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">
              メールアドレス <span className="text-destructive">*</span>
            </Label>
            <Input id="email" type="email" value={form.email} onChange={set("email")} placeholder="example@email.com" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">電話番号（任意）</Label>
            <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} placeholder="090-0000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organization">所属・組織名（任意）</Label>
            <Input id="organization" value={form.organization} onChange={set("organization")} placeholder="○○学校・○○株式会社" />
          </div>
        </div>
      </div>

      {/* 依頼内容 */}
      <div className="space-y-1.5">
        <Label htmlFor="message">
          依頼内容・詳細 <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="message"
          rows={6}
          value={form.message}
          onChange={set("message")}
          placeholder={`依頼の目的、日程（例: 2026年○月ごろ）、場所、参加人数、ご要望など詳しくご記入ください。`}
          className="resize-none"
          required
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          キャンセル
        </Button>
        <Button
          type="submit"
          disabled={submitting || !form.name || !form.email || !form.requestType || !form.message}
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          依頼を送信する
        </Button>
      </div>
    </form>
  );
}
