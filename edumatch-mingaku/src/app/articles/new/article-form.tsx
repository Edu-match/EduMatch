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
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { createArticle } from "@/app/_actions";
import { articleSchema, type ArticleFormData } from "@/lib/validations/article";

const categories = [
  { value: "教育ICT", label: "教育ICT" },
  { value: "導入事例", label: "導入事例" },
  { value: "学校運営", label: "学校運営" },
  { value: "政策・制度", label: "政策・制度" },
];

const guidelines = [
  "記事の内容は教育現場に役立つ実践的な情報にしてください。",
  "著作権や引用ルールを遵守してください。",
  "誤情報がないように確認をお願いします。",
  "画像は自分で撮影したもの、または使用許可のあるもののみ。",
];

export function ArticleForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const form = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      category: "",
      tags: "",
      summary: "",
      content: "",
      thumbnail_url: "",
      youtube_url: "",
      status: "PENDING",
    },
  });

  const onSubmit = async (data: ArticleFormData, isDraft: boolean = false) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const submitData = {
        ...data,
        status: isDraft ? ("DRAFT" as const) : ("PENDING" as const),
      };

      const result = await createArticle(submitData);

      if (result.success) {
        router.push("/provider-dashboard?message=" + encodeURIComponent(result.message || "記事を投稿しました"));
        router.refresh();
      } else {
        setError(result.error || "記事の投稿に失敗しました");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("記事の投稿に失敗しました");
    } finally {
      setIsSubmitting(false);
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
        <h1 className="text-3xl font-bold mb-2">記事投稿</h1>
        <p className="text-muted-foreground">
          記事を投稿して、教育現場の知見を共有しましょう
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Form {...form}>
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>記事投稿フォーム</CardTitle>
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
                          {categories.map((cat) => (
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

              <div className="flex items-center gap-3 pt-2">
                <Button 
                  type="button"
                  onClick={form.handleSubmit((data) => onSubmit(data, false))}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      投稿中...
                    </>
                  ) : (
                    "投稿する"
                  )}
                </Button>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={form.handleSubmit((data) => onSubmit(data, true))}
                  disabled={isSubmitting}
                >
                  下書き保存
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
                投稿後、編集部で内容確認を行い公開されます。
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
