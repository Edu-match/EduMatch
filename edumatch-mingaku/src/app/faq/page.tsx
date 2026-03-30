import type { Metadata } from "next";
import { getFaqCategories } from "@/app/_actions/site-pages";
import { FAQPageClient } from "./faq-page-client";

export const metadata: Metadata = {
  title: "よくある質問",
  description:
    "エデュマッチに関するよくある質問をご確認いただけます。お問い合わせの前にご覧ください。",
};

export default async function FAQPage() {
  const categories = await getFaqCategories();
  return <FAQPageClient categories={categories} />;
}
