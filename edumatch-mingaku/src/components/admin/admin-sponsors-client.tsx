"use client";

import { useState } from "react";
import type { SponsorPlacement } from "@prisma/client";
import {
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  ExternalLink,
  MousePointerClick,
} from "lucide-react";
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
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SafeImage } from "@/components/ui/safe-image";
import { uploadImage } from "@/app/_actions";
import {
  createSponsorAd,
  updateSponsorAd,
  deleteSponsorAd,
  toggleSponsorAd,
} from "@/app/_actions/sponsor-ads";

export type AdminSponsorItem = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string;
  placement: SponsorPlacement;
  isActive: boolean;
  position: number;
  startsAt: string | null;
  endsAt: string | null;
  clickCount: number;
};

const PLACEMENT_LABELS: Record<SponsorPlacement, string> = {
  HOME_MAIN: "トップ メインカラム（横長バナー）",
  HOME_SIDEBAR: "トップ 右サイドバー",
};

type FormState = {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  placement: SponsorPlacement;
  isActive: boolean;
  position: number;
  startsAt: string; // datetime-local
  endsAt: string; // datetime-local
};

const emptyForm: FormState = {
  title: "",
  description: "",
  imageUrl: "",
  linkUrl: "",
  placement: "HOME_MAIN",
  isActive: true,
  position: 0,
  startsAt: "",
  endsAt: "",
};

/** ISO(UTC) → datetime-local 入力値（ローカル時刻） */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

/** datetime-local 入力値 → ISO文字列（空なら null） */
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function itemToForm(item: AdminSponsorItem): FormState {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    imageUrl: item.imageUrl,
    linkUrl: item.linkUrl,
    placement: item.placement,
    isActive: item.isActive,
    position: item.position,
    startsAt: isoToLocalInput(item.startsAt),
    endsAt: isoToLocalInput(item.endsAt),
  };
}

export function AdminSponsorsClient({
  initialAds,
}: {
  initialAds: AdminSponsorItem[];
}) {
  const [ads, setAds] = useState<AdminSponsorItem[]>(initialAds);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const openNew = () => {
    setError(null);
    setForm({ ...emptyForm });
  };
  const openEdit = (item: AdminSponsorItem) => {
    setError(null);
    setForm(itemToForm(item));
  };
  const closeForm = () => {
    setForm(null);
    setError(null);
  };

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [k]: v } : prev));

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadImage(fd);
      if (res.success && res.url) {
        setField("imageUrl", res.url);
      } else {
        setError(res.error ?? "画像のアップロードに失敗しました");
      }
    } catch (e) {
      console.error(e);
      setError("画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        image_url: form.imageUrl,
        link_url: form.linkUrl,
        placement: form.placement,
        is_active: form.isActive,
        position: Number(form.position) || 0,
        starts_at: localInputToIso(form.startsAt),
        ends_at: localInputToIso(form.endsAt),
      };

      const res = form.id
        ? await updateSponsorAd({ id: form.id, ...payload })
        : await createSponsorAd(payload);

      if (!res.success || !res.id) {
        setError(res.error ?? "保存に失敗しました");
        return;
      }

      const savedItem: AdminSponsorItem = {
        id: res.id,
        title: payload.title,
        description: payload.description,
        imageUrl: payload.image_url,
        linkUrl: payload.link_url,
        placement: payload.placement,
        isActive: payload.is_active,
        position: payload.position,
        startsAt: payload.starts_at,
        endsAt: payload.ends_at,
        clickCount: form.id
          ? ads.find((a) => a.id === form.id)?.clickCount ?? 0
          : 0,
      };

      setAds((prev) => {
        const exists = prev.some((a) => a.id === savedItem.id);
        const next = exists
          ? prev.map((a) => (a.id === savedItem.id ? savedItem : a))
          : [...prev, savedItem];
        return next.sort(
          (a, b) =>
            a.placement.localeCompare(b.placement) || a.position - b.position
        );
      });
      closeForm();
    } catch (e) {
      console.error(e);
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (item: AdminSponsorItem, next: boolean) => {
    setBusyId(item.id);
    setAds((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, isActive: next } : a))
    );
    const res = await toggleSponsorAd(item.id, next);
    if (!res.success) {
      // ロールバック
      setAds((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, isActive: !next } : a))
      );
    }
    setBusyId(null);
  };

  const onDelete = async (item: AdminSponsorItem) => {
    if (!window.confirm(`「${item.title}」を削除します。よろしいですか？`)) return;
    setBusyId(item.id);
    const res = await deleteSponsorAd(item.id);
    if (res.success) {
      setAds((prev) => prev.filter((a) => a.id !== item.id));
      if (form?.id === item.id) closeForm();
    }
    setBusyId(null);
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">スポンサーPRを管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            トップページのメインカラムや右サイドバーに表示する広告バナーを登録・管理します。
          </p>
        </div>
        {!form && (
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4" />
            新規追加
          </Button>
        )}
      </div>

      {/* 編集フォーム */}
      {form && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm">
                {form.id ? "スポンサーPRを編集" : "スポンサーPRを新規追加"}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="text-muted-foreground hover:text-foreground"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 画像 */}
            <div className="space-y-1.5">
              <Label>バナー画像 *</Label>
              {form.imageUrl ? (
                <div className="space-y-2">
                  <div className="relative aspect-[16/6] w-full max-w-xl overflow-hidden rounded-lg border bg-muted">
                    <SafeImage
                      src={form.imageUrl}
                      alt="プレビュー"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setField("imageUrl", "")}
                  >
                    画像を変更
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition-colors">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    クリックして画像をアップロード（JPEG/PNG/WebP・5MBまで）
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (file) void handleUpload(file);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
              <p className="text-[11px] text-muted-foreground">
                推奨比率: メインカラムは横長（16:5前後）、サイドバーは 16:9。
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title">タイトル（スポンサー名）*</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="例: 株式会社〇〇"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="link">リンク先URL *</Label>
                <Input
                  id="link"
                  value={form.linkUrl}
                  onChange={(e) => setField("linkUrl", e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">説明文（任意）</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="キャッチコピーや補足説明"
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>表示位置</Label>
                <Select
                  value={form.placement}
                  onValueChange={(v) => setField("placement", v as SponsorPlacement)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLACEMENT_LABELS) as SponsorPlacement[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PLACEMENT_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="position">表示順（小さいほど先頭）</Label>
                <Input
                  id="position"
                  type="number"
                  value={form.position}
                  onChange={(e) => setField("position", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>公開状態</Label>
                <div className="flex items-center gap-2 h-9">
                  <ToggleSwitch
                    checked={form.isActive}
                    onCheckedChange={(v) => setField("isActive", v)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {form.isActive ? "公開" : "非公開"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="starts">掲載開始日時（任意）</Label>
                <Input
                  id="starts"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setField("startsAt", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ends">掲載終了日時（任意）</Label>
                <Input
                  id="ends"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setField("endsAt", e.target.value)}
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={closeForm} disabled={saving}>
                キャンセル
              </Button>
              <Button size="sm" onClick={save} disabled={saving || uploading}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 一覧 */}
      {ads.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            スポンサーPRはまだ登録されていません。「新規追加」から登録してください。
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {ads.map((ad) => (
            <li key={ad.id}>
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                      <SafeImage src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{ad.title}</span>
                        <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {PLACEMENT_LABELS[ad.placement]}
                        </span>
                        {!ad.isActive && (
                          <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            非公開
                          </span>
                        )}
                      </div>
                      {ad.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {ad.description}
                        </p>
                      )}
                      <a
                        href={ad.linkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline break-all"
                      >
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        {ad.linkUrl}
                      </a>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <MousePointerClick className="h-3.5 w-3.5" />
                          {ad.clickCount} クリック
                        </span>
                        <span>表示順: {ad.position}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5">
                        <ToggleSwitch
                          checked={ad.isActive}
                          disabled={busyId === ad.id}
                          onCheckedChange={(v) => void onToggle(ad, v)}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(ad)}
                          disabled={busyId === ad.id}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void onDelete(ad)}
                          disabled={busyId === ad.id}
                        >
                          {busyId === ad.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
