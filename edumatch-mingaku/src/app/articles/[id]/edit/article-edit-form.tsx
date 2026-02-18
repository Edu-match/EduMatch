"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { updateArticle, deleteArticle } from "@/app/_actions";
import { articleSchema, type ArticleFormData } from "@/lib/validations/article";
import { SHARED_CATEGORIES } from "@/lib/categories";

const guidelines = [
  "記事の内容は教育現場に役立つ実践的な情報にしてください。",
  "著作権や引用ルールを遵守してください。",
  "誤情報がないように確認をお願いします。",
  "画像は自分で撮影したもの、または使用許可のあるもののみ。",
];

type ArticleEditFormProps = {
  articleId: string;
  initialData: {
    title: string;
    category: string;
    tags: string[];
    summary: string;
    content: string;
    thumbnail_url: string | null;
    youtube_url: string | null;
    status: string;
  };
};

export function ArticleEditForm({ articleId, initialData }: ArticleEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    initialData.thumbnail_url
  );

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: initialData.title,
      category: initialData.category,
      tags: initialData.tags.join(", "),
      summary: initialData.summary,
      content: initialData.content,
      thumbnail_url: initialData.thumbnail_url || "",
      youtube_url: initialData.youtube_url || "",
      status: initialData.status as "DRAFT" | "PENDING" | "APPROVED" | "REJECTED",
    },
  });

  const onSubmit = async (data: ArticleFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateArticle(articleId, data);

      if (result.success) {
        router.push("/provider-dashboard?message=" + encodeURIComponent(result.message || "記事を更新しました"));
        router.refresh();
      } else {
        setError(result.error || "記事の更新に失敗しました");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("記事の更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("本当にこの記事を削除しますか？この操作は取り消せません。")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteArticle(articleId);

      if (result.success) {
        router.push("/provider-dashboard?message=" + encodeURIComponent(result.message || "記事を削除しました"));
        router.refresh();
      } else {
        setError(result.error || "記事の削除に失敗しました");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("記事の削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    form.setValue("thumbnail_url", url);
    
    if (url && url.startsWith("http")) {
      setThumbnailPreview(url);
    } else {
      setThumbnailPreview(null);
    }
  };

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">記事編集</h1>
        <p className="text-muted-foreground">
          記事の内容を編集します
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>記事編集フォーム</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>記事タイトル *</FormLabel>
                    <FormControl>
                      <Input placeholder="例: GIGAスクール構想の実践事例" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>カテゴリ *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="カテゴリを選択" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SHARED_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>タグ</FormLabel>
                      <FormControl>
                        <Input placeholder="例: EdTech, 授業改善" {...field} />
                      </FormControl>
                      <FormDescription>
                        カンマまたはスペース区切りで入力
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>概要（リード文） *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="記事の内容を簡潔にまとめてください" 
                        rows={4} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0} / 500文字
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="thumbnail_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>サムネイル画像URL</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input 
                          placeholder="https://example.com/image.jpg" 
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleThumbnailChange(e);
                          }}
                        />
                        {thumbnailPreview && (
                          <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-muted">
                            <img
                              src={thumbnailPreview}
                              alt="サムネイルプレビュー"
                              className="w-full h-full object-cover"
                              onError={() => setThumbnailPreview(null)}
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      画像ホスティングサービスにアップロードしたURLを入力してください
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="youtube_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube動画URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      記事内に埋め込むYouTube動画のURL（オプション）
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>本文 *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="記事の本文を入力してください。Markdown記法に対応しています。" 
                        rows={15} 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0} / 50000文字 | Markdown、画像URL、YouTube URLに対応
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <Button 
                    type="submit"
                    disabled={isSubmitting || isDeleting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        更新中...
                      </>
                    ) : (
                      "更新する"
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/provider-dashboard")}
                    disabled={isSubmitting || isDeleting}
                  >
                    キャンセル
                  </Button>
                </div>
                <Button 
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSubmitting || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      削除中...
                    </>
                  ) : (
                    "削除"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>投稿ガイドライン</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {guidelines.map((item, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm">
                    <Badge variant="outline">必須</Badge>
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>レビュー状況</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                更新後、編集部で内容確認を行います。
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Markdown記法</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1 text-muted-foreground">
                <p># 見出し1</p>
                <p>## 見出し2</p>
                <p>**太字**</p>
                <p>- リスト</p>
                <p>![alt](画像URL)</p>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}
