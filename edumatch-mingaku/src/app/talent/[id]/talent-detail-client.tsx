"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  ExternalLink,
  GraduationCap,
  Globe,
  Lightbulb,
  MapPin,
  MessageCircle,
  Mic,
  PenLine,
  Sparkles,
  Star,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TalentProfile } from "@/app/_actions/talent";

const REQUEST_TYPES: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  lecture:    { icon: Mic,           label: "講演依頼",            color: "bg-blue-50 text-blue-700 border-blue-200" },
  teaching:   { icon: GraduationCap, label: "講師依頼",            color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  work:       { icon: Briefcase,     label: "仕事依頼",            color: "bg-violet-50 text-violet-700 border-violet-200" },
  workshop:   { icon: Users,         label: "研修・ワークショップ", color: "bg-orange-50 text-orange-700 border-orange-200" },
  advisor:    { icon: Lightbulb,     label: "顧問・アドバイザー",  color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  consulting: { icon: Briefcase,     label: "コンサルティング",    color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  writing:    { icon: PenLine,       label: "執筆・寄稿",          color: "bg-pink-50 text-pink-700 border-pink-200" },
};

import React from "react";

export default function TalentDetailClient({ profile }: { profile: TalentProfile }) {
  const isIndividual = profile.type === "individual";

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ヘッダー */}
      <div className={cn(
        "border-b",
        isIndividual ? "bg-gradient-to-br from-sky-50 to-indigo-50" : "bg-gradient-to-br from-amber-50 to-orange-50"
      )}>
        <div className="container max-w-3xl py-6">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4 text-muted-foreground">
            <Link href="/talent">
              <ArrowLeft className="h-4 w-4 mr-1" />
              人材マッチング一覧へ
            </Link>
          </Button>

          <div className="flex items-start gap-5">
            {/* アバター */}
            <div className={cn(
              "w-20 h-20 rounded-2xl overflow-hidden border-2 flex items-center justify-center flex-shrink-0",
              isIndividual ? "border-sky-200 bg-sky-100" : "border-amber-200 bg-amber-100"
            )}>
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : isIndividual ? (
                <User className="h-10 w-10 text-sky-400" />
              ) : (
                <Building2 className="h-10 w-10 text-amber-400" />
              )}
            </div>

            {/* プロフィール情報 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{profile.name}</h1>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border mt-1",
                  isIndividual ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {isIndividual
                    ? <><User className="h-3 w-3" /> {profile.organization_type ?? "専門家・講師"}</>
                    : <><Building2 className="h-3 w-3" /> {profile.organization_type ?? "企業・団体"}</>
                  }
                </span>
                {profile.ai_kentei_passed && (
                  <span
                    title="AI検定 合格者"
                    className="inline-flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 mt-1"
                  >
                    <Sparkles className="h-3 w-3" />AI検定合格
                  </span>
                )}
              </div>
              {profile.organization && (
                <p className="text-sm text-muted-foreground mt-1">{profile.organization}</p>
              )}
              {profile.organization_type && (
                <Badge variant="secondary" className="mt-2 text-xs">{profile.organization_type}</Badge>
              )}
              {profile.prefecture && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {profile.prefecture}
                </div>
              )}
            </div>
          </div>

          {/* 受け付けバッジ */}
          {profile.talent_badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.talent_badges.map((badge) => {
                const bt = REQUEST_TYPES[badge];
                if (!bt) return null;
                const Icon = bt.icon;
                return (
                  <span
                    key={badge}
                    className={cn(
                      "inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1.5 border",
                      bt.color
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {bt.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="container max-w-3xl py-8 space-y-6">
        {/* 自己PR */}
        {(profile.talent_matching_description || profile.bio) && (
          <section className="rounded-xl border bg-background p-6">
            <h2 className="text-sm font-semibold mb-3">自己PR・対応できる依頼内容</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {profile.talent_matching_description ?? profile.bio}
            </p>
          </section>
        )}

        {/* 関心・専門分野 */}
        {profile.interests.length > 0 && (
          <section className="rounded-xl border bg-background p-6">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-500" />
              専門・関心分野
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <span
                  key={interest}
                  className="inline-flex items-center gap-1 text-xs font-medium rounded-full px-3 py-1 bg-muted text-muted-foreground border"
                >
                  {interest}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 提供サービス */}
        {profile.services.length > 0 && (
          <section className="rounded-xl border bg-background p-6">
            <h2 className="text-sm font-semibold mb-3">提供サービス・商品</h2>
            <ul className="space-y-2">
              {profile.services.map((sv) => (
                <li key={sv.id}>
                  <Link
                    href={`/services/${sv.id}`}
                    className="flex items-center gap-2 text-sm text-primary hover:underline group"
                  >
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 group-hover:text-primary transition-colors" />
                    <span>{sv.title}</span>
                    {sv.category && (
                      <Badge variant="secondary" className="text-[10px] py-0 h-4 ml-auto">{sv.category}</Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTAエリア */}
        <section className="rounded-xl border bg-background p-6 space-y-3">
          <h2 className="text-sm font-semibold">依頼・お問い合わせ</h2>
          <p className="text-xs text-muted-foreground">
            講演・講師・研修・執筆・コンサルティングなどはこちらからお申し込みください。
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2">
              <Link href={`/talent/${profile.id}/request`}>
                <MessageCircle className="h-4 w-4" />
                依頼する
              </Link>
            </Button>
            {profile.website && (
              <Button variant="outline" asChild className="gap-2">
                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" />
                  公式サイト
                </a>
              </Button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
