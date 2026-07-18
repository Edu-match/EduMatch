"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 flex justify-end px-4 py-2 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <button
          type="button"
          onClick={handleLogout}
          className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background"
        >
          <LogOut className="h-4 w-4" />
          ログアウト
        </button>
      </div>
      {children}
    </div>
  );
}
