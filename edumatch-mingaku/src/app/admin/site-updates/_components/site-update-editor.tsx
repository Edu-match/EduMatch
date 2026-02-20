"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BlockEditor, type ContentBlock } from "@/components/editor/block-editor";
import { createSiteUpdate, updateSiteUpdate } from "@/app/_actions/site-updates";
import { bodyToBlocks, type SiteUpdateContentBlock } from "@/lib/site-update-blocks";
import { uploadImage } from "@/app/_actions";
import { Image as ImageIcon, Loader2, Save, Send, Building2, FileText } from "lucide-react";
import { getCurrentUserProfile } from "@/app/_actions/user";

const TITLE_MAX_LENGTH = 200;
const CONTENT_MAX_LENGTH = 50000;

function normalizeBlockType(block: SiteUpdateContentBlock): ContentBlock {
  const b = { ...block };
  if (b.type === "list") (b as ContentBlock).type = "bulletList";
  else if (b.type === "ordered-list") (b as ContentBlock).type = "numberedList";
  return b as ContentBlock;
}

type InitialProfile = { name: string; avatar_url: string | null; email: string };

type Props = {
  mode: "create" | "edit";
  id?: string;
  defaultTitle?: string;
  defaultBody?: string;
  defaultPublishedAt?: string; // datetime-local value
  defaultLink?: string;
  defaultThumbnailUrl?: string;
  defaultCategory?: string;
  /** サーバーで取得済みのプロフィール（渡すとクライアントでの取得を行わない） */
  initialProfile?: InitialProfile | null;
};

export function SiteUpdateEditor({
  mode,
  id,
  defaultTitle = "",
  defaultBody = "",
  defaultPublishedAt = "",
  defaultLink = "",
  defaultThumbnailUrl = "",
  defaultCategory = "",
  initialProfile = null,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [publishedAt, setPublishedAt] = useState(defaultPublishedAt);
  const [link, setLink] = useState(defaultLink);
  const [thumbnailUrl, setThumbnailUrl] = useState(defaultThumbnailUrl);
  const [category, setCategory] = useState(defaultCategory);
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    if (!defaultBody.trim()) return [];
    return bodyToBlocks(defaultBody).map(normalizeBlockType);
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbnailFileInputRef = useRef<HTMLInputElement | null>(null);
  const [userProfile, setUserProfile] = useState<InitialProfile | null>(initialProfile ?? null);

  const contentLength = blocks.reduce(
    (acc, b) => acc + (b.content?.length || 0) + (b.items?.join("").length || 0),
    0
  );
  const titleLength = title.length;
  const isTitleValid = titleLength <= TITLE_MAX_LENGTH;
  const isContentValid = contentLength <= CONTENT_MAX_LENGTH;
  const canSubmit =
    isTitleValid &&
    isContentValid &&
    title.trim().length > 0 &&
    (blocks.length > 0 || mode === "edit");

  useEffect(() => {
    if (initialProfile != null) return;
    async function fetchProfile() {
      try {
        const profile = await getCurrentUserProfile();
        if (profile) setUserProfile(profile);
      } catch (e) {
        console.error(e);
      }
    }
    fetchProfile();
  }, [initialProfile]);

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    if (titleLength > TITLE_MAX_LENGTH) {
      toast.error(`タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください`);
      return;
    }
    if (contentLength > CONTENT_MAX_LENGTH) {
      toast.error(`本文は${CONTENT_MAX_LENGTH.toLocaleString()}文字以内で入力してください`);
      return;
    }

    const publishedAtValue = publishedAt || new Date().toISOString().slice(0, 16);
    const publishedAtISO = new Date(publishedAtValue).toISOString();

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const result = await createSiteUpdate({
          title: title.trim(),
          blocks: blocks as SiteUpdateContentBlock[],
          published_at: publishedAtISO,
          link: link.trim() || null,
          thumbnail_url: thumbnailUrl.trim() || null,
          category: category.trim() || null,
        });
        if (result.success && result.id) {
          toast.success("投稿しました");
          router.push("/admin/site-updates");
          router.refresh();
        } else {
          toast.error(result.error ?? "作成に失敗しました");
        }
      } else if (mode === "edit" && id) {
        const result = await updateSiteUpdate({
          id,
          title: title.trim(),
          blocks: blocks as SiteUpdateContentBlock[],
          published_at: publishedAtISO,
          link: link.trim() || null,
          thumbnail_url: thumbnailUrl.trim() || null,
          category: category.trim() || null,
        });
        if (result.success) {
          toast.success("更新しました");
          router.push("/admin/site-updates");
          router.refresh();
        } else {
          toast.error(result.error ?? "更新に失敗しました");
        }
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
            <h1 className="text-lg font-semibold">
              {mode === "create" ? "運営記事を投稿" : "運営記事を編集"}
            </h1>
            <Badge variant="outline" className={`text-xs ${canSubmit ? "" : "border-destructive text-destructive"}`}>
              合計: {(titleLength + contentLength).toLocaleString()} 文字
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/site-updates">キャンセル</Link>
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {mode === "create" ? "投稿する" : "更新する"}
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
                    onClick={() => thumbnailFileInputRef.current?.click()}
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
                    toast.error(result.error ?? "アップロードに失敗しました");
                  }
                } finally {
                  setThumbnailUploading(false);
                  e.target.value = "";
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
                    const v = e.target.value;
                    if (v.length <= TITLE_MAX_LENGTH) setTitle(v);
                  }}
                  placeholder="タイトル"
                  maxLength={TITLE_MAX_LENGTH}
                  className={`flex-1 ${!isTitleValid ? "border-destructive" : ""}`}
                />
                <span className={`text-sm whitespace-nowrap ${isTitleValid ? "text-muted-foreground" : "text-destructive"}`}>
                  {titleLength} / {TITLE_MAX_LENGTH}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">公開日時</label>
                <Input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                />
              </div>
              <Input
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="カテゴリ（任意）"
              />
            </div>
            <Input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="元リンク（外部URL・任意）"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                詳細（本文）
              </CardTitle>
              <span className={`text-sm ${isContentValid ? "text-muted-foreground" : "text-destructive"}`}>
                {contentLength.toLocaleString()} / {CONTENT_MAX_LENGTH.toLocaleString()} 文字
              </span>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              投稿者（運営）
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
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-medium">{userProfile?.name || "運営"}</p>
                <p className="text-sm text-muted-foreground">{userProfile?.email || ""}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
