"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentEditorWithImport } from "@/components/content/content-editor-with-import";
import { ArticlePreview } from "@/components/articles/article-preview";
import type { ContentBlock } from "@/components/editor/block-editor";
import { useUndoRedoTextField, UNDO_TYPING_MERGE_MS } from "@/components/editor/use-undo-redo-text-field";
import { createSiteUpdate, updateSiteUpdate } from "@/app/_actions/site-updates";
import { bodyToBlocks, blocksToBody, type SiteUpdateContentBlock } from "@/lib/site-update-blocks";
import { uploadImage } from "@/app/_actions";
import {
  Eye,
  Save,
  Send,
  Settings,
  Image as ImageIcon,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  Loader2,
  Tag,
  Link2,
} from "lucide-react";
import { isImportedContent } from "@/lib/imported-content";
import { generateArticleThumbnailPng } from "@/lib/article-thumbnail-canvas";
import {
  THUMBNAIL_TEMPLATE_KINDS,
  THUMBNAIL_TEMPLATE_LABELS,
  getThumbnailTemplateImageUrl,
  type ThumbnailTemplateKind,
} from "@/lib/thumbnail-template";
import { SHARED_CATEGORIES } from "@/lib/categories";

const STORAGE_KEY = "edumatch-site-update-draft";
/** 記事作成ページ（/articles/create）と同じ上限 */
const TITLE_MAX_LENGTH = 80;
const CONTENT_MAX_LENGTH = 10_000;

function normalizeBlockType(block: SiteUpdateContentBlock): ContentBlock {
  const b = { ...block };
  if (b.type === "list") (b as ContentBlock).type = "bulletList";
  else if (b.type === "ordered-list") (b as ContentBlock).type = "numberedList";
  return b as ContentBlock;
}

type InitialProfile = { name: string; avatar_url: string | null; email: string };

type SiteUpdateDraft = {
  title: string;
  leadText: string;
  category: string;
  content: string;
  publishedAt: string;
  link: string;
  thumbnailUrl: string;
  savedAt: string;
};

function loadDraftFromStorage(): SiteUpdateDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as SiteUpdateDraft;
  } catch (e) {
    console.warn("Failed to load site update draft:", e);
  }
  return null;
}

type Props = {
  mode: "create" | "edit";
  id?: string;
  defaultTitle?: string;
  defaultBody?: string;
  defaultExcerpt?: string;
  defaultPublishedAt?: string;
  defaultLink?: string;
  defaultThumbnailUrl?: string;
  defaultCategory?: string;
  initialProfile?: InitialProfile | null;
};

export function SiteUpdateEditor({
  mode,
  id,
  defaultTitle = "",
  defaultBody = "",
  defaultExcerpt = "",
  defaultPublishedAt = "",
  defaultLink = "",
  defaultThumbnailUrl = "",
  defaultCategory = "",
  initialProfile = null,
}: Props) {
  const router = useRouter();
  const editSnapshotRef = useRef({
    title: defaultTitle,
    leadText: defaultExcerpt,
    publishedAt: defaultPublishedAt,
    link: defaultLink,
    thumbnailUrl: defaultThumbnailUrl,
    category: defaultCategory,
    content: defaultBody,
  });
  const [draft] = useState<SiteUpdateDraft | null>(() => (mode === "create" ? loadDraftFromStorage() : null));

  const [activeTab, setActiveTab] = useState("edit");
  const [title, setTitle] = useState(() =>
    mode === "create" && draft?.title != null ? draft.title : defaultTitle
  );
  const [leadText, setLeadText] = useState(() =>
    mode === "create" && draft?.leadText != null ? draft.leadText : defaultExcerpt
  );
  const [publishedAt, setPublishedAt] = useState(() =>
    mode === "create" && draft?.publishedAt != null ? draft.publishedAt : defaultPublishedAt
  );
  const [link, setLink] = useState(() =>
    mode === "create" && draft?.link != null ? draft.link : defaultLink
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(() =>
    mode === "create" && draft?.thumbnailUrl != null ? draft.thumbnailUrl : defaultThumbnailUrl
  );
  const [category, setCategory] = useState(() =>
    mode === "create" && draft?.category != null ? draft.category : defaultCategory
  );
  const [content, setContent] = useState(() =>
    mode === "create" && draft?.content != null ? draft.content : defaultBody
  );

  const [lastSaved, setLastSaved] = useState<Date | null>(() =>
    mode === "create" && draft?.savedAt ? new Date(draft.savedAt) : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [userProfile, setUserProfile] = useState<InitialProfile | null>(initialProfile ?? null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailTemplateKind, setThumbnailTemplateKind] =
    useState<ThumbnailTemplateKind>("domestic");
  const [thumbnailTemplateGenerating, setThumbnailTemplateGenerating] = useState(false);
  const thumbnailFileInputRef = useRef<HTMLInputElement | null>(null);

  const titleUndo = useUndoRedoTextField({
    value: title,
    historyKey: "site-update-title",
    onCommit: (next) => setTitle(next.slice(0, TITLE_MAX_LENGTH)),
  });

  const leadUndo = useUndoRedoTextField({
    value: leadText,
    historyKey: "site-update-lead",
    onCommit: setLeadText,
    typingGroupMs: UNDO_TYPING_MERGE_MS,
  });

  const saveDraft = useCallback(() => {
    if (mode !== "create") return;
    setIsSaving(true);
    try {
      const payload: SiteUpdateDraft = {
        title,
        leadText,
        category,
        content,
        publishedAt,
        link,
        thumbnailUrl,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSaved(new Date());
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (e) {
      console.error("Failed to save site update draft:", e);
    }
    setIsSaving(false);
  }, [mode, title, leadText, category, content, publishedAt, link, thumbnailUrl]);

  useEffect(() => {
    if (initialProfile != null) return;
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
      } catch (e) {
        console.error(e);
      }
    }
    fetchProfile();
  }, [initialProfile]);

  useEffect(() => {
    if (mode !== "create") return;
    const interval = setInterval(() => {
      const t = title;
      const l = leadText;
      const c = content;
      if (t || l || c.length > 0) {
        try {
          const payload: SiteUpdateDraft = {
            title: t,
            leadText: l,
            category,
            content: c,
            publishedAt,
            link,
            thumbnailUrl,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
          console.error("Auto-save failed:", e);
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [mode, title, leadText, category, content, publishedAt, link, thumbnailUrl]);

  const applyThumbnailFromTemplate = useCallback(
    async (kind: ThumbnailTemplateKind, titleText: string, options?: { quiet?: boolean }) => {
      const t = titleText.trim();
      if (!t) {
        toast.error("先にタイトルを入力してください");
        return;
      }
      setThumbnailTemplateGenerating(true);
      try {
        const blob = await generateArticleThumbnailPng({ templateKind: kind, title: t });
        const file = new File([blob], "site-update-thumbnail.png", { type: "image/png" });
        const formData = new FormData();
        formData.append("file", file);
        const result = await uploadImage(formData);
        if (result.success && result.url) {
          setThumbnailUrl(result.url);
          setThumbnailTemplateKind(kind);
          if (!options?.quiet) {
            toast.success("サムネイルを生成して設定しました");
          }
        } else {
          toast.error(result.error || "アップロードに失敗しました");
        }
      } catch (e) {
        console.error(e);
        toast.error("サムネイルの生成に失敗しました");
      } finally {
        setThumbnailTemplateGenerating(false);
      }
    },
    []
  );

  const clearDraft = () => {
    if (mode === "create") {
      localStorage.removeItem(STORAGE_KEY);
      setTitle("");
      setLeadText("");
      setCategory("");
      setPublishedAt(defaultPublishedAt || new Date().toISOString().slice(0, 16));
      setLink("");
      setThumbnailUrl("");
      setThumbnailTemplateKind("domestic");
      setContent("");
      setLastSaved(null);
      toast.info("入力内容をクリアしました");
    } else {
      const s = editSnapshotRef.current;
      setTitle(s.title);
      setLeadText(s.leadText);
      setCategory(s.category);
      setPublishedAt(s.publishedAt);
      setLink(s.link);
      setThumbnailUrl(s.thumbnailUrl);
      setContent(s.content);
      toast.info("編集開始時の内容に戻しました");
    }
    setActiveTab("edit");
    setEditorResetKey((k) => k + 1);
  };

  const handleSaveDraftLocalOnly = async () => {
    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    if (mode !== "create") return;
    saveDraft();
    toast.success("下書きを保存しました", {
      description: "ブラウザに保存しました。公開は「投稿する」から行ってください。",
    });
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    if (title.length > TITLE_MAX_LENGTH) {
      toast.error(`タイトルは${TITLE_MAX_LENGTH}文字以内で入力してください`);
      return;
    }
    if (!content.trim()) {
      toast.error("本文を入力してください");
      return;
    }
    if (content.length > CONTENT_MAX_LENGTH) {
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
          excerpt: leadText.trim() || null,
          ...(isImportedContent(content)
            ? { body: content }
            : { blocks: bodyToBlocks(content).map((b) => normalizeBlockType(b) as SiteUpdateContentBlock) }),
          published_at: publishedAtISO,
          link: link.trim() || null,
          thumbnail_url: thumbnailUrl.trim() || null,
          category: category.trim() || null,
        });
        if (result.success && result.id) {
          localStorage.removeItem(STORAGE_KEY);
          toast.success("運営記事を公開しました", {
            description: "ダッシュボードのお知らせに反映され、登録ユーザーへ通知されます。",
          });
          router.push("/admin/site-updates");
          router.refresh();
        } else {
          toast.error("投稿に失敗しました", {
            description: result.error ?? "もう一度お試しください",
          });
        }
      } else if (mode === "edit" && id) {
        const result = await updateSiteUpdate({
          id,
          title: title.trim(),
          excerpt: leadText.trim() || null,
          ...(isImportedContent(content)
            ? { body: content }
            : { blocks: bodyToBlocks(content).map((b) => normalizeBlockType(b) as SiteUpdateContentBlock) }),
          published_at: publishedAtISO,
          link: link.trim() || null,
          thumbnail_url: thumbnailUrl.trim() || null,
          category: category.trim() || null,
        });
        if (result.success) {
          toast.success("運営記事を更新しました", {
            description: "変更内容が保存されました。",
          });
          router.push("/admin/site-updates");
          router.refresh();
        } else {
          toast.error("更新に失敗しました", {
            description: result.error ?? "もう一度お試しください",
          });
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("処理に失敗しました", {
        description: "ネットワークエラーが発生した可能性があります。",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const titleLength = title.length;
  const leadTextLength = leadText.length;
  const contentLength = content.length;
  const totalWordCount = titleLength + leadTextLength + contentLength;

  const isTitleValid = titleLength <= TITLE_MAX_LENGTH;
  const isContentValid = contentLength <= CONTENT_MAX_LENGTH;
  const canSubmit =
    isTitleValid && isContentValid && title.trim().length > 0 && content.trim().length > 0;

  const [lastSavedText, setLastSavedText] = useState("未保存");
  useEffect(() => {
    const updateLastSavedText = () => {
      if (mode !== "create") {
        setLastSavedText("");
        return;
      }
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
        setLastSavedText(lastSaved.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));
      }
    };
    updateLastSavedText();
    const interval = setInterval(updateLastSavedText, 60000);
    return () => clearInterval(interval);
  }, [lastSaved, mode]);

  const renderPreview = () => (
    <ArticlePreview
      title={title}
      leadText={leadText}
      content={content}
      category={category}
      thumbnailUrl={thumbnailUrl || undefined}
    />
  );

  const categorySelectOptions = useMemo(() => {
    const base = [...SHARED_CATEGORIES];
    const c = category.trim();
    if (c && !base.some((opt) => opt.value === c)) {
      return [{ value: c, label: `${c}（既存）` }, ...base];
    }
    return base;
  }, [category]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="container flex items-center justify-between h-16 flex-wrap gap-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">
              {mode === "create" ? "運営記事を作成" : "運営記事を編集"}
            </h1>
            {mode === "create" ? (
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
            ) : null}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className={`text-sm ${canSubmit ? "text-muted-foreground" : "text-destructive"}`}>
              合計: {totalWordCount.toLocaleString()} 文字
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowClearDialog(true)}>
              クリア
            </Button>
            {mode === "create" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={saveDraft}
                  disabled={isSaving || isSubmitting}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  ローカル保存
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveDraftLocalOnly}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  下書き保存
                </Button>
              </>
            ) : null}
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

      <div className="container py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
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
                  <CardContent className="pt-6 space-y-4">
                    <input
                      ref={thumbnailFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      aria-hidden
                      tabIndex={-1}
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
                        } catch (err) {
                          console.error(err);
                          toast.error("サムネイルのアップロードに失敗しました");
                        } finally {
                          setThumbnailUploading(false);
                          input.value = "";
                        }
                      }}
                    />
                    {thumbnailUrl ? (
                      <div className="space-y-3">
                        <div className="relative group rounded-lg overflow-hidden">
                          <img
                            src={thumbnailUrl}
                            alt="サムネイル"
                            className="w-full h-[200px] object-contain rounded-lg bg-muted/20"
                          />
                          <div className="pointer-events-none group-hover:pointer-events-auto absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-4">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
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
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => thumbnailFileInputRef.current?.click()}
                            disabled={thumbnailUploading}
                          >
                            画像を差し替え
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setThumbnailUrl("")}
                          >
                            サムネイルを削除
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <ImageIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                          <p className="font-medium">サムネイル画像を設定</p>
                          <p className="text-sm text-muted-foreground mt-1">推奨サイズ: 1200×630px（16:9）</p>
                        </div>
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => thumbnailFileInputRef.current?.click()}
                          disabled={thumbnailUploading}
                        >
                          {thumbnailUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              アップロード中...
                            </>
                          ) : (
                            "画像をアップロード"
                          )}
                        </Button>
                      </div>
                    )}

                    <div className="pt-6 border-t space-y-3">
                      <p className="text-sm font-medium">テンプレート背景＋タイトルでサムネイル</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {THUMBNAIL_TEMPLATE_KINDS.map((kind) => (
                          <button
                            key={kind}
                            type="button"
                            onClick={() => setThumbnailTemplateKind(kind)}
                            className={`rounded-lg border-2 overflow-hidden p-1 transition-colors text-left flex flex-col gap-1 ${
                              thumbnailTemplateKind === kind
                                ? "border-primary ring-2 ring-primary/30"
                                : "border-transparent hover:border-muted-foreground/30"
                            }`}
                          >
                            <div className="relative w-full aspect-video rounded-sm overflow-hidden bg-muted/30">
                              <img
                                src={getThumbnailTemplateImageUrl(kind)}
                                alt=""
                                className="absolute inset-0 w-full h-full object-contain"
                              />
                            </div>
                            <span className="text-[10px] block text-center leading-tight text-muted-foreground">
                              {THUMBNAIL_TEMPLATE_LABELS[kind]}
                            </span>
                          </button>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        disabled={thumbnailTemplateGenerating || thumbnailUploading || !title.trim()}
                        onClick={() => applyThumbnailFromTemplate(thumbnailTemplateKind, title)}
                      >
                        {thumbnailTemplateGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            生成中...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-4 w-4 mr-2" />
                            テンプレートでサムネイルを生成
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <input
                        ref={(el) => {
                          titleUndo.inputRef.current = el;
                        }}
                        type="text"
                        value={title}
                        onChange={(e) => titleUndo.commit(e.target.value)}
                        onBeforeInput={titleUndo.onBeforeInput}
                        onCompositionStart={titleUndo.onCompositionStart}
                        onCompositionEnd={titleUndo.onCompositionEnd}
                        onKeyDown={titleUndo.onKeyDown}
                        onBlur={titleUndo.flushUndoGrouping}
                        placeholder="タイトルを入力..."
                        className={`flex-1 text-3xl font-bold bg-transparent outline-none border-none ${
                          !isTitleValid ? "text-destructive" : ""
                        }`}
                        maxLength={TITLE_MAX_LENGTH}
                      />
                      <span
                        className={`text-sm whitespace-nowrap ${isTitleValid ? "text-muted-foreground" : "text-destructive"}`}
                      >
                        {titleLength} / {TITLE_MAX_LENGTH}
                      </span>
                    </div>
                    {!isTitleValid && (
                      <p className="text-destructive text-xs mt-2">
                        タイトルは{TITLE_MAX_LENGTH}文字以内で入力してください
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="relative">
                      <Textarea
                        ref={(el) => {
                          leadUndo.inputRef.current = el;
                        }}
                        value={leadText}
                        onChange={(e) => leadUndo.commit(e.target.value)}
                        onBeforeInput={leadUndo.onBeforeInput}
                        onCompositionStart={leadUndo.onCompositionStart}
                        onCompositionEnd={leadUndo.onCompositionEnd}
                        onKeyDown={(ev) => {
                          leadUndo.onKeyDown(ev);
                          if (ev.defaultPrevented) return;
                          if (ev.key === "Enter" && !ev.nativeEvent.isComposing) {
                            leadUndo.flushUndoGrouping();
                          }
                        }}
                        onBlur={leadUndo.flushUndoGrouping}
                        placeholder="リード文（概要）を入力..."
                        className="border-none shadow-none resize-none text-lg text-muted-foreground focus-visible:ring-0 pr-20"
                        rows={3}
                      />
                      <span className="absolute top-2 right-2 text-sm text-muted-foreground">
                        {leadTextLength.toLocaleString()} 文字
                      </span>
                    </div>
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
                      key={`site-update-editor-${editorResetKey}`}
                      content={content}
                      onChange={setContent}
                      parseToBlocks={(c) => bodyToBlocks(c).map(normalizeBlockType)}
                      blocksToContent={(b) => blocksToBody(b as SiteUpdateContentBlock[])}
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
                  <CardContent className="py-12">{renderPreview()}</CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  公開設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">公開日時</label>
                  <Input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    投稿すると掲載日時の順で一覧に表示され、登録ユーザーへお知らせ通知が送られます。
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Link2 className="h-3.5 w-3.5" />
                    参照リンク（任意）
                  </label>
                  <Input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  カテゴリ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">カテゴリ</label>
                  <Select value={category || "__none__"} onValueChange={(v) => setCategory(v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">（未選択）</SelectItem>
                      {categorySelectOptions.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">公開前チェック</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <CheckItem checked={title.length > 0} label="タイトルを入力" />
                  <CheckItem checked={thumbnailUrl.length > 0} label="サムネイル画像を設定" />
                  <CheckItem checked={leadText.length > 0} label="リード文を入力" />
                  <CheckItem checked={content.trim().length > 0} label="本文を作成" />
                  <CheckItem checked={category.length > 0} label="カテゴリを選択" />
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
                  <li>・事実に基づき、利用者に誤解を与えない表現にしてください</li>
                  <li>・著作権・肖像権に配慮した画像を使用してください</li>
                  <li>・公開日時は一覧の並びと通知の文脈に影響します</li>
                  <li>・投稿直後に登録ユーザーへアプリ内通知が送られます</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {mode === "create" ? "入力内容を削除しますか？" : "編集内容を初期状態に戻しますか？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {mode === "create"
                ? "本文・タイトル・設定中の内容がクリアされます。この操作は取り消せません。"
                : "この画面を開いたときの内容に戻します。未保存の変更は失われます。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearDraft}
              className={
                mode === "create"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {mode === "create" ? "削除する" : "戻す"}
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
      <span className={`text-sm ${checked ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}
