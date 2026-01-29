import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { getPopularServices } from "@/app/_actions";
import { createClient } from "@/utils/supabase/server";

const rankColors = [
  "bg-[#ef4444] text-white", // 1位: 赤
  "bg-[#f97316] text-white", // 2位: オレンジ
  "bg-[#f59e0b] text-white", // 3位: 黄色
  "bg-muted text-foreground", // 4位: グレー
  "bg-muted text-foreground", // 5位: グレー
];

export async function RightSidebar() {
  const services = await getPopularServices(5);
  
  // 認証状態をチェック
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAuthenticated = !!user;

  return (
    <aside className="space-y-4">
      {/* ログイン・登録エリア（未ログイン時のみ表示） */}
      {!isAuthenticated && (
        <div className="border rounded-lg bg-card p-4">
          <h3 className="text-sm font-bold mb-3">会員登録・ログイン</h3>
          <p className="text-xs text-muted-foreground mb-3">
            お気に入り登録やブックマーク機能が使えます
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild size="sm" className="w-full">
              <Link href="/login">新規登録（無料）</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link href="/login">ログイン</Link>
            </Button>
          </div>
        </div>
      )}

      {/* 人気サービスランキング */}
      <div className="border rounded-lg bg-card">
        <div className="p-3 border-b flex items-center gap-2">
          <Crown className="h-4 w-4 text-[#f59e0b]" />
          <h3 className="text-sm font-bold">人気サービスランキング</h3>
        </div>
        <div className="p-3">
          {services.length > 0 ? (
            <ul className="space-y-2.5">
              {services.map((service, index) => (
                <li key={service.id} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={`flex-shrink-0 h-6 w-6 flex items-center justify-center rounded text-xs font-bold ${rankColors[index] || rankColors[4]}`}
                  >
                    {index + 1}
                  </span>
                  <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden border bg-muted">
                    <Image
                      src={service.thumbnail_url || "https://placehold.co/120x120/e0f2fe/0369a1?text=No"}
                      alt={service.title}
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized
                    />
                  </div>
                  <Link
                    href={`/services/${service.id}`}
                    className="flex-1 hover:text-[#1d4ed8] transition-colors line-clamp-2"
                  >
                    {service.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground py-4">サービスがありません</p>
          )}
        </div>
        <div className="border-t p-3 text-center">
          <Link
            href="/services"
            className="text-sm text-[#1d4ed8] hover:underline font-medium"
          >
            もっと見る
          </Link>
        </div>
      </div>

      {/* バナーエリア（300x250） */}
      <div className="border rounded-lg bg-card overflow-hidden">
        <Link
          href="/contact"
          className="block relative h-64 bg-gradient-to-br from-primary/10 to-primary/5"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-lg font-bold mb-2">掲載企業募集中</h3>
            <p className="text-sm text-muted-foreground mb-4">
              EdTechサービスを
              <br />
              ご提供の企業様へ
            </p>
            <div className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              お問い合わせ
            </div>
          </div>
        </Link>
      </div>

      {/* その他リンク */}
      <div className="border rounded-lg bg-card">
        <div className="divide-y">
          <Link
            href="/about"
            className="block px-3 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            Edumatchについて
          </Link>
          <Link
            href="/terms"
            className="block px-3 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            利用規約
          </Link>
          <Link
            href="/privacy"
            className="block px-3 py-2.5 text-sm hover:bg-muted transition-colors"
          >
            プライバシーポリシー
          </Link>
        </div>
      </div>
    </aside>
  );
}
