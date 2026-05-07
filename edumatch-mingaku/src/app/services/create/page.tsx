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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ContentEditorWithImport } from "@/components/content/content-editor-with-import";
import { BlocksContentPreview } from "@/components/content/blocks-content-preview";
import { contentToBlocks } from "@/lib/markdown-to-blocks";
import { blocksToMarkdown } from "@/lib/markdown-to-blocks";
import { isImportedContent } from "@/lib/imported-content";
import { createService, updateProfile, uploadImage } from "@/app/_actions";
import {
  parseServiceCategorySelection,
  serializeServiceCategorySelection,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_MAX_SELECTION,
  SERVICE_CATEGORY_OTHER_MAX_LENGTH,
  SERVICE_CATEGORY_OTHER_VALUE,
} from "@/lib/categories";
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
  requestNotificationEmails: string;
  showMaterialRequestButton: boolean;
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
  const [requestNotificationEmailList, setRequestNotificationEmailList] = useState<string[]>(() => {
    const parsed = (draft?.requestNotificationEmails || "")
      .split(/[\n,]/)
      .map((token) => token.trim())
      .filter(Boolean)
      .slice(0, 3);
    return [parsed[0] ?? "", parsed[1] ?? "", parsed[2] ?? ""];
  });
  const [showMaterialRequestButton, setShowMaterialRequestButton] = useState(
    () => draft?.showMaterialRequestButton ?? true
  );
  const [description, setDescription] = useState(() => draft?.description || "");
  const [category, setCategory] = useState(() => draft?.category || "");
  const [otherCategoryText, setOtherCategoryText] = useState(
    () => parseServiceCategorySelection(draft?.category || "").otherText
  );
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
  const [showClearDialog, setShowClearDialog] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbnailFileInputRef = useRef<HTMLInputElement | null>(null);
  const posterAvatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar_url: string | null; email: string } | null>(null);
  const initialUserProfileRef = useRef<{ name: string; avatar_url: string | null } | null>(null);

  // 文字数制限
  const TITLE_MAX_LENGTH = 80;
  const DESCRIPTION_MAX_LENGTH = 300;
  const CONTENT_MAX_LENGTH = 5000;
  
  // 文字数カウント
  const titleLength = title.length;
  const descriptionLength = description.length;
  const contentLength = content.length;
  const totalWordCount = titleLength + descriptionLength + contentLength;
  const { selectedCategories } = parseServiceCategorySelection(category);
  const hasOtherCategory = selectedCategories.includes(SERVICE_CATEGORY_OTHER_VALUE);
  const canSelectMoreCategories = selectedCategories.length < SERVICE_CATEGORY_MAX_SELECTION;
  
  // バリデーション
  const isTitleValid = titleLength <= TITLE_MAX_LENGTH;
  const isDescriptionValid = descriptionLength <= DESCRIPTION_MAX_LENGTH;
  const isContentValid = contentLength <= CONTENT_MAX_LENGTH;
  const canSubmit = isTitleValid && isDescriptionValid && isContentValid && title.trim().length > 0 && description.trim().length > 0 && category.trim().length > 0 && content.trim().length > 0;

  const saveLocalDraft = () => {
    setIsSaving(true);
    try {
      const nextDraft: ServiceDraft = {
        requestNotificationEmails: requestNotificationEmailList
          .map((email) => email.trim())
          .filter(Boolean)
          .join("\n"),
        showMaterialRequestButton,
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
    setRequestNotificationEmailList(["", "", ""]);
    setShowMaterialRequestButton(true);
    setDescription("");
    setCategory("");
    setOtherCategoryText("");
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
          const profileName = data.profile.name ?? "ユーザー";
          const profileAvatar = data.profile.avatar_url ?? null;
          setUserProfile({
            name: profileName,
            avatar_url: profileAvatar,
            email: data.profile.email ?? "",
          });
          initialUserProfileRef.current = {
            name: profileName,
            avatar_url: profileAvatar,
          };
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
          requestNotificationEmails: requestNotificationEmailList
            .map((email) => email.trim())
            .filter(Boolean)
            .join("\n"),
          showMaterialRequestButton,
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
  }, [requestNotificationEmailList, showMaterialRequestButton, title, description, category, priceInfo, youtubeUrl, thumbnailUrl, content]);

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
    if (titleLength > TITLE_MAX_LENGTH) {
      toast.error(`サービス名は${TITLE_MAX_LENGTH}文字以内で入力してください`);
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
    if (publishType === "submit") {
      if (!title.trim()) {
        toast.error("サービス名を入力してください");
        return;
      }
      if (!description.trim()) {
        toast.error("概要を入力してください");
        return;
      }
      if (selectedCategories.length === 0) {
        toast.error("カテゴリを選択してください");
        return;
      }
      if (selectedCategories.length > SERVICE_CATEGORY_MAX_SELECTION) {
        toast.error(`カテゴリは最大${SERVICE_CATEGORY_MAX_SELECTION}つまで選択できます`);
        return;
      }
    }
    const serializedCategory = serializeServiceCategorySelection(selectedCategories, otherCategoryText);
    const parsedNotificationEmails = requestNotificationEmailList
      .map((token) => token.trim())
      .filter(Boolean);
    setIsSubmitting(true);
    try {
      if (userProfile) {
        const initialProfile = initialUserProfileRef.current;
        const changedName =
          (initialProfile?.name ?? "").trim() !== userProfile.name.trim();
        const changedAvatar =
          (initialProfile?.avatar_url ?? "") !== (userProfile.avatar_url ?? "");
        if (changedName || changedAvatar) {
          const profileResult = await updateProfile({
            name: userProfile.name.trim() || undefined,
            avatar_url: userProfile.avatar_url?.trim() || null,
          });
          if (!profileResult.success) {
            toast.error(profileResult.error || "投稿者情報の保存に失敗しました");
            setIsSubmitting(false);
            return;
          }
          initialUserProfileRef.current = {
            name: userProfile.name.trim(),
            avatar_url: userProfile.avatar_url ?? null,
          };
        }
      }

      const result = await createService({
        title: title.trim(),
        providerDisplayName: userProfile?.name?.trim() || undefined,
        requestNotificationEmails: parsedNotificationEmails,
        showMaterialRequestButton,
        description: description.trim(),
        category: serializedCategory,
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowClearDialog(true)}
            >
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
              <label className="text-sm font-medium">資料請求の通知先メール（任意）</label>
              <div className="space-y-2">
                {requestNotificationEmailList.map((email, idx) => (
                  <Input
                    key={idx}
                    type="email"
                    value={email}
                    placeholder={`通知先メール${idx + 1}${idx === 0 ? "（例: sales@example.com）" : "（任意）"}`}
                    onChange={(e) =>
                      setRequestNotificationEmailList((prev) => {
                        const next = [...prev];
                        next[idx] = e.target.value;
                        return next;
                      })
                    }
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                最大3件まで設定できます。1件以上設定すると、資料請求通知はこの宛先のみに送信され、作成者メールには送信されません。
              </p>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={showMaterialRequestButton}
                  onChange={(e) => setShowMaterialRequestButton(e.target.checked)}
                />
                サービス詳細に「資料請求する（無料）」ボタンを表示する
              </label>
              <p className="text-xs text-muted-foreground">
                有料プラン設定に関わらず、このスイッチで表示/非表示を直接切り替えます。
              </p>
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
                          disabled={!isSelected && !canSelectMoreCategories}
                          onClick={() => {
                            const nextCategories = isSelected
                              ? selectedCategories.filter((value) => value !== cat.value)
                              : [...selectedCategories, cat.value];
                            setCategory(serializeServiceCategorySelection(nextCategories, otherCategoryText));
                          }}
                        >
                          {cat.label}
                        </Button>
                      );
                    })}
                    <Button
                      type="button"
                      size="sm"
                      variant={hasOtherCategory ? "default" : "outline"}
                      disabled={!hasOtherCategory && !canSelectMoreCategories}
                      onClick={() => {
                        const isSelected = hasOtherCategory;
                        const nextCategories = isSelected
                          ? selectedCategories.filter((value) => value !== SERVICE_CATEGORY_OTHER_VALUE)
                          : [...selectedCategories, SERVICE_CATEGORY_OTHER_VALUE];
                        const nextOther = isSelected ? "" : otherCategoryText;
                        setOtherCategoryText(nextOther);
                        setCategory(serializeServiceCategorySelection(nextCategories, nextOther));
                      }}
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
                        setCategory(serializeServiceCategorySelection(selectedCategories, next));
                      }}
                      placeholder="その他カテゴリ（10文字以内）"
                      maxLength={SERVICE_CATEGORY_OTHER_MAX_LENGTH}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    最大{SERVICE_CATEGORY_MAX_SELECTION}つまで選択できます
                    {hasOtherCategory && `（その他: ${otherCategoryText.length}/${SERVICE_CATEGORY_OTHER_MAX_LENGTH}文字）`}
                  </p>
                </div>
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
                  <div className="rounded-lg border p-3 flex items-center gap-3">
                    {userProfile?.avatar_url ? (
                      <img
                        src={userProfile.avatar_url}
                        alt={userProfile.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <School className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="text-sm">
                      <p className="font-medium">{userProfile?.name || "未設定"}</p>
                      <p className="text-muted-foreground">投稿者情報プレビュー</p>
                    </div>
                  </div>
                  {description && (
                    <p className="text-lg text-muted-foreground">{description}</p>
                  )}
                  {category && (
                    <div className="flex flex-wrap gap-2">
                      {category
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
            <div className="space-y-3">
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
                <div className="flex-1 min-w-0">
                  <Input
                    value={userProfile?.name ?? ""}
                    onChange={(e) =>
                      setUserProfile((prev) =>
                        prev ? { ...prev, name: e.target.value } : prev
                      )
                    }
                    placeholder="投稿者名"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {userProfile?.email || ""}
                  </p>
                </div>
              </div>
              <input
                ref={posterAvatarFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append("file", file);
                  const result = await uploadImage(formData);
                  const uploadedUrl =
                    result.success && typeof result.url === "string"
                      ? result.url
                      : null;
                  if (uploadedUrl) {
                    setUserProfile((prev) =>
                      prev ? { ...prev, avatar_url: uploadedUrl } : prev
                    );
                  } else {
                    toast.error(result.error || "画像アップロードに失敗しました");
                  }
                  e.target.value = "";
                }}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => posterAvatarFileInputRef.current?.click()}
                >
                  アイコン画像をアップロード
                </Button>
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
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>入力内容を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              本文・タイトル・設定中の内容がクリアされます。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearDraft}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

