"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2, Search, Undo2 } from "lucide-react";
import { adminRestoreKaikanApplication } from "@/app/_actions/kaikan";
import { AdminCancelButton } from "./admin-cancel-button";

export type ParticipantRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  contentTitle: string;
  createdAtLabel: string;
  qrToken: string;
  /** 受付番号（数字10桁・ハイフン区切り） */
  receipt: string;
};

type StatusFilter = "all" | "confirmed" | "checked_in" | "cancelled";

function RestoreSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-md border border-input bg-background px-4 text-xs font-bold text-foreground transition hover:bg-muted disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
      キャンセルを取り消す
    </button>
  );
}

/** 参加者一覧：検索＋状態/コンテンツ絞り込み＋キャンセル・復帰操作つきテーブル。 */
export function ParticipantsTable({ participants }: { participants: ParticipantRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [contentFilter, setContentFilter] = useState("all");

  const contentTitles = useMemo(
    () => [...new Set(participants.map((p) => p.contentTitle).filter(Boolean))],
    [participants],
  );

  const counts = useMemo(() => {
    const c = { all: participants.length, confirmed: 0, checked_in: 0, cancelled: 0 };
    for (const p of participants) {
      if (p.status === "checked_in") c.checked_in++;
      else if (p.status === "cancelled") c.cancelled++;
      else c.confirmed++;
    }
    return c;
  }, [participants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/[^0-9]/g, "");
    return participants.filter((p) => {
      if (status !== "all") {
        const s = p.status === "checked_in" || p.status === "cancelled" ? p.status : "confirmed";
        if (s !== status) return false;
      }
      if (contentFilter !== "all" && p.contentTitle !== contentFilter) return false;
      if (!q) return true;
      // 氏名・メールは部分一致、受付番号は数字のみ比較（ハイフン無視）
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (qDigits.length >= 3 && p.receipt.replace(/[^0-9]/g, "").includes(qDigits))
      );
    });
  }, [participants, query, status, contentFilter]);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-bold transition ${active ? "bg-primary text-primary-foreground" : "border text-muted-foreground hover:text-foreground"}`;

  return (
    <div>
      {/* 検索・フィルタ */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <label className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="氏名・メール・受付番号で検索"
              className="w-full rounded-md border border-input py-2 pl-9 pr-3 text-sm"
            />
          </label>
          {contentTitles.length > 1 && (
            <select
              value={contentFilter}
              onChange={(e) => setContentFilter(e.target.value)}
              className="max-w-[260px] rounded-md border border-input px-3 py-2 text-sm"
            >
              <option value="all">すべてのコンテンツ</option>
              {contentTitles.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setStatus("all")} className={chip(status === "all")}>すべて {counts.all}</button>
          <button type="button" onClick={() => setStatus("confirmed")} className={chip(status === "confirmed")}>未受付 {counts.confirmed}</button>
          <button type="button" onClick={() => setStatus("checked_in")} className={chip(status === "checked_in")}>受付済 {counts.checked_in}</button>
          <button type="button" onClick={() => setStatus("cancelled")} className={chip(status === "cancelled")}>キャンセル済 {counts.cancelled}</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-md bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
          条件に一致する申込がありません。
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="whitespace-nowrap py-2.5 pr-4 font-medium">氏名</th>
                <th className="whitespace-nowrap py-2.5 pr-4 font-medium">メール</th>
                <th className="whitespace-nowrap py-2.5 pr-4 font-medium">コンテンツ</th>
                <th className="whitespace-nowrap py-2.5 pr-4 font-medium">受付番号</th>
                <th className="whitespace-nowrap py-2.5 pr-4 font-medium">状態</th>
                <th className="whitespace-nowrap py-2.5 pr-4 font-medium">申込日時</th>
                <th className="whitespace-nowrap py-2.5 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={`border-t align-middle ${p.status === "cancelled" ? "text-muted-foreground" : ""}`}>
                  <td className="py-3 pr-4 font-medium">{p.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{p.email || "—"}</td>
                  <td className="py-3 pr-4">{p.contentTitle || "—"}</td>
                  <td className="whitespace-nowrap py-3 pr-4 font-mono tabular-nums text-muted-foreground">{p.receipt}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${p.status === "checked_in" ? "bg-emerald-100 text-emerald-700" : p.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-700"}`}>
                      {p.status === "checked_in" ? "受付済" : p.status === "cancelled" ? "キャンセル済" : "未受付"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">{p.createdAtLabel}</td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-2">
                      {p.status !== "cancelled" && (
                        <Link
                          href={`/admin/kaikan/checkin/${p.qrToken}`}
                          className="inline-flex min-h-[40px] items-center whitespace-nowrap rounded-md border border-input bg-background px-4 text-xs font-bold transition hover:bg-muted"
                        >
                          受付画面
                        </Link>
                      )}
                      {p.status === "cancelled" ? (
                        <form action={adminRestoreKaikanApplication} className="inline-flex">
                          <input type="hidden" name="id" value={p.id} />
                          <RestoreSubmit />
                        </form>
                      ) : (
                        <AdminCancelButton id={p.id} name={p.name} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
