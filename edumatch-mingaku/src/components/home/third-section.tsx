import Link from "next/link";
import { Building2, BookOpen, Calendar } from "lucide-react";

export function ThirdSection() {
  return (
    <section className="border rounded-lg bg-card p-4">
      <h2 className="text-lg font-bold mb-4">その他の情報</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 各社情報 → サービス一覧 */}
        <Link
          href="/services"
          className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">各社情報</h3>
            <p className="text-xs text-muted-foreground mt-0.5">教育関連サービス・教材の紹介</p>
          </div>
        </Link>

        {/* AIUEO（運営記事）→ 記事一覧 or 特集 */}
        <Link
          href="/articles"
          className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">AIUEO（運営記事）</h3>
            <p className="text-xs text-muted-foreground mt-0.5">運営からのお知らせ・特集記事</p>
          </div>
        </Link>

        {/* イベント情報 */}
        <Link
          href="/events"
          className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">イベント情報</h3>
            <p className="text-xs text-muted-foreground mt-0.5">セミナー・イベントのご案内</p>
          </div>
        </Link>
      </div>
    </section>
  );
}
