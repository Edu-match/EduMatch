"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ContentEditorWithImport } from "@/components/content/content-editor-with-import";
import { BlocksContentPreview } from "@/components/content/blocks-content-preview";
import { contentToBlocks, blocksToMarkdown } from "@/lib/markdown-to-blocks";
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, FileText, Image as ImageIcon } from "lucide-react";
import { updateServiceManagement, deleteServiceManagement, uploadImage } from "@/app/_actions";
import { serviceSchema, type ServiceFormData } from "@/lib/validations/service";
import {
  parseServiceCategorySelection,
  serializeServiceCategorySelection,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_MAX_SELECTION,
  SERVICE_CATEGORY_OTHER_MAX_LENGTH,
  SERVICE_CATEGORY_OTHER_VALUE,
} from "@/lib/categories";
import { ImageWithUrlError } from "@/components/ui/image-with-url-error";

const guidelines = [
  "サービスの特徴や導入効果を具体的に記載してください。",
  "価格情報は明確に記載してください。",
  "スクリーンショットや動画があると効果的です。",
  "問い合わせ先や無料トライアル情報も記載を推奨します。",
];

function ServiceContentBlockEditor({
  content,
  onChange,
  maxLength,
}: {
  content: string;
  onChange: (content: string) => void;
  maxLength: number;
}) {
  return (
    <ContentEditorWithImport
      content={content}
      onChange={onChange}
      parseToBlocks={contentToBlocks}
      blocksToContent={blocksToMarkdown}
      maxLength={maxLength}
    />
  );
}

type ServiceEditFormProps = {
  serviceId: string;
  initialData: {
    title: string;
    provider_display_name: string;
    request_notification_emails: string;
    show_material_request_button: boolean;
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
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbnailFileInputRef = useRef<HTMLInputElement | null>(null);
  const [otherCategoryText, setOtherCategoryText] = useState(
    parseServiceCategorySelection(initialData.category).otherText
  );
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(
    initialData.thumbnail_url
  );

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      title: initialData.title,
      provider_display_name: initialData.provider_display_name || "",
      request_notification_emails: initialData.request_notification_emails || "",
      show_material_request_button: initialData.show_material_request_button ?? true,
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

  const categoryValue = form.watch("category");
  const { selectedCategories } = parseServiceCategorySelection(categoryValue || "");
  const canSelectMore = selectedCategories.length < SERVICE_CATEGORY_MAX_SELECTION;
  const hasOtherCategory = selectedCategories.includes(SERVICE_CATEGORY_OTHER_VALUE);

  const toggleCategory = (category: string) => {
    const isSelected = selectedCategories.includes(category);
    let nextCategories: string[];

    if (isSelected) {
      nextCategories = selectedCategories.filter((value) => value !== category);
    } else {
      if (selectedCategories.length >= SERVICE_CATEGORY_MAX_SELECTION) return;
      nextCategories = [...selectedCategories, category];
    }

    const nextOtherText = category === SERVICE_CATEGORY_OTHER_VALUE && !nextCategories.includes(SERVICE_CATEGORY_OTHER_VALUE)
      ? ""
      : otherCategoryText;
    setOtherCategoryText(nextOtherText);
    form.setValue(
      "category",
      serializeServiceCategorySelection(nextCategories, nextOtherText),
      { shouldValidate: true }
    );
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
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="edit" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="edit">
                  <FileText className="h-4 w-4 mr-2" />
                  編集
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-2" />
                  プレビュー
                </TabsTrigger>
              </TabsList>
              <TabsContent value="edit" forceMount className="data-[state=inactive]:hidden">
          <Card>
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
                name="show_material_request_button"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>資料請求ボタン表示</FormLabel>
                    <FormControl>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        サービス詳細に「資料請求する（無料）」ボタンを表示する
                      </label>
                    </FormControl>
                    <FormDescription>
                      有料プラン設定に関係なく、このスイッチで表示/非表示を切り替えます。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="request_notification_emails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>資料請求の通知先メール（任意）</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={"例:\nsales@example.com\ninfo@example.com"}
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      カンマまたは改行で複数指定できます。1件以上設定すると、資料請求通知はこの宛先のみに送信され、作成者メールには送信されません。
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="provider_display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>表示企業名（任意）</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="例: 株式会社○○（未入力時は投稿者名を表示）"
                        maxLength={120}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      サービス詳細の「提供企業」に表示する名称です。
                    </FormDescription>
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
                  render={() => (
                    <FormItem>
                      <FormLabel>カテゴリ *</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {SERVICE_CATEGORIES.map((cat) => {
                              const isSelected = selectedCategories.includes(cat.value);
                              return (
                                <Button
                                  key={cat.value}
                                  type="button"
                                  size="sm"
                                  variant={isSelected ? "default" : "outline"}
                                  disabled={!isSelected && !canSelectMore}
                                  onClick={() => toggleCategory(cat.value)}
                                >
                                  {cat.label}
                                </Button>
                              );
                            })}
                            <Button
                              type="button"
                              size="sm"
                              variant={hasOtherCategory ? "default" : "outline"}
                              disabled={!hasOtherCategory && !canSelectMore}
                              onClick={() => toggleCategory(SERVICE_CATEGORY_OTHER_VALUE)}
                            >
                              {SERVICE_CATEGORY_OTHER_VALUE}
                            </Button>
                          </div>
                          {hasOtherCategory && (
                            <Input
                              value={otherCategoryText}
                              onChange={(e) => {
                                const next = e.target.value.slice(0, SERVICE_CATEGORY_OTHER_MAX_LENGTH);
                                setOtherCategoryText(next);
                                form.setValue(
                                  "category",
                                  serializeServiceCategorySelection(selectedCategories, next),
                                  { shouldValidate: true }
                                );
                              }}
                              placeholder="その他カテゴリ（10文字以内）"
                              maxLength={SERVICE_CATEGORY_OTHER_MAX_LENGTH}
                            />
                          )}
                        </div>
                      </FormControl>
                      <FormDescription>
                        最大{SERVICE_CATEGORY_MAX_SELECTION}つまで選択できます
                        {hasOtherCategory && `（その他: ${otherCategoryText.length}/${SERVICE_CATEGORY_OTHER_MAX_LENGTH}文字）`}
                      </FormDescription>
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
                    <FormLabel>サムネイル画像</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => thumbnailFileInputRef.current?.click()}
                            disabled={thumbnailUploading}
                          >
                            {thumbnailUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ImageIcon className="h-4 w-4 mr-1" />
                                アップロード
                              </>
                            )}
                          </Button>
                          <Input
                            placeholder="Google Drive / GitHub のURL"
                            className="flex-1 min-w-[200px]"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleThumbnailChange(e);
                            }}
                          />
                        </div>
                        <input
                          ref={thumbnailFileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setThumbnailUploading(true);
                            try {
                              const formData = new FormData();
                              formData.append("file", file);
                              const result = await uploadImage(formData);
                              if (result.success && result.url) {
                                field.onChange(result.url);
                                setThumbnailPreview(result.url);
                                toast.success("サムネイルをアップロードしました");
                              } else {
                                toast.error(result.error || "アップロードに失敗しました");
                              }
                            } finally {
                              setThumbnailUploading(false);
                              e.target.value = "";
                            }
                          }}
                        />
                        {thumbnailPreview && (
                          <div className="relative w-full aspect-video border rounded-lg overflow-hidden bg-muted">
                            <ImageWithUrlError
                              originalSrc={thumbnailPreview}
                              alt="サムネイルプレビュー"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      アップロード、または Google Drive / GitHub の画像URL
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
                      <ServiceContentBlockEditor
                        content={field.value || ""}
                        onChange={field.onChange}
                        maxLength={50000}
                      />
                    </FormControl>
                    <FormDescription>
                      {field.value?.length || 0} / 50000文字 | 一括貼り付け・Markdown自動変換対応
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
              </TabsContent>

              <TabsContent value="preview">
                <Card>
                  <CardContent className="py-12">
                    <div className="max-w-3xl mx-auto space-y-6">
                      <h1 className="text-3xl font-bold">{form.watch("title") || "タイトル未設定"}</h1>
                      {form.watch("description") && (
                        <p className="text-lg text-muted-foreground">{form.watch("description")}</p>
                      )}
                      {form.watch("category") && (
                        <div className="flex flex-wrap gap-2">
                          {form
                            .watch("category")
                            .split(",")
                            .map((token) => token.trim())
                            .filter(Boolean)
                            .map((token) => (
                              <Badge key={token} variant="outline">
                                {token.startsWith("その他:") ? token.replace("その他:", "その他（") + "）" : token}
                              </Badge>
                            ))}
                        </div>
                      )}
                      {thumbnailPreview && (
                        <div className="rounded-xl overflow-hidden relative h-[200px]">
                          <ImageWithUrlError
                            originalSrc={thumbnailPreview}
                            alt={form.watch("title")}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      )}
                      <div className="border-t pt-6">
                        <BlocksContentPreview content={form.watch("content") || ""} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

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
