"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building2,
  MapPin,
  Search,
  ExternalLink,
  Briefcase,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TalentCompany } from "@/app/_actions/talent";

// ─── 都道府県リスト ────────────────────────────────────────────────────────────
const PREFECTURES = [
  "北海道","青森県","岩手県","宮城県","秋田県","山形県","福島県",
  "茨城県","栃木県","群馬県","埼玉県","千葉県","東京都","神奈川県",
  "新潟県","富山県","石川県","福井県","山梨県","長野県","岐阜県",
  "静岡県","愛知県","三重県","滋賀県","京都府","大阪府","兵庫県",
  "奈良県","和歌山県","鳥取県","島根県","岡山県","広島県","山口県",
  "徳島県","香川県","愛媛県","高知県","福岡県","佐賀県","長崎県",
  "熊本県","大分県","宮崎県","鹿児島県","沖縄県",
];

type Props = { companies: TalentCompany[] };

export default function TalentClientPage({ companies }: Props) {
  const [query, setQuery] = useState("");
  const [prefecture, setPrefecture] = useState("all");

  // 都道府県の選択肢（掲載企業が持つものだけ表示）
  const availablePrefectures = useMemo(() => {
    const set = new Set(
      companies.map((c) => c.prefecture).filter((p): p is string => !!p)
    );
    return PREFECTURES.filter((p) => set.has(p));
  }, [companies]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return companies.filter((c) => {
      const name = c.profile.name.toLowerCase();
      const org = (c.organization ?? "").toLowerCase();
      const desc = (c.talent_matching_description ?? "").toLowerCase();
      const bio = (c.profile.bio ?? "").toLowerCase();
      const matchQuery =
        !q ||
        name.includes(q) ||
        org.includes(q) ||
        desc.includes(q) ||
        bio.includes(q);
      const matchPref =
        prefecture === "all" || c.prefecture === prefecture;
      return matchQuery && matchPref;
    });
  }, [companies, query, prefecture]);

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ヒーロー */}
      <div className="bg-background border-b">
        <div className="container max-w-6xl py-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">人材マッチング</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-2xl">
            教育業界で採用を行っている事業者と、教育分野で活躍したい方をつなぐサービスです。
            掲載企業のプロフィールや取り組みを確認し、気になる企業へお問い合わせください。
          </p>
        </div>
      </div>

      <div className="container max-w-6xl py-6">
        {/* フィルタ */}
        <div className="mb-6 space-y-2">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="企業名・キーワードで検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {availablePrefectures.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setPrefecture("all")}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors border flex-shrink-0",
                  prefecture === "all"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
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
                    "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors border flex-shrink-0",
                    prefecture === pref
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  )}
                >
                  {pref}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 件数 */}
        <p className="text-xs text-muted-foreground mb-4">
          {filtered.length} 件の企業が掲載中
        </p>

        {/* カードグリッド */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Users className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-1">
              {companies.length === 0
                ? "現在掲載中の企業はありません"
                : "条件に合う企業が見つかりません"}
            </p>
            {companies.length === 0 ? (
              <p className="text-sm text-muted-foreground/60">
                人材マッチングへの参加企業が増えると、ここに表示されます。
              </p>
            ) : (
              <button
                type="button"
                onClick={() => { setQuery(""); setPrefecture("all"); }}
                className="mt-3 text-sm text-primary underline underline-offset-2"
              >
                フィルタをリセット
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 企業カード ─────────────────────────────────────────────────────────────────

function CompanyCard({ company }: { company: TalentCompany }) {
  const profile = company.profile;
  const displayName = company.organization || company.legal_name || profile.name;

  return (
    <div className="flex flex-col rounded-xl border bg-background shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* ヘッダー帯 */}
      <div className="bg-muted/40 px-5 py-4 flex items-center gap-4">
        {/* アバター */}
        <div className="relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border bg-muted flex items-center justify-center">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <Building2 className="h-7 w-7 text-muted-foreground" />
          )}
        </div>

        {/* 企業名 */}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base leading-tight line-clamp-2">
            {profile.name}
          </h2>
          {displayName !== profile.name && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {displayName}
            </p>
          )}
        </div>
      </div>

      {/* ボディ */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* 地域・業種 */}
        <div className="flex flex-wrap gap-2">
          {company.prefecture && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {company.prefecture}
            </span>
          )}
          {company.organization_type && (
            <Badge variant="secondary" className="text-xs">
              {company.organization_type}
            </Badge>
          )}
        </div>

        {/* 採用メッセージ or 企業bio */}
        {(company.talent_matching_description || profile.bio) && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {company.talent_matching_description ?? profile.bio}
          </p>
        )}

        {/* 掲載サービス */}
        {profile.services.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> 提供サービス
            </p>
            <ul className="space-y-0.5">
              {profile.services.slice(0, 3).map((sv) => (
                <li key={sv.id}>
                  <Link
                    href={`/services/${sv.id}`}
                    className="text-xs text-primary hover:underline line-clamp-1"
                  >
                    {sv.title}
                  </Link>
                </li>
              ))}
              {profile.services.length > 3 && (
                <li className="text-xs text-muted-foreground">
                  他 {profile.services.length - 3} 件
                </li>
              )}
            </ul>
          </div>
        )}

        {/* フッターボタン */}
        <div className="mt-auto pt-3 flex gap-2">
          <Button asChild size="sm" className="flex-1">
            <Link href={`/profile/${profile.id}`}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              企業ページを見る
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
