import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { RequestListClient } from "./request-list-client";

export const dynamic = "force-dynamic";

export default function RequestListPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      <div className="border-b bg-card/50">
        <div className="container py-4">
          <Button variant="ghost" asChild>
            <Link href="/services">
              <ArrowLeft className="h-4 w-4 mr-2" />
              サービス一覧に戻る
            </Link>
          </Button>
        </div>
      </div>
      <RequestListClient />
    </div>
  );
}
