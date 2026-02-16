import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { RequestListClient } from "./request-list-client";

export const dynamic = "force-dynamic";

export default function RequestListPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
      <div className="border-b bg-card/50 sticky top-0 z-10">
        <div className="container px-4 sm:px-6 py-3 sm:py-4">
          <Button variant="ghost" asChild className="min-h-11 -ml-2 touch-manipulation">
            <Link href="/services" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 flex-shrink-0" />
              <span>サービス一覧に戻る</span>
            </Link>
          </Button>
        </div>
      </div>
      <RequestListClient />
    </div>
  );
}
