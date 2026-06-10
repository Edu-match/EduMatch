"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Search,
  HelpCircle,
  CreditCard,
  User,
  FileText,
  Settings,
  MessageCircle,
  LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

const ICON_MAP: Record<string, LucideIcon> = {
  HelpCircle,
  User,
  CreditCard,
  FileText,
  Settings,
  MessageCircle,
};

export type FaqCategoryProp = {
  id: string;
  title: string;
  icon: string;
  faqs: { question: string; answer: string }[];
};

type Props = {
  categories: FaqCategoryProp[];
};

export function FAQPageClient({ categories: initialCategories }: Props) {
  const t = useTranslations("faq");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = initialCategories
    .map((category) => ({
      ...category,
      icon: ICON_MAP[category.icon] ?? HelpCircle,
      faqs: category.faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) =>
      selectedCategory ? category.id === selectedCategory : category.faqs.length > 0
    );

  return (
    <div className="container py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* 検索 */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* カテゴリフィルター */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          {t("all")}
        </Button>
        {initialCategories.map((category) => {
          const Icon = ICON_MAP[category.icon] ?? HelpCircle;
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="gap-1"
            >
              <Icon className="h-4 w-4" />
              {category.title}
            </Button>
          );
        })}
      </div>

      {/* FAQ一覧 */}
      <div className="max-w-3xl mx-auto space-y-6">
        {filteredCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCategories.length === 0 ||
      filteredCategories.every((c) => c.faqs.length === 0) ? (
        <div className="text-center py-12">
          <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t("noResults")}</p>
        </div>
      ) : null}

      {/* お問い合わせ案内 */}
      <Card className="max-w-3xl mx-auto mt-12 bg-primary/5 border-primary/20">
        <CardContent className="p-6 text-center">
          <MessageCircle className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t("ctaTitle")}</h2>
          <p className="text-muted-foreground mb-4">{t("ctaBody")}</p>
          <Button asChild>
            <Link href="/contact">{t("ctaButton")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
