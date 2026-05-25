"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContentEditorWithImport } from "@/components/content/content-editor-with-import";
import { updateSitePageContent } from "@/app/_actions/site-pages";
import {
  updateOperatorInfo,
  type OperatorInfo,
} from "@/app/_actions/operator-info";
import { contentToBlocks } from "@/lib/markdown-to-blocks";
import { blocksToMarkdown } from "@/lib/markdown-to-blocks";
import { Loader2, Save, FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { SitePageKey } from "@/app/_actions/site-pages";

const PAGE_LABELS: Record<SitePageKey, string> = {
  terms: "利用規約",
  privacy: "プライバシーポリシー",
  service_content: "サービス内容一覧",
  faq: "よくある質問",
  about: "運営について",
  company_info: "会社情報",
};

type Props = {
  keyType: SitePageKey;
  initialContent: string;
  initialTitle?: string;
  initialOperatorInfo?: OperatorInfo;
};

export function PageEditor({
  keyType,
  initialContent,
  initialTitle = "",
  initialOperatorInfo,
}: Props) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState(initialTitle || PAGE_LABELS[keyType]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [operator, setOperator] = useState<OperatorInfo | undefined>(
    initialOperatorInfo
  );

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      setContent(initialContent);
      setTitle(initialTitle || PAGE_LABELS[keyType]);
      setInitialized(true);
    }
  }, [initialized, initialContent, initialTitle, keyType]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const result = await updateSitePageContent(keyType, content, title);
      if (!result.success) {
        toast.error(result.error ?? "保存に失敗しました");
        return;
      }
      if (operator) {
        const opResult = await updateOperatorInfo(operator);
        if (!opResult.success) {
          toast.error(opResult.error ?? "主催・運営の保存に失敗しました");
          return;
        }
      }
      toast.success("保存しました");
      router.refresh();
    } catch (e) {
      console.error(e);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const label = PAGE_LABELS[keyType];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {label} を編集
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
        {operator && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">主催・運営の情報</CardTitle>
              <p className="text-sm text-muted-foreground">
                ページ上部に表示される「主催」「運営」などの情報です。ここで変更すると利用規約・プライバシーポリシーの両ページに反映されます。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="op-section-title">見出し</Label>
                <Input
                  id="op-section-title"
                  value={operator.sectionTitle}
                  onChange={(e) =>
                    setOperator((prev) =>
                      prev ? { ...prev, sectionTitle: e.target.value } : prev
                    )
                  }
                  placeholder="主催・運営"
                  className="max-w-md"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="op-organizer">主催</Label>
                <Input
                  id="op-organizer"
                  value={operator.organizer}
                  onChange={(e) =>
                    setOperator((prev) =>
                      prev ? { ...prev, organizer: e.target.value } : prev
                    )
                  }
                  placeholder="主催団体名"
                  className="max-w-md"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="op-operator">運営</Label>
                <Input
                  id="op-operator"
                  value={operator.operator}
                  onChange={(e) =>
                    setOperator((prev) =>
                      prev ? { ...prev, operator: e.target.value } : prev
                    )
                  }
                  placeholder="運営会社名"
                  className="max-w-md"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="op-established">設立年</Label>
                <Input
                  id="op-established"
                  value={operator.established}
                  onChange={(e) =>
                    setOperator((prev) =>
                      prev ? { ...prev, established: e.target.value } : prev
                    )
                  }
                  placeholder="2011年12月1日"
                  className="max-w-md"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">ページタイトル</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${label}のタイトル`}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">本文（ブロック形式）</CardTitle>
            <p className="text-sm text-muted-foreground">
              一括貼り付けや Markdown 記法（# 見出し、- リストなど）で効率よく編集できます
            </p>
          </CardHeader>
          <CardContent>
            <ContentEditorWithImport
              content={content}
              onChange={setContent}
              parseToBlocks={contentToBlocks}
              blocksToContent={blocksToMarkdown}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
