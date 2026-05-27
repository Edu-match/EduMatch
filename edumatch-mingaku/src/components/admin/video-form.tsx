"use client";

import { useState } from "react";
import type { VideoVisibility } from "@prisma/client";
import { Loader2, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { extractYoutubeId } from "@/lib/youtube";
import { VIDEO_VISIBILITY_LABELS } from "@/lib/video-visibility";

export type VideoFormValue = {
  id?: string;
  title: string;
  description: string;
  youtubeUrl: string;
  visibility: VideoVisibility;
  aiSummary: string | null;
};

interface Props {
  initial: VideoFormValue;
  onSaved: (saved: VideoFormValue & { id: string }) => void;
  onDeleted?: (id: string) => void;
}

export function VideoForm({ initial, onSaved, onDeleted }: Props) {
  const [value, setValue] = useState<VideoFormValue>(initial);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const youtubeId = extractYoutubeId(value.youtubeUrl);

  const set = <K extends keyof VideoFormValue>(k: K, v: VideoFormValue[K]) =>
    setValue((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!value.title.trim()) {
      setError("タイトルを入力してください。");
      return;
    }
    if (!youtubeId) {
      setError("有効な YouTube URL を入力してください。");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const isUpdate = !!value.id;
      const res = await fetch(
        isUpdate ? `/api/videos/${value.id}` : "/api/videos",
        {
          method: isUpdate ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: value.title.trim(),
            description: value.description.trim(),
            youtubeUrl: value.youtubeUrl.trim(),
            visibility: value.visibility,
            ...(isUpdate && { aiSummary: value.aiSummary }),
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "保存に失敗しました。");
        return;
      }
      const saved = data.video as { id: string; aiSummary: string | null; visibility: VideoVisibility };
      const next = {
        ...value,
        id: saved.id,
        aiSummary: saved.aiSummary,
        visibility: saved.visibility,
      } as VideoFormValue & { id: string };
      setValue(next);
      setMessage(isUpdate ? "保存しました。" : "投稿しました。");
      onSaved(next);
    } catch (e) {
      console.error(e);
      setError("通信に失敗しました。");
    } finally {
      setSaving(false);
    }
  };

  const generateSummary = async () => {
    if (!value.id) {
      setError("AI要約は保存後に生成できます。先に保存してください。");
      return;
    }
    setGenerating(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/videos/${value.id}/ai-summary`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "AI要約の生成に失敗しました。");
        return;
      }
      set("aiSummary", data.aiSummary as string);
      setMessage(
        data.analyzedFrom
          ? `AI要約を生成しました（${data.analyzedFrom} を分析）。`
          : "AI要約を生成しました。"
      );
    } catch (e) {
      console.error(e);
      setError("通信に失敗しました。");
    } finally {
      setGenerating(false);
    }
  };

  const remove = async () => {
    if (!value.id) return;
    if (!window.confirm("この動画を削除します。よろしいですか？")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/videos/${value.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "削除に失敗しました。");
        return;
      }
      onDeleted?.(value.id);
    } catch (e) {
      console.error(e);
      setError("通信に失敗しました。");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">タイトル *</Label>
          <Input
            id="title"
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="動画のタイトル"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="youtube">YouTube URL *</Label>
          <Input
            id="youtube"
            value={value.youtubeUrl}
            onChange={(e) => set("youtubeUrl", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
          {value.youtubeUrl && !youtubeId && (
            <p className="text-xs text-destructive">URL から動画IDを抽出できません。</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">説明（任意）</Label>
          <Textarea
            id="description"
            rows={3}
            value={value.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="動画の説明（一覧・詳細ページに表示）"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="visibility">公開設定</Label>
          <Select
            value={value.visibility}
            onValueChange={(v) => set("visibility", v as VideoVisibility)}
          >
            <SelectTrigger id="visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">{VIDEO_VISIBILITY_LABELS.PUBLIC} — 一覧に表示</SelectItem>
              <SelectItem value="UNLISTED">{VIDEO_VISIBILITY_LABELS.UNLISTED} — リンクを知る人のみ</SelectItem>
              <SelectItem value="PRIVATE">{VIDEO_VISIBILITY_LABELS.PRIVATE} — 管理者のみ</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            限定公開は一覧には出ませんが、URL を知っていれば誰でも閲覧・コメントできます。
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-sm font-semibold">AIによる要約</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={generateSummary}
              disabled={generating || !value.id}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {value.aiSummary ? "再生成" : "動画を分析して要約"}
            </Button>
          </div>
          <Textarea
            rows={5}
            value={value.aiSummary ?? ""}
            onChange={(e) => set("aiSummary", e.target.value || null)}
            placeholder="保存後、「動画を分析して要約」で YouTube の字幕・説明文から自動生成します。手動編集も可能です。"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        {message && (
          <p className="text-sm text-emerald-700">{message}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            {value.id && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={remove}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                削除
              </Button>
            )}
          </div>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
