"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlockEditor, ContentBlock } from "@/components/editor/block-editor";
import { createService, uploadImage } from "@/app/_actions";
import { SERVICE_CATEGORIES } from "@/lib/categories";
import { Image as ImageIcon, Loader2, Save, Send, Building2, School } from "lucide-react";

export default function ServiceCreatePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceInfo, setPriceInfo] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);

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
  const contentLength = blocks.reduce((acc, b) => acc + (b.content?.length || 0) + (b.items?.join("").length || 0), 0);
  const totalWordCount = titleLength + descriptionLength + contentLength;
  
  // バリデーション
  const isTitleValid = titleLength <= TITLE_MAX_LENGTH;
  const isDescriptionValid = descriptionLength <= DESCRIPTION_MAX_LENGTH;
  const isContentValid = contentLength <= CONTENT_MAX_LENGTH;
  const canSubmit = isTitleValid && isDescriptionValid && isContentValid && title.trim().length > 0 && description.trim().length > 0 && category.trim().length > 0;

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
        blocks: blocks as unknown as Parameters<typeof createService>[0]["blocks"],
        publishType,
      });

      if (result.success && result.serviceId) {
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
            <Badge variant="outline" className={`text-xs ${canSubmit ? "" : "border-destructive text-destructive"}`}>
              合計: {totalWordCount.toLocaleString()} 文字
            </Badge>
          </div>
          <div className="flex items-center gap-2">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">サムネイル</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {thumbnailUrl ? (
              <div className="relative group">
                <img
                  src={thumbnailUrl}
                  alt="サムネイル"
                  className="w-full h-[200px] object-contain rounded-lg"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      thumbnailFileInputRef.current?.click();
                    }}
                  >
                    変更
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setThumbnailUrl("")}>
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
            <BlockEditor blocks={blocks} onChange={setBlocks} maxLength={CONTENT_MAX_LENGTH} />
            {!isContentValid && (
              <p className="text-destructive text-sm mt-2">
                本文は{CONTENT_MAX_LENGTH.toLocaleString()}文字以内で入力してください
              </p>
            )}
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
}

