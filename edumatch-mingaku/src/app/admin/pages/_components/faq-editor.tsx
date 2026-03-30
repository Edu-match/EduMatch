"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSitePageBody } from "@/app/_actions/site-pages";
import { getDefaultContentForEdit } from "@/lib/default-site-pages";
import { Loader2, Save, HelpCircle, Plus, Trash2, GripVertical } from "lucide-react";
import type { SitePageKey } from "@/app/_actions/site-pages";

export type FaqItem = { question: string; answer: string };
export type FaqCategory = {
  id: string;
  title: string;
  icon: string;
  faqs: FaqItem[];
};

const ICON_OPTIONS = [
  "HelpCircle",
  "User",
  "CreditCard",
  "FileText",
  "Settings",
  "MessageCircle",
] as const;

function parseFaqJson(body: string | null): FaqCategory[] {
  if (!body?.trim()) {
    return JSON.parse(
      getDefaultContentForEdit("faq" as SitePageKey, null)
    ) as FaqCategory[];
  }
  try {
    const data = JSON.parse(body) as FaqCategory[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

type Props = {
  initialContent: string;
  initialTitle?: string;
};

export function FaqEditor({ initialContent, initialTitle = "よくある質問" }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<FaqCategory[]>(() =>
    parseFaqJson(initialContent)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addCategory = () => {
    setCategories((prev) => [
      ...prev,
      {
        id: `cat-${Date.now()}`,
        title: "新しいカテゴリ",
        icon: "HelpCircle",
        faqs: [],
      },
    ]);
  };

  const removeCategory = (index: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, updates: Partial<FaqCategory>) => {
    setCategories((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  };

  const addFaq = (categoryIndex: number) => {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === categoryIndex
          ? {
              ...c,
              faqs: [...c.faqs, { question: "", answer: "" }],
            }
          : c
      )
    );
  };

  const removeFaq = (categoryIndex: number, faqIndex: number) => {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === categoryIndex
          ? { ...c, faqs: c.faqs.filter((_, j) => j !== faqIndex) }
          : c
      )
    );
  };

  const updateFaq = (
    categoryIndex: number,
    faqIndex: number,
    field: "question" | "answer",
    value: string
  ) => {
    setCategories((prev) =>
      prev.map((c, i) =>
        i === categoryIndex
          ? {
              ...c,
              faqs: c.faqs.map((item, j) =>
                j === faqIndex ? { ...item, [field]: value } : item
              ),
            }
          : c
      )
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const body = JSON.stringify(categories, null, 2);
      const result = await updateSitePageBody("faq", body, initialTitle);
      if (result.success) {
        toast.success("保存しました");
        router.refresh();
      } else {
        toast.error(result.error ?? "保存に失敗しました");
      }
    } catch (e) {
      console.error(e);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              よくある質問 を編集
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/pages">一覧に戻る</Link>
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              保存する
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        <p className="text-sm text-muted-foreground">
          カテゴリとQ&Aを編集できます。カテゴリのアイコンは表示用の識別子です（HelpCircle, User, CreditCard, FileText, Settings, MessageCircle など）。
        </p>

        {categories.map((category, catIndex) => (
          <Card key={category.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={category.title}
                    onChange={(e) =>
                      updateCategory(catIndex, { title: e.target.value })
                    }
                    placeholder="カテゴリ名"
                    className="font-semibold max-w-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground whitespace-nowrap">
                    アイコン:
                  </Label>
                  <select
                    value={category.icon}
                    onChange={(e) =>
                      updateCategory(catIndex, { icon: e.target.value })
                    }
                    className="border rounded-md px-2 py-1 text-sm"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCategory(catIndex)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {category.faqs.map((faq, faqIndex) => (
                <div
                  key={faqIndex}
                  className="border rounded-lg p-4 space-y-2 bg-muted/30"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Label>質問</Label>
                      <Input
                        value={faq.question}
                        onChange={(e) =>
                          updateFaq(catIndex, faqIndex, "question", e.target.value)
                        }
                        placeholder="質問を入力"
                      />
                      <Label>回答</Label>
                      <textarea
                        value={faq.answer}
                        onChange={(e) =>
                          updateFaq(catIndex, faqIndex, "answer", e.target.value)
                        }
                        placeholder="回答を入力"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFaq(catIndex, faqIndex)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addFaq(catIndex)}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Q&Aを追加
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" onClick={addCategory} className="gap-1">
          <Plus className="h-4 w-4" />
          カテゴリを追加
        </Button>
      </div>
    </div>
  );
}
