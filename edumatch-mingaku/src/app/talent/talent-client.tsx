"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  MapPin,
  Mic,
  GraduationCap,
  Briefcase,
  Building2,
  User,
  Globe,
  ChevronRight,
  SlidersHorizontal,
  Users,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TalentProfile } from "@/app/_actions/talent";

// ─── 都道府県 ────────────────────────────────────────────────────────────────
const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

// ─── 依頼種別バッジ ──────────────────────────────────────────────────────────
const REQUEST_TYPES: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  lecture:  { icon: Mic,            label: "講演依頼", color: "bg-blue-50 text-blue-700 border-blue-200" },
  teaching: { icon: GraduationCap,  label: "講師依頼", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  work:     { icon: Briefcase,      label: "仕事依頼", color: "bg-violet-50 text-violet-700 border-violet-200" },
};

type FilterType = "all" | "individual" | "corporate";

type Props = { profiles: TalentProfile[] };

export default function TalentClientPage({ profiles }: Props) {
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [prefecture, setPrefecture] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const availablePrefectures = useMemo(() => {
    const set = new Set(profiles.map((p) => p.prefecture).filter((p): p is string => !!p));
    return PREFECTURES.filter((p) => set.has(p));
  }, [profiles]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return profiles.filter((p) => {
      const matchType = filterType === "all" || p.type === filterType;
      const matchPref = prefecture === "all" || p.prefecture === prefecture;
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.organization ?? "").toLowerCase().includes(q) ||
        (p.talent_matching_description ?? "").toLowerCase().includes(q) ||
        (p.bio ?? "").toLowerCase().includes(q) ||
        p.interests.some((i) => i.toLowerCase().includes(q));
      return matchType && matchPref && matchQuery;
    });
  }, [profiles, query, filterType, prefecture]);

  const individualCount = profiles.filter((p) => p.type === "individual").length;
  const corporateCount = profiles.filter((p) => p.type === "corporate").length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* ─── ヒーローセクション ─── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80">
        {/* 背景装飾 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
        </div>

        <div className="relative container max-w-6xl py-12 md:py-16">
          <div className="flex items-start gap-4 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center flex-shrink-0 border border-white/20">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                人材マッチング
              </h1>
              <p className="text-primary-foreground/70 text-sm mt-1">
                Education Talent Network
              </p>
            </div>
          </div>

          <p className="text-white/85 text-base md:text-lg max-w-2xl leading-relaxed mb-8">
            教育分野の専門家・事業者と、依頼したい方をつなぐプラットフォームです。
            <br className="hidden md:block" />
            <span className="inline-flex flex-wrap gap-3 mt-2">
              {Object.values(REQUEST_TYPES).map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-sm bg-white/15 rounded-full px-3 py-1 border border-white/20">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
            </span>
          </p>

          {/* スタッツ */}
          <div className="flex flex-wrap gap-4">
            {[
              { label: "専門家・講師", value: individualCount },
              { label: "企業・団体", value: corporateCount },
              { label: "掲載中", value: profiles.length },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl px-4 py-2.5 border border-white/15">
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-white/70">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container max-w-6xl py-8">
        {/* ─── 検索・フィルタバー ─── */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6 space-y-3">
          {/* 検索 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="名前・専門分野・キーワードで検索..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-0 focus-visible:ring-1 h-11"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                filtersOpen
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground border-transparent"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              絞り込み
            </button>
          </div>

          {/* タイプフィルタ（常時表示） */}
          <div className="flex gap-2 flex-wrap">
            {(
              [
                { value: "all", label: "すべて", count: profiles.length },
                { value: "individual", label: "専門家・講師", count: individualCount },
                { value: "corporate", label: "企業・団体", count: corporateCount },
              ] as const
            ).map(({ value, label, count }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilterType(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all border",
                  filterType === value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:border-primary/30 hover:text-foreground"
                )}
              >
                {label}
                <span className={cn(
                  "text-xs rounded-full px-1.5 py-0.5",
                  filterType === value ? "bg-white/20" : "bg-muted"
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* 都道府県フィルタ（開閉式） */}
          {filtersOpen && availablePrefectures.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> 地域
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setPrefecture("all")}
                  className={cn(
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium border flex-shrink-0 transition-colors",
                    prefecture === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  すべての地域
                </button>
                {availablePrefectures.map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => setPrefecture(pref)}
                    className={cn(
                      "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium border flex-shrink-0 transition-colors",
                      prefecture === pref
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40"
                    )}
                  >
                    {pref}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 件数 */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{filtered.length}</span> 件
          </p>
          {(query || filterType !== "all" || prefecture !== "all") && (
            <button
              type="button"
              onClick={() => { setQuery(""); setFilterType("all"); setPrefecture("all"); }}
              className="text-xs text-primary underline underline-offset-2"
            >
              フィルタをリセット
            </button>
          )}
        </div>

        {/* ─── カードグリッド ─── */}
        {filtered.length === 0 ? (
          <EmptyState hasProfiles={profiles.length > 0} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((profile) => (
              <TalentCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 個別カード ───────────────────────────────────────────────────────────────

function TalentCard({ profile }: { profile: TalentProfile }) {
  const isIndividual = profile.type === "individual";

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* タイプバッジ */}
      <div className="absolute top-3 right-3 z-10">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border",
            isIndividual
              ? "bg-sky-50 text-sky-700 border-sky-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          )}
        >
          {isIndividual ? (
            <><User className="h-3 w-3" /> 専門家・講師</>
          ) : (
            <><Building2 className="h-3 w-3" /> 企業・団体</>
          )}
        </span>
      </div>

      {/* ヘッダー */}
      <div className={cn(
        "relative px-5 pt-5 pb-4",
        isIndividual
          ? "bg-gradient-to-br from-sky-50 to-indigo-50"
          : "bg-gradient-to-br from-amber-50 to-orange-50"
      )}>
        <div className="flex items-start gap-4 pr-20">
          {/* アバター */}
          <div className="relative flex-shrink-0">
            <div className={cn(
              "w-16 h-16 rounded-2xl overflow-hidden border-2 flex items-center justify-center",
              isIndividual ? "border-sky-200 bg-sky-100" : "border-amber-200 bg-amber-100"
            )}>
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : isIndividual ? (
                <User className="h-8 w-8 text-sky-400" />
              ) : (
                <Building2 className="h-8 w-8 text-amber-400" />
              )}
            </div>
          </div>

          {/* 名前・所属 */}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base leading-tight line-clamp-1 text-foreground">
              {profile.name}
            </h2>
            {profile.organization && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {profile.organization}
              </p>
            )}
            {profile.organization_type && (
              <Badge variant="secondary" className="mt-1.5 text-[10px] py-0 h-4">
                {profile.organization_type}
              </Badge>
            )}
          </div>
        </div>

        {/* 地域 */}
        {profile.prefecture && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {profile.prefecture}
          </div>
        )}
      </div>

      {/* ボディ */}
      <div className="flex flex-col flex-1 px-5 py-4 gap-3">
        {/* 自己PR / bio */}
        {(profile.talent_matching_description || profile.bio) && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {profile.talent_matching_description ?? profile.bio}
          </p>
        )}

        {/* 関心・専門分野タグ */}
        {profile.interests.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {profile.interests.slice(0, 4).map((interest) => (
              <span
                key={interest}
                className="inline-flex items-center gap-0.5 text-[10px] font-medium rounded-full px-2 py-0.5 bg-muted text-muted-foreground border"
              >
                <Star className="h-2.5 w-2.5" />
                {interest}
              </span>
            ))}
            {profile.interests.length > 4 && (
              <span className="text-[10px] text-muted-foreground px-1">
                +{profile.interests.length - 4}
              </span>
            )}
          </div>
        )}

        {/* 掲載サービス */}
        {profile.services.length > 0 && (
          <div className="space-y-1 pt-1 border-t">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              提供サービス
            </p>
            <ul className="space-y-0.5">
              {profile.services.slice(0, 2).map((sv) => (
                <li key={sv.id}>
                  <Link
                    href={`/services/${sv.id}`}
                    className="text-xs text-primary hover:underline line-clamp-1"
                  >
                    {sv.title}
                  </Link>
                </li>
              ))}
              {profile.services.length > 2 && (
                <li className="text-xs text-muted-foreground">
                  他 {profile.services.length - 2} 件
                </li>
              )}
            </ul>
          </div>
        )}

        {/* 依頼種別バッジ */}
        {(profile.talent_badges?.length > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {profile.talent_badges.map((badge) => {
              const bt = REQUEST_TYPES[badge];
              if (!bt) return null;
              const Icon = bt.icon;
              return (
                <span
                  key={badge}
                  className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 border",
                    bt.color
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {bt.label}
                </span>
              );
            })}
          </div>
        )}

        {/* CTAボタン */}
        <div className="mt-auto pt-3">
          <Button asChild size="sm" className="w-full group/btn">
            <Link href={`/talent/${profile.id}`}>
              プロフィールを見る・依頼する
              <ChevronRight className="h-3.5 w-3.5 ml-1 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Globe className="h-3 w-3" />
              公式サイト
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 空状態 ──────────────────────────────────────────────────────────────────

function EmptyState({ hasProfiles }: { hasProfiles: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="h-20 w-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-5">
        <Users className="h-10 w-10 text-muted-foreground/40" />
      </div>
      <p className="text-xl font-semibold text-foreground mb-2">
        {hasProfiles ? "条件に合う方が見つかりません" : "現在掲載中のプロフィールはありません"}
      </p>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasProfiles
          ? "検索条件を変えてお試しください"
          : "人材マッチングへの登録が増えると、ここに表示されます。"}
      </p>
    </div>
  );
}
