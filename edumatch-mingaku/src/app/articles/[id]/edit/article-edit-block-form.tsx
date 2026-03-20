"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentEditorWithImport } from "@/components/content/content-editor-with-import";
import { BlocksContentPreview } from "@/components/content/blocks-content-preview";
import type { ContentBlock } from "@/components/editor/block-editor";
import { contentToBlocks, blocksToMarkdown } from "@/lib/markdown-to-blocks";
import { blocksToArticleContent, stripLeadText } from "@/lib/article-content";
import { isImportedContent } from "@/lib/imported-content";
import {
  Eye,
  Save,
  Send,
  Settings,
  Image as ImageIcon,
  Calendar,
  Building2,
  School,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Tag,
  Globe,
  Lock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { updatePost, uploadImage, deleteArticle } from "@/app/_actions";
import { SHARED_CATEGORIES } from "@/lib/categories";
import { ImageWithUrlError } from "@/components/ui/image-with-url-error";

const TITLE_MAX_LENGTH = 80;
const CONTENT_MAX_LENGTH = 10000;

type ArticleEditBlockFormProps = {
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

function statusToPublishType(status: string): "public" | "member" | "draft" {
  if (status === "DRAFT") return "draft";
  if (status === "APPROVED" || status === "REJECTED") return "public";
  return "public"; // PENDING
}

function CheckItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2
        className={`h-4 w-4 ${checked ? "text-green-500" : "text-gray-300"}`}
      />
      <span className={`text-sm ${checked ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

export function ArticleEditBlockForm({ articleId, initialData }: ArticleEditBlockFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("edit");
  const [title, setTitle] = useState(initialData.title);
  const [leadText, setLeadText] = useState(initialData.summary || "");
  const [category, setCategory] = useState(initialData.category || "教育ICT");
  const [tags, setTags] = useState(initialData.tags?.join(", ") || "");
  const [publishType, setPublishType] = useState<"public" | "member" | "draft">(
    () => statusToPublishType(initialData.status)
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData.thumbnail_url || "");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbnailFileInputRef = useRef<HTMLInputElement | null>(null);
  const [content, setContent] = useState<string>(() => {
    const raw = initialData.content || "";
    if (isImportedContent(raw)) return raw;
    return stripLeadText(raw, initialData.summary || "");
  });
  const [userProfile, setUserProfile] = useState<{ name: string; avatar_url: string | null; email: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.profile) {
          setUserProfile({
            name: data.profile.name ?? "ユーザー",
            avatar_url: data.profile.avatar_url ?? null,
            email: data.profile.email ?? "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    }
    fetchProfile();
  }, []);

  const titleLength = title.length;
  const contentLength = content.length;
  const isTitleValid = titleLength <= TITLE_MAX_LENGTH;
  const isContentValid = contentLength <= CONTENT_MAX_LENGTH;
  const canSubmit = isTitleValid && isContentValid && title.trim().length > 0 && content.trim().length > 0;

  const handleUpdate = async () => {
    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    if (!canSubmit) {
      toast.error("入力内容を確認してください");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await updatePost(articleId, {
        title: title.trim(),
        leadText: leadText.trim(),
        category: category || "教育ICT",
        tags,
        publishType,
        thumbnailUrl,
        ...(isImportedContent(content)
          ? { content }
          : { blocks: contentToBlocks(content) as Parameters<typeof updatePost>[1]["blocks"] }),
      });
      if (result.success) {
        toast.success("記事を更新しました");
        router.push(`/articles/${articleId}`);
        router.refresh();
      } else {
        toast.error(result.error || "更新に失敗しました");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error("更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("本当にこの記事を削除しますか？この操作は取り消せません。")) return;
    setIsDeleting(true);
    try {
      const result = await deleteArticle(articleId);
      if (result.success) {
        toast.success("記事を削除しました");
        router.push("/provider-dashboard");
        router.refresh();
      } else {
        toast.error(result.error || "削除に失敗しました");
      }
    } catch (err) {
      toast.error("削除に失敗しました");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderPreview = () => (
    <div className="max-w-3xl mx-auto space-y-6">
      {thumbnailUrl && (
        <div className="rounded-xl overflow-hidden">
          <div className="relative w-full h-[300px]">
            <ImageWithUrlError originalSrc={thumbnailUrl} alt={title} fill className="object-contain" unoptimized />
          </div>
        </div>
      )}
      <h1 className="text-4xl font-bold">{title || "タイトル未設定"}</h1>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString("ja-JP")}
        </span>
        {category && <Badge variant="outline">{category}</Badge>}
      </div>
      {leadText && (
        <p className="text-lg text-muted-foreground leading-relaxed">{leadText}</p>
      )}
      <div className="border-t pt-6">
        <BlocksContentPreview content={content} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/articles/${articleId}`}>記事に戻る</Link>
            </Button>
            <h1 className="text-lg font-semibold">記事を編集</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${canSubmit ? "text-muted-foreground" : "text-destructive"}`}>
              合計: {(title.length + leadText.length + contentLength).toLocaleString()} 文字
            </span>
            <Button variant="outline" size="sm" onClick={handleUpdate} disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              更新する
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isSubmitting || isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              削除
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="edit"><FileText className="h-4 w-4 mr-2" />編集</TabsTrigger>
                <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-2" />プレビュー</TabsTrigger>
              </TabsList>

              <TabsContent value="edit" className="space-y-6">
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {thumbnailUrl ? (
                      <div className="relative group">
                        <div className="relative w-full h-[200px] rounded-lg overflow-hidden">
                          <ImageWithUrlError originalSrc={thumbnailUrl} alt="サムネイル" fill className="object-contain rounded-lg" unoptimized />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-4">
                          <Button variant="secondary" size="sm" onClick={() => thumbnailFileInputRef.current?.click()}>変更</Button>
                          <Button variant="destructive" size="sm" onClick={() => setThumbnailUrl("")}>削除</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <ImageIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                          <p className="font-medium">サムネイル画像を設定</p>
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
                                setThumbnailUrl(result.url);
                                toast.success("サムネイルをアップロードしました");
                              } else {
                                toast.error(result.error || "アップロードに失敗しました");
                              }
                            } catch (err) {
                              toast.error("アップロードに失敗しました");
                            } finally {
                              setThumbnailUploading(false);
                              e.target.value = "";
                            }
                          }}
                        />
                        <Button variant="outline" onClick={() => thumbnailFileInputRef.current?.click()} disabled={thumbnailUploading}>
                          {thumbnailUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          画像をアップロード
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))}
                        placeholder="記事タイトルを入力..."
                        className={`flex-1 text-3xl font-bold bg-transparent outline-none border-none ${!isTitleValid ? "text-destructive" : ""}`}
                        maxLength={TITLE_MAX_LENGTH}
                      />
                      <span className={`text-sm whitespace-nowrap ${isTitleValid ? "text-muted-foreground" : "text-destructive"}`}>
                        {titleLength} / {TITLE_MAX_LENGTH}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <Textarea
                      value={leadText}
                      onChange={(e) => setLeadText(e.target.value)}
                      placeholder="リード文（概要）を入力..."
                      className="border-none shadow-none resize-none text-lg text-muted-foreground focus-visible:ring-0"
                      rows={3}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">本文</CardTitle>
                      <div className={`text-sm ${isContentValid ? "text-muted-foreground" : "text-destructive"}`}>
                        {contentLength.toLocaleString()} / {CONTENT_MAX_LENGTH.toLocaleString()} 文字
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ContentEditorWithImport
                      content={content}
                      onChange={setContent}
                      parseToBlocks={contentToBlocks}
                      blocksToContent={blocksToMarkdown}
                      maxLength={CONTENT_MAX_LENGTH}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="preview">
                <Card>
                  <CardContent className="py-12">{renderPreview()}</CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4" />公開設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">公開範囲</label>
                  <div className="space-y-2">
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${publishType === "public" ? "border-primary bg-primary/5" : ""}`}>
                      <input type="radio" checked={publishType === "public"} onChange={() => setPublishType("public")} className="sr-only" />
                      <Globe className="h-4 w-4 text-green-600" />
                      <div><p className="font-medium text-sm">一般公開</p></div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${publishType === "member" ? "border-primary bg-primary/5" : ""}`}>
                      <input type="radio" checked={publishType === "member"} onChange={() => setPublishType("member")} className="sr-only" />
                      <Users className="h-4 w-4 text-blue-600" />
                      <div><p className="font-medium text-sm">会員限定</p></div>
                    </label>
                    <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${publishType === "draft" ? "border-primary bg-primary/5" : ""}`}>
                      <input type="radio" checked={publishType === "draft"} onChange={() => setPublishType("draft")} className="sr-only" />
                      <Lock className="h-4 w-4 text-gray-600" />
                      <div><p className="font-medium text-sm">下書き</p></div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4" />カテゴリ・タグ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">カテゴリ</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="カテゴリを選択" /></SelectTrigger>
                    <SelectContent>
                      {SHARED_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">タグ</label>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="タグをカンマ区切りで入力" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" />投稿者情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt={userProfile.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <School className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{userProfile?.name || "ユーザー"}</p>
                    <p className="text-sm text-muted-foreground">{userProfile?.email || ""}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4" />投稿ガイドライン</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>・教育現場に役立つ情報を心がけてください</li>
                  <li>・著作権・肖像権に配慮した画像を使用</li>
                  <li>・誇大広告や誤解を招く表現はNG</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
