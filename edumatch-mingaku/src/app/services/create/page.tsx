"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { contentToBlocks } from "@/lib/markdown-to-blocks";
import { blocksToMarkdown } from "@/lib/markdown-to-blocks";
import { isImportedContent } from "@/lib/imported-content";
import { createService, uploadImage } from "@/app/_actions";
import { SERVICE_CATEGORIES } from "@/lib/categories";
import { ImageWithUrlError } from "@/components/ui/image-with-url-error";
import {
  Image as ImageIcon,
  Loader2,
  Save,
  Send,
  Building2,
  School,
  Eye,
  FileText,
  Check,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const STORAGE_KEY = "edumatch-service-draft";

interface ServiceDraft {
  title: string;
  description: string;
  category: string;
  priceInfo: string;
  youtubeUrl: string;
  thumbnailUrl: string;
  content: string;
  savedAt: string;
}

function loadDraftFromStorage(): ServiceDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as ServiceDraft) : null;
  } catch (e) {
    console.warn("Failed to load service draft:", e);
    return null;
  }
}

export default function ServiceCreatePage() {
  const router = useRouter();
  const [draft] = useState<ServiceDraft | null>(() => loadDraftFromStorage());
  const [activeTab, setActiveTab] = useState("edit");

  const [title, setTitle] = useState(() => draft?.title || "");
  const [description, setDescription] = useState(() => draft?.description || "");
  const [category, setCategory] = useState(() => draft?.category || "");
  const [priceInfo, setPriceInfo] = useState(() => draft?.priceInfo || "");
  const [youtubeUrl, setYoutubeUrl] = useState(() => draft?.youtubeUrl || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(() => draft?.thumbnailUrl || "");
  const [content, setContent] = useState(() => draft?.content || "");
  const [lastSaved, setLastSaved] = useState<Date | null>(() =>
    draft?.savedAt ? new Date(draft.savedAt) : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [lastSavedText, setLastSavedText] = useState("未保存");
  const [editorResetKey, setEditorResetKey] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbnailFileInputRef = useRef<HTMLInputElement | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar_url: string | null; email: string } | null>(null);

  // 文字数制限
  const TITLE_MAX_LENGTH = 80;
  const DESCRIPTION_MAX_LENGTH = 300;
  const CONTENT_MAX_LENGTH = 5000;
  
  // 文字数カウント
  const titleLength = title.length;
  const descriptionLength = description.length;
  const contentLength = content.length;
  const totalWordCount = titleLength + descriptionLength + contentLength;
  
  // バリデーション
  const isTitleValid = titleLength <= TITLE_MAX_LENGTH;
  const isDescriptionValid = descriptionLength <= DESCRIPTION_MAX_LENGTH;
  const isContentValid = contentLength <= CONTENT_MAX_LENGTH;
  const canSubmit = isTitleValid && isDescriptionValid && isContentValid && title.trim().length > 0 && description.trim().length > 0 && category.trim().length > 0 && content.trim().length > 0;

  const saveLocalDraft = () => {
    setIsSaving(true);
    try {
      const nextDraft: ServiceDraft = {
        title,
        description,
        category,
        priceInfo,
        youtubeUrl,
        thumbnailUrl,
        content,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
      setLastSaved(new Date());
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (e) {
      console.error("Failed to save service draft:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTitle("");
    setDescription("");
    setCategory("");
    setPriceInfo("");
    setYoutubeUrl("");
    setThumbnailUrl("");
    setContent("");
    setActiveTab("edit");
    setEditorResetKey((prev) => prev + 1);
    setLastSaved(null);
    toast.info("入力内容をクリアしました");
  };

  // ユーザープロフィールを取得
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

  useEffect(() => {
    const interval = setInterval(() => {
      if (!title && !description && !content) return;
      try {
        const nextDraft: ServiceDraft = {
          title,
          description,
          category,
          priceInfo,
          youtubeUrl,
          thumbnailUrl,
          content,
          savedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
      } catch (e) {
        console.error("Service auto-save failed:", e);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [title, description, category, priceInfo, youtubeUrl, thumbnailUrl, content]);

  useEffect(() => {
    const updateLastSavedText = () => {
      if (!lastSaved) {
        setLastSavedText("未保存");
        return;
      }
      const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      if (diff < 60) {
        setLastSavedText("たった今");
      } else if (diff < 3600) {
        setLastSavedText(`${Math.floor(diff / 60)}分前`);
      } else {
        setLastSavedText(
          lastSaved.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
        );
      }
    };
    updateLastSavedText();
    const interval = setInterval(updateLastSavedText, 60000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  async function submit(publishType: "draft" | "submit") {
    if (!title.trim()) {
      toast.error("サービス名を入力してください");
      return;
    }
    if (titleLength > TITLE_MAX_LENGTH) {
      toast.error(`サービス名は${TITLE_MAX_LENGTH}文字以内で入力してください`);
      return;
    }
    if (!description.trim()) {
      toast.error("概要を入力してください");
      return;
    }
    if (descriptionLength > DESCRIPTION_MAX_LENGTH) {
      toast.error(`概要は${DESCRIPTION_MAX_LENGTH}文字以内で入力してください`);
      return;
    }
    if (contentLength > CONTENT_MAX_LENGTH) {
      toast.error(`本文は${CONTENT_MAX_LENGTH.toLocaleString()}文字以内で入力してください`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createService({
        title: title.trim(),
        description: description.trim(),
        category,
        priceInfo: priceInfo.trim() || "お問い合わせ",
        youtubeUrl: youtubeUrl.trim() || undefined,
        thumbnailUrl,
        ...(isImportedContent(content)
          ? { content }
          : { blocks: contentToBlocks(content) as unknown as Parameters<typeof createService>[0]["blocks"] }),
        publishType,
      });

      if (result.success && result.serviceId) {
        localStorage.removeItem(STORAGE_KEY);
        toast.success(
          publishType === "submit" ? "投稿申請を受け付けました" : "下書きを保存しました",
          { description: publishType === "submit" ? "管理者の承認後に公開されます。" : undefined }
        );
        router.push(`/services/${result.serviceId}`);
      } else {
        toast.error(publishType === "submit" ? "申請に失敗しました" : "保存に失敗しました", {
          description: result.error || "もう一度お試しください",
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("処理に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">サービスを投稿</h1>
            <Badge variant="outline" className="text-xs">
              {showSaveSuccess ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                  保存しました
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  自動保存: {lastSavedText}
                </>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${canSubmit ? "text-muted-foreground" : "text-destructive"}`}>
              合計: {totalWordCount.toLocaleString()} 文字
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={clearDraft}>
              クリア
            </Button>
            <Button variant="outline" size="sm" onClick={saveLocalDraft} disabled={isSaving || isSubmitting}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              ローカル保存
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => submit("draft")}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              下書き保存
            </Button>
            <Button size="sm" onClick={() => submit("submit")} disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              申請する
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="edit">
              <FileText className="h-4 w-4 mr-2" />
              編集
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-2" />
              プレビュー
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" forceMount className="space-y-6 data-[state=inactive]:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">サムネイル</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {thumbnailUrl ? (
              <div className="relative group h-[200px]">
                <ImageWithUrlError
                  originalSrc={thumbnailUrl}
                  alt="サムネイル"
                  fill
                  className="object-contain rounded-lg"
                  unoptimized
                />
                <div className="pointer-events-none group-hover:pointer-events-auto absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      thumbnailFileInputRef.current?.click();
                    }}
                  >
                    変更
                  </Button>
                  <Button type="button" variant="destructive" size="sm" onClick={() => setThumbnailUrl("")}>
                    削除
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <ImageIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="font-medium">クリックして画像をアップロード</p>
                <p className="text-sm text-muted-foreground mt-1">JPG/PNG/GIF/WebP（最大5MB）</p>
              </div>
            )}

            <input
              ref={thumbnailFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const input = e.currentTarget;
                const file = input.files?.[0];
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
                    toast.error("サムネイルのアップロードに失敗しました", {
                      description: result.error || "もう一度お試しください",
                    });
                  }
                } finally {
                  setThumbnailUploading(false);
                  input.value = "";
                }
              }}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => thumbnailFileInputRef.current?.click()}
                disabled={thumbnailUploading}
              >
                {thumbnailUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    アップロード中...
                  </>
                ) : (
                  "画像を選択"
                )}
              </Button>
              <span className="self-center text-sm text-muted-foreground">または</span>
              <Input
                placeholder="Google Drive / GitHub の画像URL"
                value={thumbnailUrl}
                onChange={(e) => {
                  const v = e.target.value;
                  setThumbnailUrl(v);
                }}
                className="flex-1 min-w-[200px]"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              対応: アップロード画像、Google Drive、GitHub（raw.githubusercontent.com または github.com/.../blob/...）
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Input
                  value={title}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= TITLE_MAX_LENGTH) {
                      setTitle(value);
                    }
                  }}
                  placeholder="サービス名"
                  maxLength={TITLE_MAX_LENGTH}
                  className={`flex-1 ${!isTitleValid ? "border-destructive" : ""}`}
                />
                <span className={`text-sm whitespace-nowrap ${isTitleValid ? "text-muted-foreground" : "text-destructive"}`}>
                  {titleLength} / {TITLE_MAX_LENGTH}
                </span>
              </div>
              {!isTitleValid && (
                <p className="text-destructive text-xs">
                  タイトルは{TITLE_MAX_LENGTH}文字以内で入力してください
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Textarea
                  value={description}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= DESCRIPTION_MAX_LENGTH) {
                      setDescription(value);
                    }
                  }}
                  placeholder="概要（短い説明）"
                  rows={3}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  className={`pr-20 ${!isDescriptionValid ? "border-destructive" : ""}`}
                />
                <span className={`absolute top-2 right-2 text-sm ${isDescriptionValid ? "text-muted-foreground" : "text-destructive"}`}>
                  {descriptionLength} / {DESCRIPTION_MAX_LENGTH}
                </span>
              </div>
              {!isDescriptionValid && (
                <p className="text-destructive text-xs">
                  概要は{DESCRIPTION_MAX_LENGTH}文字以内で入力してください
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">カテゴリ</label>
                <Select value={category || undefined} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="カテゴリを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">料金情報</label>
                <Input
                  value={priceInfo}
                  onChange={(e) => setPriceInfo(e.target.value)}
                  placeholder="例: 月額〜 / お問い合わせ"
                />
              </div>
            </div>
            <Input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="YouTube URL（任意）"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">詳細（本文）</CardTitle>
              <div className={`text-sm ${isContentValid ? "text-muted-foreground" : "text-destructive"}`}>
                {contentLength.toLocaleString()} / {CONTENT_MAX_LENGTH.toLocaleString()} 文字
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ContentEditorWithImport
              key={`service-editor-${editorResetKey}`}
              content={content}
              onChange={setContent}
              parseToBlocks={contentToBlocks}
              blocksToContent={blocksToMarkdown}
              maxLength={CONTENT_MAX_LENGTH}
            />
            {!isContentValid && (
              <p className="text-destructive text-sm mt-2">
                本文は{CONTENT_MAX_LENGTH.toLocaleString()}文字以内で入力してください
              </p>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardContent className="py-12">
                <div className="max-w-3xl mx-auto space-y-6">
                  {thumbnailUrl && (
                    <div className="rounded-xl overflow-hidden relative h-[200px]">
                      <ImageWithUrlError
                        originalSrc={thumbnailUrl}
                        alt={title}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  )}
                  <h1 className="text-3xl font-bold">{title || "タイトル未設定"}</h1>
                  {description && (
                    <p className="text-lg text-muted-foreground">{description}</p>
                  )}
                  {category && (
                    <Badge variant="outline">{SERVICE_CATEGORIES.find((c) => c.value === category)?.label ?? category}</Badge>
                  )}
                  <div className="border-t pt-6">
                    <BlocksContentPreview content={content} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* 投稿者情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              投稿者情報
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
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
            <CardTitle className="text-base">公開前チェック</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <CheckItem checked={title.trim().length > 0} label="サービス名を入力" />
              <CheckItem checked={description.trim().length > 0} label="概要を入力" />
              <CheckItem checked={thumbnailUrl.trim().length > 0} label="サムネイル画像を設定" />
              <CheckItem checked={content.trim().length > 0} label="本文を作成" />
              <CheckItem checked={category.trim().length > 0} label="カテゴリを選択" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              投稿ガイドライン
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>・特徴だけでなく導入後の効果を具体的に記載してください</li>
              <li>・価格と問い合わせ方法を明確にしてください</li>
              <li>・誇大広告や誤解を招く表現は避けてください</li>
              <li>・公開前に編集部による審査があります</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CheckItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className={`h-4 w-4 ${checked ? "text-green-500" : "text-gray-300"}`} />
      <span className={`text-sm ${checked ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

