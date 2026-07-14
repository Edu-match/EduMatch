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
import { Loader2, Upload, Image as ImageIcon, Sparkles } from "lucide-react";
import { createArticle, generateThumbnailForArticle, uploadCanvasThumbnail } from "@/app/_actions";
import { articleSchema, type ArticleFormData } from "@/lib/validations/article";
import { SHARED_CATEGORIES } from "@/lib/categories";
import { ImageWithUrlError } from "@/components/ui/image-with-url-error";
import { ThumbnailStyleSelector } from "@/components/articles/thumbnail-style-selector";
import { generateArticleThumbnailPng } from "@/lib/article-thumbnail-canvas";
import { compositeYoutubeThumbnail } from "@/lib/article-thumbnail-composite";
import {
  THUMBNAIL_STYLE_KINDS,
  THUMBNAIL_STYLE_META,
  type ThumbnailStyleKind,
} from "@/lib/thumbnail-template";

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
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [thumbnailMode, setThumbnailMode] = useState<"youtube" | "style" | "ai" | "url">("youtube");
  const [thumbnailStyle, setThumbnailStyle] = useState<ThumbnailStyleKind>("gradient");
  const [uploadingStyleThumbnail, setUploadingStyleThumbnail] = useState(false);
  const [youtubeStyle, setYoutubeStyle] = useState<ThumbnailStyleKind>("tech");
  const [badgeText, setBadgeText] = useState("");
  const [generatingYoutubeThumbnail, setGeneratingYoutubeThumbnail] = useState(false);

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

  const handleGenerateThumbnail = async () => {
    const title = form.getValues("title");
    const summary = form.getValues("summary");
    if (!title.trim()) {
      setThumbnailError("先に記事タイトルを入力してください");
      return;
    }

    setGeneratingThumbnail(true);
    setThumbnailError(null);
    try {
      const res = await generateThumbnailForArticle(title, summary || undefined);
      if (res.ok && res.url) {
        form.setValue("thumbnail_url", res.url, { shouldValidate: true });
        setThumbnailPreview(res.url);
      } else {
        setThumbnailError(res.error || "サムネイル生成に失敗しました");
      }
    } catch (err) {
      console.error("Thumbnail generation error:", err);
      setThumbnailError("サムネイル生成に失敗しました");
    } finally {
      setGeneratingThumbnail(false);
    }
  };

  const handleGenerateYoutubeThumbnail = async () => {
    const title = form.getValues("title");
    const summary = form.getValues("summary");
    if (!title.trim()) {
      setThumbnailError("先に記事タイトルを入力してください");
      return;
    }

    setGeneratingYoutubeThumbnail(true);
    setThumbnailError(null);
    try {
      // 1. AI背景を生成
      const res = await generateThumbnailForArticle(
        title,
        summary || undefined,
        youtubeStyle,
      );
      if (!res.ok || !res.url) {
        setThumbnailError(res.error || "背景画像の生成に失敗しました");
        return;
      }
      // 2. ブラウザ側でテキストを合成
      const blob = await compositeYoutubeThumbnail(
        res.url,
        title,
        badgeText.trim() || undefined,
      );
      // 3. 合成結果をアップロード
      const fd = new FormData();
      fd.append("file", new File([blob], "thumbnail.png", { type: "image/png" }));
      const upload = await uploadCanvasThumbnail(fd);
      if (upload.ok && upload.url) {
        form.setValue("thumbnail_url", upload.url, { shouldValidate: true });
        setThumbnailPreview(upload.url);
      } else {
        setThumbnailError(upload.error || "アップロードに失敗しました");
      }
    } catch (err) {
      console.error("YouTube thumbnail generation error:", err);
      setThumbnailError("サムネイル生成に失敗しました");
    } finally {
      setGeneratingYoutubeThumbnail(false);
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
                    <FormLabel>サムネイル画像</FormLabel>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(["youtube", "style", "ai", "url"] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setThumbnailMode(mode)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${thumbnailMode === mode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          {mode === "youtube"
                            ? "YouTube風（AI生成）"
                            : mode === "style"
                              ? "シンプル（テキストのみ）"
                              : mode === "ai"
                                ? "AI画像のみ"
                                : "URL入力"}
                        </button>
                      ))}
                    </div>
                    <FormControl>
                      <div className="space-y-2">
                        {thumbnailMode === "youtube" && (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                              AIが背景イラストを生成し、タイトル文字を重ねてYouTube風サムネイルを作成します（30秒ほどかかります）
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {THUMBNAIL_STYLE_KINDS.map((style) => (
                                <button
                                  key={style}
                                  type="button"
                                  onClick={() => setYoutubeStyle(style)}
                                  aria-pressed={youtubeStyle === style}
                                  className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                                    youtubeStyle === style
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-input text-muted-foreground hover:bg-muted"
                                  }`}
                                >
                                  {THUMBNAIL_STYLE_META[style].label}
                                </button>
                              ))}
                            </div>
                            <Input
                              placeholder="バッジテキスト（任意）例: 副業・収益化 / EdTech / 授業改善"
                              value={badgeText}
                              onChange={(e) => setBadgeText(e.target.value)}
                              maxLength={20}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleGenerateYoutubeThumbnail}
                              disabled={
                                generatingYoutubeThumbnail ||
                                isSubmitting ||
                                !form.watch("title").trim()
                              }
                            >
                              {generatingYoutubeThumbnail ? (
                                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />生成中…</>
                              ) : (
                                <><Sparkles className="mr-1.5 h-3.5 w-3.5" />生成する</>
                              )}
                            </Button>
                          </div>
                        )}
                        {thumbnailMode === "style" && (
                          <>
                            <ThumbnailStyleSelector
                              value={thumbnailStyle}
                              onChange={(s) => setThumbnailStyle(s)}
                              title={form.watch("title")}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploadingStyleThumbnail || !form.watch("title").trim()}
                              onClick={async () => {
                                const title = form.getValues("title");
                                if (!title.trim()) return;
                                setUploadingStyleThumbnail(true);
                                setThumbnailError(null);
                                try {
                                  const blob = await generateArticleThumbnailPng({ templateKind: thumbnailStyle, title });
                                  const fd = new FormData();
                                  fd.append("file", new File([blob], "thumbnail.png", { type: "image/png" }));
                                  const res = await uploadCanvasThumbnail(fd);
                                  if (res.ok && res.url) {
                                    form.setValue("thumbnail_url", res.url, { shouldValidate: true });
                                    setThumbnailPreview(res.url);
                                  } else {
                                    setThumbnailError(res.error || "アップロードに失敗しました");
                                  }
                                } catch {
                                  setThumbnailError("サムネイル生成に失敗しました");
                                } finally {
                                  setUploadingStyleThumbnail(false);
                                }
                              }}
                            >
                              {uploadingStyleThumbnail ? (
                                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />アップロード中…</>
                              ) : (
                                "このスタイルで確定"
                              )}
                            </Button>
                          </>
                        )}
                        {thumbnailMode === "ai" && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">タイトル・概要からAIがイラストを自動生成します（30秒ほどかかります）</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleGenerateThumbnail}
                              disabled={generatingThumbnail || isSubmitting}
                            >
                              {generatingThumbnail ? (
                                <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />生成中…</>
                              ) : (
                                <><Sparkles className="mr-1.5 h-3.5 w-3.5" />AIで生成</>
                              )}
                            </Button>
                          </div>
                        )}
                        {thumbnailMode === "url" && (
                          <Input
                            placeholder="https://example.com/image.jpg"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handleThumbnailChange(e);
                            }}
                          />
                        )}
                        {thumbnailError && (
                          <p className="text-sm text-destructive">{thumbnailError}</p>
                        )}
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
