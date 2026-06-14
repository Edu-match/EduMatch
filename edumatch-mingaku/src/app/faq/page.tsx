import type { Metadata } from "next";
import { getFaqCategories } from "@/app/_actions/site-pages";
import { FAQPageClient } from "./faq-page-client";
import { getTranslations, getLocale } from "next-intl/server";
import { translateBatch } from "@/lib/translate";
import type { Locale } from "@/i18n/config";
import type { FaqCategoryProp } from "./faq-page-client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("faq");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

async function localizeFaqCategories(
  categories: FaqCategoryProp[],
  locale: Locale
): Promise<FaqCategoryProp[]> {
  if (locale === "ja") return categories;

  const texts: string[] = [];
  for (const category of categories) {
    texts.push(category.title);
    for (const faq of category.faqs) {
      texts.push(faq.question, faq.answer);
    }
  }

  const translated = await translateBatch(texts, locale);
  let i = 0;

  return categories.map((category) => {
    const title = translated[i++];
    const faqs = category.faqs.map((faq) => ({
      question: translated[i++],
      answer: translated[i++],
    }));
    return { ...category, title, faqs };
  });
}

export default async function FAQPage() {
  const locale = (await getLocale()) as Locale;
  const categories = await localizeFaqCategories(await getFaqCategories(), locale);
  return <FAQPageClient categories={categories} />;
}
