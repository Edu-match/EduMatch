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
import { updateServiceManagement, deleteServiceManagement } from "@/app/_actions";
import { serviceSchema, type ServiceFormData } from "@/lib/validations/service";
import { SHARED_CATEGORIES } from "@/lib/categories";

const guidelines = [
  "サービスの特徴や導入効果を具体的に記載してください。",
  "価格情報は明確に記載してください。",
  "スクリーンショットや動画があると効果的です。",
  "問い合わせ先や無料トライアル情報も記載を推奨します。",
];

type ServiceEditFormProps = {
  serviceId: string;
  initialData: {
    title: string;
    description: string;
    category: string;
    content: string;
    price_info: string;
    thumbnail_url: string | null;
    youtube_url: string | null;
    status: string;
  };
};

export function ServiceEditForm({ serviceId, initialData }: ServiceEditFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    initialData.thumbnail_url
  );

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: initialData.title,
      description: initialData.description,
      category: initialData.category,
      content: initialData.content,
      price_info: initialData.price_info,
      thumbnail_url: initialData.thumbnail_url || "",
      youtube_url: initialData.youtube_url || "",
      status: initialData.status as "DRAFT" | "PENDING" | "APPROVED" | "REJECTED",
    },
  });

  const onSubmit = async (data: ServiceFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateServiceManagement(serviceId, data);

      if (result.success) {
        router.push("/provider-dashboard?message=" + encodeURIComponent(result.message || "サービスを更新しました"));
        router.refresh();
      } else {
        setError(result.error || "サービスの更新に失敗しました");
      }
    } catch (err) {
      console.error("Submit error:", err);
      setError("サービスの更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("本当にこのサービスを削除しますか？この操作は取り消せません。")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteServiceManagement(serviceId);

      if (result.success) {
        router.push("/provider-dashboard?message=" + encodeURIComponent(result.message || "サービスを削除しました"));
        router.refresh();
      } else {
        setError(result.error || "サービスの削除に失敗しました");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("サービスの削除に失敗しました");
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
        <h1 className="text-3xl font-bold mb-2">サービス編集</h1>
        <p className="text-muted-foreground">
          サービスの内容を編集します
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
              <CardTitle>サービス編集フォーム</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>サービス名 *</FormLabel>
                    <FormControl>
                      <Input placeholder="例: ClassTech Pro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>説明（キャッチコピー） *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="例: 授業管理から学習進捗まで一元管理" 
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
                  name="price_info"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>料金情報 *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="例: 月額30,000円〜" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
                    <FormLabel>サービス紹介動画URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      サービス内に埋め込むYouTube動画のURL（オプション）
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
                    <FormLabel>詳細説明 *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="サービスの詳細な説明、機能、導入事例などを記載してください。Markdown記法に対応しています。" 
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
                    <Badge variant="outline">推奨</Badge>
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
