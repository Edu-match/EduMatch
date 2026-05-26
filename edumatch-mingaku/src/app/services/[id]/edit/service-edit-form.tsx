"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContentEditorWithImport } from "@/components/content/content-editor-with-import";
import { BlocksContentPreview } from "@/components/content/blocks-content-preview";
import { contentToBlocks, blocksToMarkdown } from "@/lib/markdown-to-blocks";
import {
  Image as ImageIcon,
  Loader2,
  Save,
  Eye,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  School,
  Trash2,
} from "lucide-react";
import {
  deleteServiceManagement,
  updateService,
  uploadImage,
} from "@/app/_actions";
import {
  parseServiceCategorySelection,
  serializeServiceCategorySelection,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_MAX_SELECTION,
  SERVICE_CATEGORY_OTHER_MAX_LENGTH,
  SERVICE_CATEGORY_OTHER_VALUE,
} from "@/lib/categories";
import { ImageWithUrlError } from "@/components/ui/image-with-url-error";
import { isImportedContent } from "@/lib/imported-content";

const AVATAR_TEMPLATES = [
  "/avatars/templates/1.svg",
  "/avatars/templates/2.svg",
  "/avatars/templates/3.svg",
  "/avatars/templates/4.svg",
] as const;

type ServiceEditFormProps = {
  serviceId: string;
  initialData: {
    title: string;
    provider_display_name: string;
    provider_display_avatar_url: string;
    request_notification_emails: string;
    show_material_request_button: boolean;
    sort_order: string;
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
  const [activeTab, setActiveTab] = useState("edit");
  const [title, setTitle] = useState(initialData.title ?? "");
  const [requestNotificationEmailList, setRequestNotificationEmailList] =
    useState<string[]>(() => {
      const parsed = (initialData.request_notification_emails || "")
        .split(/[\n,]/)
        .map((token) => token.trim())
        .filter(Boolean)
        .slice(0, 3);
      return [parsed[0] ?? "", parsed[1] ?? "", parsed[2] ?? ""];
    });
  const materialRequestAllowed = initialData.sort_order !== "NONE";
  const [showMaterialRequestButton, setShowMaterialRequestButton] = useState(
    materialRequestAllowed ? (initialData.show_material_request_button ?? true) : false
  );
  const [description, setDescription] = useState(initialData.description ?? "");
  const [category, setCategory] = useState(initialData.category ?? "");
  const [otherCategoryText, setOtherCategoryText] = useState(
    parseServiceCategorySelection(initialData.category ?? "").otherText
  );
  const [priceInfo, setPriceInfo] = useState(initialData.price_info ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initialData.youtube_url ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData.thumbnail_url ?? "");
  const [content, setContent] = useState(initialData.content ?? "");
  const [providerDisplayName, setProviderDisplayName] = useState(
    initialData.provider_display_name ?? ""
  );
  const [providerDisplayAvatarUrl, setProviderDisplayAvatarUrl] = useState(
    initialData.provider_display_avatar_url ?? ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [posterAvatarUploading, setPosterAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [lastSavedText, setLastSavedText] = useState("未保存");

  const thumbnailFileInputRef = useRef<HTMLInputElement | null>(null);
  const posterAvatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [userProfile, setUserProfile] = useState<{
    name: string;
    avatar_url: string | null;
    email: string;
  } | null>(null);

  const TITLE_MAX_LENGTH = 80;
  const DESCRIPTION_MAX_LENGTH = 300;
  const CONTENT_MAX_LENGTH = 5000;
  const titleLength = title.length;
  const descriptionLength = description.length;
  const contentLength = content.length;
  const totalWordCount = titleLength + descriptionLength + contentLength;
  const { selectedCategories } = parseServiceCategorySelection(category);
  const hasOtherCategory = selectedCategories.includes(SERVICE_CATEGORY_OTHER_VALUE);
  const canSelectMoreCategories = selectedCategories.length < SERVICE_CATEGORY_MAX_SELECTION;
  const isTitleValid = titleLength <= TITLE_MAX_LENGTH;
  const isDescriptionValid = descriptionLength <= DESCRIPTION_MAX_LENGTH;
  const isContentValid = contentLength <= CONTENT_MAX_LENGTH;
  const canSubmit =
    isTitleValid &&
    isDescriptionValid &&
    isContentValid &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    category.trim().length > 0 &&
    content.trim().length > 0;

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
        }
      } catch (fetchErr) {
        console.error("Failed to fetch profile:", fetchErr);
      }
    }
    fetchProfile();
  }, []);

  useEffect(() => {
    const updateLastSavedText = () => {
      if (!lastSaved) {
        setLastSavedText("未保存");
        return;
      }
      const diff = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      if (diff < 60) setLastSavedText("たった今");
      else if (diff < 3600) setLastSavedText(`${Math.floor(diff / 60)}分前`);
      else {
        setLastSavedText(
          lastSaved.toLocaleTimeString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
    };
    updateLastSavedText();
    const interval = setInterval(updateLastSavedText, 60000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  async function submit() {
    setError(null);
    if (titleLength > TITLE_MAX_LENGTH) {
      setError(`サービス名は${TITLE_MAX_LENGTH}文字以内で入力してください`);
      return;
    }
    if (descriptionLength > DESCRIPTION_MAX_LENGTH) {
      setError(`概要は${DESCRIPTION_MAX_LENGTH}文字以内で入力してください`);
      return;
    }
    if (contentLength > CONTENT_MAX_LENGTH) {
      setError(`本文は${CONTENT_MAX_LENGTH.toLocaleString()}文字以内で入力してください`);
      return;
    }
    if (!title.trim() || !description.trim() || !category.trim() || !content.trim()) {
      setError("サービス名・概要・カテゴリ・本文を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const isApproved = initialData.status === "APPROVED";
      const result = await updateService(serviceId, {
        title: title.trim(),
        providerDisplayName: providerDisplayName.trim() || undefined,
        providerDisplayAvatarUrl: providerDisplayAvatarUrl.trim() || null,
        requestNotificationEmails: requestNotificationEmailList
          .map((token) => token.trim())
          .filter(Boolean),
        showMaterialRequestButton: materialRequestAllowed ? showMaterialRequestButton : false,
        description: description.trim(),
        category: serializeServiceCategorySelection(selectedCategories, otherCategoryText),
        priceInfo: priceInfo.trim() || "お問い合わせ",
        youtubeUrl: youtubeUrl.trim() || undefined,
        thumbnailUrl,
        ...(isImportedContent(content)
          ? { content }
          : {
              blocks: contentToBlocks(
                content
              ) as unknown as Parameters<typeof updateService>[1]["blocks"],
            }),
        publishType: isApproved ? "draft" : initialData.status === "DRAFT" ? "draft" : "submit",
      });

      if (result.success) {
        setLastSaved(new Date());
        toast.success("保存しました");
        router.push(`/services/${serviceId}`);
        router.refresh();
      } else {
        setError(result.error || "サービスの更新に失敗しました");
      }
    } catch (err) {
      console.error(err);
      setError("サービスの更新に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("本当にこのサービスを削除しますか？")) return;
    setIsDeleting(true);
    const result = await deleteServiceManagement(serviceId);
    setIsDeleting(false);
    if (result.success) {
      router.push("/provider-dashboard?message=サービスを削除しました");
    } else {
      setError(result.error || "削除に失敗しました");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">サービスを編集</h1>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              最終更新: {lastSavedText}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${canSubmit ? "text-muted-foreground" : "text-destructive"}`}>
              合計: {totalWordCount.toLocaleString()} 文字
            </span>
            <Button size="sm" onClick={() => submit()} disabled={isSubmitting || !canSubmit}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isSubmitting || isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              削除
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-6">
        {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">{error}</div>}

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
                  </div>
                ) : null}

                <input
                  ref={thumbnailFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;
                    setThumbnailUploading(true);
                    const formData = new FormData();
                    formData.append("file", file);
                    const result = await uploadImage(formData);
                    setThumbnailUploading(false);
                    if (result.success && result.url) {
                      setThumbnailUrl(result.url);
                    } else {
                      toast.error(result.error || "アップロードに失敗しました");
                    }
                    e.currentTarget.value = "";
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => thumbnailFileInputRef.current?.click()} disabled={thumbnailUploading}>
                    {thumbnailUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                    画像を選択
                  </Button>
                  <Input
                    placeholder="サムネイルURL"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    className="flex-1 min-w-[200px]"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">基本情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input value={title} onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX_LENGTH))} placeholder="サービス名" />
                <Textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX_LENGTH))} rows={3} placeholder="概要（短い説明）" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">カテゴリ</label>
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
                                ? selectedCategories.filter((v) => v !== cat.value)
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
                            ? selectedCategories.filter((v) => v !== SERVICE_CATEGORY_OTHER_VALUE)
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
                        placeholder="その他カテゴリ"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">料金情報</label>
                    <Input value={priceInfo} onChange={(e) => setPriceInfo(e.target.value)} placeholder="例: 月額〜 / お問い合わせ" />
                  </div>
                </div>

                <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="YouTube URL（任意）" />

                <div className="space-y-2">
                  <label className="text-sm font-medium">資料請求の通知先メール（任意）</label>
                  <div className="space-y-2">
                    {requestNotificationEmailList.map((email, idx) => (
                      <Input
                        key={idx}
                        type="email"
                        value={email}
                        placeholder={`通知先メール${idx + 1}`}
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
                </div>

                {materialRequestAllowed ? (
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={showMaterialRequestButton}
                      onChange={(e) => setShowMaterialRequestButton(e.target.checked)}
                    />
                    サービス詳細に「資料請求する（無料）」ボタンを表示する
                  </label>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    表示順が「なし」のサービスでは、資料請求ボタンは表示されません。
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">詳細（本文）</CardTitle>
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
              <CardContent className="py-12">
                <div className="max-w-3xl mx-auto space-y-6">
                  {thumbnailUrl && (
                    <div className="rounded-xl overflow-hidden relative h-[200px]">
                      <ImageWithUrlError originalSrc={thumbnailUrl} alt={title} fill className="object-contain" unoptimized />
                    </div>
                  )}
                  <h1 className="text-3xl font-bold">{title || "タイトル未設定"}</h1>
                  {description && <p className="text-lg text-muted-foreground">{description}</p>}
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <School className="h-4 w-4" />
              投稿者情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {(providerDisplayAvatarUrl || userProfile?.avatar_url) ? (
                <Image
                  src={providerDisplayAvatarUrl || userProfile?.avatar_url || ""}
                  alt={providerDisplayName || userProfile?.name || "投稿者"}
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <School className="h-6 w-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <Input
                  value={providerDisplayName}
                  onChange={(e) => setProviderDisplayName(e.target.value)}
                  placeholder="投稿ページの表示名（例: 株式会社○○）"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  アカウント名は変更されず、このサービスページに表示する名称のみ更新されます。
                </p>
                <p className="text-xs text-muted-foreground">
                  アイコンもこのサービスページ専用です。アカウントのアイコンは変更されません。
                </p>
                <p className="text-xs text-muted-foreground">{userProfile?.email || ""}</p>
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
                setPosterAvatarUploading(true);
                const formData = new FormData();
                formData.append("file", file);
                const result = await uploadImage(formData);
                setPosterAvatarUploading(false);
                const uploadedUrl = result.success && typeof result.url === "string" ? result.url : null;
                if (uploadedUrl) {
                  setProviderDisplayAvatarUrl(uploadedUrl);
                } else {
                  toast.error(result.error || "画像アップロードに失敗しました");
                }
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => posterAvatarFileInputRef.current?.click()}
              disabled={posterAvatarUploading || isSubmitting}
            >
              {posterAvatarUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4 mr-2" />
              )}
              アイコン画像をアップロード
            </Button>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">またはテンプレートから選択</p>
              <div className="flex flex-wrap gap-2">
                {AVATAR_TEMPLATES.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setProviderDisplayAvatarUrl(url)}
                    className={`h-10 w-10 rounded-full border-2 overflow-hidden transition-all ${
                      providerDisplayAvatarUrl === url
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-muted hover:border-primary/50"
                    }`}
                    aria-label="テンプレート画像を選択"
                  >
                    <Image
                      src={url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </button>
                ))}
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
