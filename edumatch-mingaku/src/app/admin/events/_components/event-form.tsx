"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { createEvent, updateEvent } from "@/app/_actions/events";
import type { EventInput } from "@/app/_actions/events";

type EventFormProps =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      id: string;
      defaultValues: EventInput;
    };

export function EventForm(props: EventFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const [values, setValues] = useState<EventInput>(
    isEdit
      ? props.defaultValues
      : {
          title: "",
          description: "",
          event_date: "",
          venue: "",
          company: "",
          external_url: "",
        }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof EventInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("タイトルは必須です");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = isEdit
        ? await updateEvent(props.id, values)
        : await createEvent(values);

      if (result.success) {
        router.push("/admin/events");
        router.refresh();
      } else {
        setError(result.error ?? "保存に失敗しました");
      }
    } catch {
      setError("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-6 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/events")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          一覧に戻る
        </Button>
        <h1 className="text-xl font-bold">
          {isEdit ? "イベント編集" : "イベント新規追加"}
        </h1>
      </div>

      {error && (
        <div className="mb-4 bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">イベント情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">
                タイトル <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={values.title}
                onChange={set("title")}
                placeholder="例: EdTech Japan 2026"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event_date">開催日（YYYY-MM-DD）</Label>
              <Input
                id="event_date"
                type="date"
                value={values.event_date ?? ""}
                onChange={set("event_date")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="venue">開催場所</Label>
                <Input
                  id="venue"
                  value={values.venue ?? ""}
                  onChange={set("venue")}
                  placeholder="例: 東京国際フォーラム"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="company">主催者</Label>
                <Input
                  id="company"
                  value={values.company ?? ""}
                  onChange={set("company")}
                  placeholder="例: 株式会社エデュマッチ"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="external_url">詳細・申込URL</Label>
              <Input
                id="external_url"
                type="url"
                value={values.external_url ?? ""}
                onChange={set("external_url")}
                placeholder="https://example.com/event"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">概要・説明</Label>
              <Textarea
                id="description"
                value={values.description ?? ""}
                onChange={set("description")}
                rows={5}
                placeholder="イベントの概要や内容を入力してください"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/events")}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : isEdit ? (
                  "更新する"
                ) : (
                  "追加する"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
