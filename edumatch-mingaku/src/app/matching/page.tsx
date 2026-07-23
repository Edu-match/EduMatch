import type { Metadata } from "next";
import { Users } from "lucide-react";
import { unstable_noStore } from "next/cache";
import {
  getDirectoryMembers,
  getDirectoryInterests,
  getMyDirectoryStatus,
} from "@/app/_actions/directory";
import { DirectoryClient } from "@/components/directory/directory-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "人材マッチング",
  description: "立場を越えて、教育に関わる人と出会う名鑑。関心でしぼって、教育のひろばでつながりましょう。",
};

export default async function MatchingPage() {
  unstable_noStore();
  const [members, interests, myStatus] = await Promise.all([
    getDirectoryMembers(),
    getDirectoryInterests(),
    getMyDirectoryStatus(),
  ]);

  return (
    <div className="container max-w-6xl py-8">
      <header className="mb-6">
        <h1 className="display-title flex items-center gap-2 text-2xl sm:text-3xl">
          <Users className="h-6 w-6 text-primary" />
          人材マッチング
        </h1>
        <p className="mt-1 text-muted-foreground">
          立場を越えて、教育に関わる人と出会う名鑑。関心でしぼって、教育のひろばでつながりましょう。
        </p>
      </header>

      <DirectoryClient members={members} interests={interests} myStatus={myStatus} />
    </div>
  );
}
