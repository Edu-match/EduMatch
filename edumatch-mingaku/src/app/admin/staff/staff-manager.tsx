"use client";

import { useState, useMemo, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateRole } from "@/app/_actions/staff-admin";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

export function StaffManager({
  initialProfiles,
}: {
  initialProfiles: Profile[];
}) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [emailFilter, setEmailFilter] = useState("");
  const [isPending, startTransition] = useTransition();

  const filterEmails = useMemo(() => {
    if (!emailFilter.trim()) return null;
    return emailFilter
      .split("\n")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }, [emailFilter]);

  const filtered = useMemo(() => {
    if (!filterEmails) return profiles;
    return profiles.filter(
      (p) => p.email && filterEmails.includes(p.email.toLowerCase())
    );
  }, [profiles, filterEmails]);

  function handleRoleChange(userId: string, newRole: "STAFF" | "VIEWER") {
    startTransition(async () => {
      try {
        await updateRole(userId, newRole);
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
        );
      } catch (e) {
        alert(e instanceof Error ? e.message : "エラーが発生しました");
      }
    });
  }

  function roleLabel(role: string) {
    switch (role) {
      case "ADMIN":
        return "管理者";
      case "STAFF":
        return "スタッフ";
      case "PROVIDER":
        return "提供者";
      case "VIEWER":
        return "一般";
      default:
        return role;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-2 block">
          メールアドレスで絞り込み（1行に1つ）
        </label>
        <Textarea
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          placeholder={"user1@example.com\nuser2@example.com"}
          rows={4}
          className="font-mono text-sm"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} 件表示中 / 全 {profiles.length} 件
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名前</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>現在のロール</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  該当するユーザーがいません
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>{profile.name || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {profile.email || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        profile.role === "ADMIN"
                          ? "default"
                          : profile.role === "STAFF"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {roleLabel(profile.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {profile.role === "ADMIN" ? (
                      <Badge variant="default">管理者</Badge>
                    ) : profile.role === "STAFF" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          handleRoleChange(profile.id, "VIEWER")
                        }
                      >
                        スタッフ解除
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() =>
                          handleRoleChange(profile.id, "STAFF")
                        }
                      >
                        スタッフに昇格
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
