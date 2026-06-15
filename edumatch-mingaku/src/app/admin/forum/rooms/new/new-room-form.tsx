"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SettingToggleRow } from "@/components/ui/toggle-switch";

/**
 * 新しい部屋を作成する専用ページ（以前はポップアップだった）。
 * 作成後は管理画面に戻る。関連コンテンツの紐付けは作成後の編集ページで行う。
 */
export function NewRoomForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [aiDiscussion, setAiDiscussion] = useState(true);
  const [saving, setSaving] = useState(false);

  const canSave = !!name.trim() && !saving;

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch("/api/forum/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          weeklyTopic: "",
          aiDiscussion,
          aiWeeklyTopicEnabled: false,
        }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const id = data?.room?.id;
        // 作成後はそのまま編集ページへ（関連コンテンツの紐付けに続けられる）。
        router.push(id ? `/admin/forum/rooms/${id}/edit` : "/admin/forum");
      } else {
        alert("部屋の作成に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground">
        <Link href="/admin/forum"><ArrowLeft className="mr-1 h-4 w-4" />管理に戻る</Link>
      </Button>
      <h1 className="text-2xl font-bold">新しい部屋を作成</h1>
      <p className="mt-1 text-sm text-muted-foreground">フォーラムに新しいテーマ部屋を追加します。</p>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">基本情報</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>部屋名 <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 保護者・家庭教育" />
          </div>
          <div className="space-y-1.5">
            <Label>説明文</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" placeholder="この部屋のテーマを簡潔に" />
          </div>
          <SettingToggleRow
            checked={aiDiscussion}
            onCheckedChange={setAiDiscussion}
            icon={Zap}
            title="AIディスカッション"
            description="投稿にAIファシリテーターが返信し、議論をサポートします。"
            activeClassName="border-violet-300 bg-violet-50"
            iconClassName={aiDiscussion ? "text-violet-600" : undefined}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button asChild variant="outline"><Link href="/admin/forum">キャンセル</Link></Button>
            <Button onClick={handleCreate} disabled={!canSave}>
              {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
              作成して編集へ
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
