"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { COMMUNITY_ROLE_LABELS, type CommunityRole } from "@/lib/mock-community";

const roleClassNames: Record<CommunityRole, string> = {
  teacher: "bg-sky-100 text-sky-800 border-sky-200",
  student: "bg-violet-100 text-violet-800 border-violet-200",
  expert: "bg-emerald-100 text-emerald-800 border-emerald-200",
  guardian: "bg-amber-100 text-amber-800 border-amber-200",
  general: "bg-slate-100 text-slate-700 border-slate-200",
  anonymous: "bg-muted text-muted-foreground border-border",
};

export function RoleBadge({
  role,
  className,
}: {
  role: CommunityRole;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", roleClassNames[role], className)}
    >
      {COMMUNITY_ROLE_LABELS[role]}
    </Badge>
  );
}
