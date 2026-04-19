import type { Metadata } from "next";
import { ForumListClientDynamic } from "@/components/community/forum-list-client-dynamic";

export const metadata: Metadata = {
  title: "AIUEO 井戸端会議 | エデュマッチ",
  description:
    "教育に関わるすべての人が、テーマ別の部屋でざっくばらんに語り合うコミュニティ。教員・専門家・保護者・企業、立場を超えてつながりましょう。",
};

export default function ForumPage() {
  return <ForumListClientDynamic />;
}
