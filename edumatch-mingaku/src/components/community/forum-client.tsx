"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  Flame,
  ListFilter,
  MessageSquare,
  PenSquare,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  COMMUNITY_ROLE_LABELS,
  FORUM_CATEGORIES,
  FORUM_SORT_OPTIONS,
  type CommunityRole,
  type ForumThread,
} from "@/lib/mock-community";
import { RoleBadge } from "./role-badge";

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date(dateString));
}

type ThreadComposerState = {
  title: string;
  body: string;
  category: string;
  tags: string;
  role: CommunityRole;
  name: string;
  anonymous: boolean;
};

function createDefaultThreadComposer(): ThreadComposerState {
  return {
    title: "",
    body: "",
    category: "授業づくり",
    tags: "",
    role: "general",
    name: "",
    anonymous: false,
  };
}

export function ForumClient({ initialThreads }: { initialThreads: ForumThread[] }) {
  const [threads, setThreads] = useState(initialThreads);
  const [selectedCategory, setSelectedCategory] = useState<string>("すべて");
  const [selectedTag, setSelectedTag] = useState<string>("すべて");
  const [sortBy, setSortBy] =
    useState<(typeof FORUM_SORT_OPTIONS)[number]["value"]>("newest");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [composer, setComposer] = useState<ThreadComposerState>(createDefaultThreadComposer());

  const tags = useMemo(() => {
    return [
      "すべて",
      ...Array.from(new Set(threads.flatMap((thread) => thread.tags))).sort(),
    ];
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const nextThreads = threads.filter((thread) => {
      const matchesCategory =
        selectedCategory === "すべて" || thread.category === selectedCategory;
      const matchesTag = selectedTag === "すべて" || thread.tags.includes(selectedTag);
      return matchesCategory && matchesTag;
    });

    return [...nextThreads].sort((a, b) => {
      if (sortBy === "popular") {
        return b.viewCount + b.replyCount * 20 - (a.viewCount + a.replyCount * 20);
      }
      return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
    });
  }, [threads, selectedCategory, selectedTag, sortBy]);

  const handleSubmitThread = () => {
    if (!composer.title.trim() || !composer.body.trim()) {
      return;
    }

    const role = composer.anonymous ? "anonymous" : composer.role;
    const name = composer.anonymous
      ? "匿名ユーザー"
      : composer.name.trim() || `${COMMUNITY_ROLE_LABELS[composer.role]}ユーザー`;

    const nextThread: ForumThread = {
      id: `forum-draft-${Date.now()}`,
      title: composer.title.trim(),
      summary: composer.body.trim().slice(0, 70),
      body: composer.body.trim(),
      category: composer.category,
      tags: composer.tags
        .split(/[,\s、]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 5),
      authorName: name,
      authorRole: role,
      postedAt: new Date().toISOString(),
      replyCount: 0,
      viewCount: 1,
      comments: [],
    };

    setThreads((prev) => [nextThread, ...prev]);
    setComposer(createDefaultThreadComposer());
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <section className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-background">
        <div className="container py-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <Badge variant="secondary" className="gap-1 px-3 py-1">
                <Sparkles className="h-3.5 w-3.5" />
                新機能モック
              </Badge>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
                  教育悩み相談室
                </h1>
                <p className="text-lg leading-8 text-muted-foreground">
                  教員・保護者・学生・研究者が、教育に関する悩みや実践知を持ち寄って相談できるコミュニティページです。
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="rounded-full border bg-background px-4 py-2">
                  スレッド数 {threads.length}
                </span>
                <span className="rounded-full border bg-background px-4 py-2">
                  コメント総数 {threads.reduce((sum, thread) => sum + thread.replyCount, 0)}
                </span>
              </div>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="w-full lg:w-auto">
                  <PenSquare className="h-4 w-4" />
                  新規スレッドを投稿
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>新しい相談を投稿</DialogTitle>
                  <DialogDescription>
                    このフォームはモックです。投稿後は一覧上に即時反映されます。
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forum-title">タイトル</Label>
                    <Input
                      id="forum-title"
                      value={composer.title}
                      onChange={(event) =>
                        setComposer((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="相談したいテーマを入力"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="forum-body">本文</Label>
                    <Textarea
                      id="forum-body"
                      rows={6}
                      value={composer.body}
                      onChange={(event) =>
                        setComposer((prev) => ({ ...prev, body: event.target.value }))
                      }
                      placeholder="状況や背景、相談したいポイントを書いてください"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>カテゴリ</Label>
                      <Select
                        value={composer.category}
                        onValueChange={(value) =>
                          setComposer((prev) => ({ ...prev, category: value }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="カテゴリを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {FORUM_CATEGORIES.filter((category) => category !== "すべて").map(
                            (category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>投稿者属性</Label>
                      <Select
                        value={composer.role}
                        disabled={composer.anonymous}
                        onValueChange={(value) =>
                          setComposer((prev) => ({
                            ...prev,
                            role: value as CommunityRole,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="属性を選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(COMMUNITY_ROLE_LABELS)
                            .filter(([role]) => role !== "anonymous")
                            .map(([role, label]) => (
                              <SelectItem key={role} value={role}>
                                {label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="forum-name">表示名</Label>
                      <Input
                        id="forum-name"
                        value={composer.name}
                        disabled={composer.anonymous}
                        onChange={(event) =>
                          setComposer((prev) => ({ ...prev, name: event.target.value }))
                        }
                        placeholder="例: 都内中学校教員"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="forum-tags">タグ</Label>
                      <Input
                        id="forum-tags"
                        value={composer.tags}
                        onChange={(event) =>
                          setComposer((prev) => ({ ...prev, tags: event.target.value }))
                        }
                        placeholder="例: ICT, 学級経営, 不登校"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="forum-anonymous"
                      checked={composer.anonymous}
                      onCheckedChange={(checked) =>
                        setComposer((prev) => ({
                          ...prev,
                          anonymous: checked === true,
                        }))
                      }
                    />
                    <Label htmlFor="forum-anonymous">匿名で投稿する</Label>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      閉じる
                    </Button>
                    <Button onClick={handleSubmitThread}>投稿する</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </section>

      <div className="container py-8">
        <Card className="mb-8 border-2 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ListFilter className="h-4 w-4" />
              絞り込み
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">カテゴリ</p>
              <div className="flex flex-wrap gap-2">
                {FORUM_CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    size="sm"
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">タグ</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Button
                    key={tag}
                    size="sm"
                    variant={selectedTag === tag ? "secondary" : "outline"}
                    onClick={() => setSelectedTag(tag)}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredThreads.length}件のスレッドを表示中
              </p>
              <Tabs
                value={sortBy}
                onValueChange={(value) =>
                  setSortBy(value as (typeof FORUM_SORT_OPTIONS)[number]["value"])
                }
              >
                <TabsList>
                  {FORUM_SORT_OPTIONS.map((option) => (
                    <TabsTrigger key={option.value} value={option.value}>
                      {option.value === "popular" ? (
                        <Flame className="h-4 w-4" />
                      ) : null}
                      {option.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredThreads.map((thread) => (
            <Card key={thread.id} className="transition-colors hover:border-primary/50">
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{thread.category}</Badge>
                  <RoleBadge role={thread.authorRole} />
                  <span className="text-sm text-muted-foreground">
                    {thread.authorName}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(thread.postedAt)}
                  </span>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-xl leading-8">{thread.title}</CardTitle>
                  <CardDescription className="text-sm leading-7">
                    {thread.summary}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {thread.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4" />
                      返信 {thread.replyCount}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      閲覧 {thread.viewCount}
                    </span>
                  </div>
                  <Button asChild>
                    <Link href={`/forum/${thread.id}`}>スレッドを見る</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredThreads.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <p className="text-lg font-semibold">条件に合うスレッドがありません</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  カテゴリやタグを切り替えて確認してください。
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
