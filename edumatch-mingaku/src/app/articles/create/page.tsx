"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { BlockEditor, ContentBlock } from "@/components/editor/block-editor";
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
  Clock,
  Users,
  Tag,
  Globe,
  Lock,
  Check,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { createPost, uploadImage } from "@/app/_actions";
import { getCurrentUserProfile } from "@/app/_actions/user";

const STORAGE_KEY = "edumatch-article-draft";

interface ArticleDraft {
  title: string;
  leadText: string;
  category: string;
  tags: string;
  publishType: "public" | "member" | "draft";
  thumbnailUrl: string;
  blocks: ContentBlock[];
  savedAt: string;
}

// ローカルストレージから下書きを読み込む関数（クライアントサイドのみ）
function loadDraftFromStorage(): ArticleDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as ArticleDraft;
    }
  } catch (e) {
    console.warn("Failed to load draft:", e);
  }
  return null;
}

export default function ArticleCreatePage() {
  // 初期値をローカルストレージから読み込み（lazy initialization）
  const [draft] = useState<ArticleDraft | null>(() => loadDraftFromStorage());
  
  const [activeTab, setActiveTab] = useState("edit");
  const [title, setTitle] = useState(() => draft?.title || "");
  const [leadText, setLeadText] = useState(() => draft?.leadText || "");
  const [category, setCategory] = useState(() => draft?.category || "");
  const [tags, setTags] = useState(() => draft?.tags || "");
  const [publishType, setPublishType] = useState<"public" | "member" | "draft">(() => draft?.publishType || "draft");
  const [thumbnailUrl, setThumbnailUrl] = useState(() => draft?.thumbnailUrl || "");
  const [thumbnailInput, setThumbnailInput] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const thumbnailFileInputRef = useRef<HTMLInputElement | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => draft?.blocks || []);
  const [lastSaved, setLastSaved] = useState<Date | null>(() => draft?.savedAt ? new Date(draft.savedAt) : null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar_url: string | null; email: string } | null>(null);

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    setIsSaving(true);
    try {
      const draft: ArticleDraft = {
        title,
        leadText,
        category,
        tags,
        publishType,
        thumbnailUrl,
        blocks,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      setLastSaved(new Date());
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (e) {
      console.error("Failed to save draft:", e);
    }
    setIsSaving(false);
  }, [title, leadText, category, tags, publishType, thumbnailUrl, blocks]);

  // ユーザープロフィールを取得
  useEffect(() => {
    async function fetchProfile() {
      try {
        const profile = await getCurrentUserProfile();
        if (profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    }
    fetchProfile();
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // 現在の値をキャプチャして保存を実行
      const currentTitle = title;
      const currentLeadText = leadText;
      const currentBlocks = blocks;
      
      if (currentTitle || currentLeadText || currentBlocks.length > 0) {
        // saveDraftを直接呼ぶ代わりに、直接保存ロジックを実行
        try {
          const draft = {
            title: currentTitle,
            leadText: currentLeadText,
            category,
            tags,
            publishType,
            thumbnailUrl,
            blocks: currentBlocks,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        } catch (e) {
          console.error("Auto-save failed:", e);
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [title, leadText, category, tags, publishType, thumbnailUrl, blocks]);

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async () => {
    // バリデーション
    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    
    if (blocks.length === 0) {
      toast.error("本文を入力してください");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const submitType = publishType === "draft" ? "public" : publishType;
      const result = await createPost({
        title: title.trim(),
        leadText: leadText.trim(),
        category: category || "教育ICT",
        tags,
        publishType: submitType,
        thumbnailUrl,
        blocks: blocks as Parameters<typeof createPost>[0]["blocks"],
      });
      
      if (result.success) {
        // 下書きを削除
        localStorage.removeItem(STORAGE_KEY);
        
        toast.success("投稿申請を受け付けました", {
          description: "管理者の承認後に公開されます。",
        });
        
        // 記事詳細ページまたは一覧へリダイレクト
        if (result.postId) {
          router.push(`/articles/${result.postId}`);
        } else {
          router.push("/articles");
        }
      } else {
        toast.error("申請に失敗しました", {
          description: result.error || "もう一度お試しください",
        });
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("申請に失敗しました", {
        description: "ネットワークエラーが発生しました",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveDraft = async () => {
    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await createPost({
        title: title.trim(),
        leadText: leadText.trim(),
        category: category || "教育ICT",
        tags,
        publishType: "draft",
        thumbnailUrl,
        blocks: blocks as Parameters<typeof createPost>[0]["blocks"],
      });
      
      if (result.success) {
        localStorage.removeItem(STORAGE_KEY);
        toast.success("下書きを保存しました");
        router.push("/dashboard");
      } else {
        toast.error("保存に失敗しました", {
          description: result.error || "もう一度お試しください",
        });
      }
    } catch (error) {
      console.error("Save draft error:", error);
      toast.error("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearDraft = () => {
    if (confirm("下書きを削除してもよろしいですか？")) {
      localStorage.removeItem(STORAGE_KEY);
      setTitle("");
      setLeadText("");
      setCategory("");
      toast.info("下書きを削除しました");
      setTags("");
      setPublishType("draft");
      setThumbnailUrl("");
      setBlocks([]);
      setLastSaved(null);
    }
  };

  const wordCount = blocks.reduce((acc, block) => {
    if (block.content) {
      return acc + block.content.length;
    }
    if (block.items) {
      return acc + block.items.join("").length;
    }
    return acc;
  }, 0) + title.length + leadText.length;

  const renderPreview = () => {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Thumbnail */}
        {thumbnailUrl && (
          <div className="mb-6 rounded-xl overflow-hidden">
            <img
              src={thumbnailUrl}
              alt={title}
              className="w-full h-[300px] object-cover"
            />
          </div>
        )}

        {/* Title */}
        <h1 className="text-4xl font-bold mb-4">{title || "タイトル未設定"}</h1>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {new Date().toLocaleDateString("ja-JP")}
          </span>
          {category && <Badge variant="outline">{category}</Badge>}
        </div>

        {/* Lead text */}
        {leadText && (
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            {leadText}
          </p>
        )}

        {/* Content blocks */}
        <div className="prose prose-lg max-w-none">
          {blocks.map((block) => {
            switch (block.type) {
              case "heading1":
                return (
                  <h2
                    key={block.id}
                    className="text-3xl font-bold mt-8 mb-4"
                    style={{ textAlign: block.align }}
                  >
                    {block.content}
                  </h2>
                );
              case "heading2":
                return (
                  <h3
                    key={block.id}
                    className="text-2xl font-bold mt-6 mb-3"
                    style={{ textAlign: block.align }}
                  >
                    {block.content}
                  </h3>
                );
              case "heading3":
                return (
                  <h4
                    key={block.id}
                    className="text-xl font-semibold mt-4 mb-2"
                    style={{ textAlign: block.align }}
                  >
                    {block.content}
                  </h4>
                );
              case "paragraph":
                return (
                  <p
                    key={block.id}
                    className="mb-4 leading-relaxed"
                    style={{ textAlign: block.align }}
                  >
                    {block.content}
                  </p>
                );
              case "image":
                return (
                  <figure key={block.id} className="my-8">
                    {block.url && (
                      <img
                        src={block.url}
                        alt={block.caption || ""}
                        className="w-full rounded-lg"
                      />
                    )}
                    {block.caption && (
                      <figcaption className="text-center text-sm text-muted-foreground mt-2">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              case "video":
                return (
                  <figure key={block.id} className="my-8">
                    {block.url && (
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <iframe
                          src={
                            block.url.includes("youtube.com") ||
                            block.url.includes("youtu.be")
                              ? `https://www.youtube.com/embed/${extractYouTubeId(block.url)}`
                              : block.url
                          }
                          className="w-full h-full"
                          allowFullScreen
                        />
                      </div>
                    )}
                    {block.caption && (
                      <figcaption className="text-center text-sm text-muted-foreground mt-2">
                        {block.caption}
                      </figcaption>
                    )}
                  </figure>
                );
              case "quote":
                return (
                  <blockquote
                    key={block.id}
                    className="border-l-4 border-primary pl-4 my-6 italic"
                  >
                    <p className="text-lg">{block.content}</p>
                    {block.caption && (
                      <cite className="text-sm text-muted-foreground not-italic">
                        — {block.caption}
                      </cite>
                    )}
                  </blockquote>
                );
              case "divider":
                return <hr key={block.id} className="my-8 border-t-2" />;
              case "bulletList":
                return (
                  <ul key={block.id} className="list-disc pl-6 my-4 space-y-1">
                    {block.items?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                );
              case "numberedList":
                return (
                  <ol key={block.id} className="list-decimal pl-6 my-4 space-y-1">
                    {block.items?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                );
              default:
                return null;
            }
          })}
        </div>
      </div>
    );
  };

  // 最終保存時刻の表示文字列を計算
  const [lastSavedText, setLastSavedText] = useState("未保存");
  
  // lastSavedが変更された時や定期的に更新
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
        setLastSavedText(lastSaved.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }));
      }
    };
    
    updateLastSavedText();
    const interval = setInterval(updateLastSavedText, 60000); // 1分ごとに更新
    return () => clearInterval(interval);
  }, [lastSaved]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">記事を作成</h1>
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
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {wordCount.toLocaleString()} 文字
            </span>
            <Button variant="ghost" size="sm" onClick={clearDraft}>
              クリア
            </Button>
            <Button variant="outline" size="sm" onClick={saveDraft} disabled={isSaving || isSubmitting}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              ローカル保存
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveDraft} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              下書き保存
            </Button>
            <Button size="sm" onClick={handlePublish} disabled={isSubmitting}>
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

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main editor area */}
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

              <TabsContent value="edit" className="space-y-6">
                {/* Thumbnail upload */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    {thumbnailUrl ? (
                      <div className="relative group">
                        <img
                          src={thumbnailUrl}
                          alt="サムネイル"
                          className="w-full h-[200px] object-cover rounded-lg"
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
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setThumbnailUrl("")}
                          >
                            削除
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                          <ImageIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                          <p className="font-medium">サムネイル画像を設定</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            推奨サイズ: 1200×630px（16:9）
                          </p>
                        </div>
                        <div className="space-y-3">
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
                              } catch (err) {
                                console.error(err);
                                toast.error("サムネイルのアップロードに失敗しました");
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
                              "画像をアップロード"
                            )}
                          </Button>

                          {/* URL入力（任意）は廃止（画像アップロードのみ） */}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Title */}
                <Card>
                  <CardContent className="pt-6">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="記事タイトルを入力..."
                      className="w-full text-3xl font-bold bg-transparent outline-none border-none"
                    />
                  </CardContent>
                </Card>

                {/* Lead text */}
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

                {/* Block editor */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">本文</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BlockEditor blocks={blocks} onChange={setBlocks} />
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

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Publish settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  公開設定
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">公開範囲</label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        publishType === "public"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishType"
                        checked={publishType === "public"}
                        onChange={() => setPublishType("public")}
                        className="sr-only"
                      />
                      <Globe className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">一般公開</p>
                        <p className="text-xs text-muted-foreground">
                          誰でも閲覧可能
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        publishType === "member"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishType"
                        checked={publishType === "member"}
                        onChange={() => setPublishType("member")}
                        className="sr-only"
                      />
                      <Users className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium text-sm">会員限定</p>
                        <p className="text-xs text-muted-foreground">
                          登録会員のみ
                        </p>
                      </div>
                    </label>
                    <label
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        publishType === "draft"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="publishType"
                        checked={publishType === "draft"}
                        onChange={() => setPublishType("draft")}
                        className="sr-only"
                      />
                      <Lock className="h-4 w-4 text-gray-600" />
                      <div>
                        <p className="font-medium text-sm">下書き</p>
                        <p className="text-xs text-muted-foreground">
                          非公開で保存
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category & Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  カテゴリ・タグ
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">カテゴリ</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="導入事例">導入事例</SelectItem>
                      <SelectItem value="製品紹介">製品紹介</SelectItem>
                      <SelectItem value="教育ICT">教育ICT</SelectItem>
                      <SelectItem value="学校運営">学校運営</SelectItem>
                      <SelectItem value="イベント">イベント</SelectItem>
                      <SelectItem value="お知らせ">お知らせ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">タグ</label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="タグをカンマ区切りで入力"
                  />
                  <p className="text-xs text-muted-foreground">
                    例: EdTech, GIGAスクール, タブレット
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Organization info */}
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

            {/* Checklist */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">公開前チェック</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <CheckItem
                    checked={title.length > 0}
                    label="タイトルを入力"
                  />
                  <CheckItem
                    checked={thumbnailUrl.length > 0}
                    label="サムネイル画像を設定"
                  />
                  <CheckItem
                    checked={leadText.length > 0}
                    label="リード文を入力"
                  />
                  <CheckItem
                    checked={blocks.length > 0}
                    label="本文を作成"
                  />
                  <CheckItem
                    checked={category.length > 0}
                    label="カテゴリを選択"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  投稿ガイドライン
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>・教育現場に役立つ情報を心がけてください</li>
                  <li>・著作権・肖像権に配慮した画像を使用</li>
                  <li>・誇大広告や誤解を招く表現はNG</li>
                  <li>・公開前に編集部による審査があります</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2
        className={`h-4 w-4 ${checked ? "text-green-500" : "text-gray-300"}`}
      />
      <span
        className={`text-sm ${checked ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
      </span>
    </div>
  );
}

function extractYouTubeId(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
  );
  return match ? match[1] : "";
}
