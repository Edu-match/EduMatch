"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { updateKaikanContent } from "@/app/_actions/kaikan";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition disabled:opacity-50"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      保存する
    </button>
  );
}

/** UTC の ISO 文字列を datetime-local 形式に変換（JST 表示用）。 */
function utcToDatetimeLocal(utcIso: string | null): string {
  if (!utcIso) return "";
  const d = new Date(utcIso);
  // UTC → JST (+09:00)
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

/** コンテンツ編集フォーム（管理者向け）。折りたたみ形式で埋め込む。 */
export function KaikanContentEditor({
  id,
  title,
  description,
  location,
  speaker,
  startsAt,
  endsAt,
  capacity,
  contentType,
}: {
  id: string;
  title: string;
  description: string;
  location: string;
  speaker: string;
  startsAt: string | null;
  endsAt: string | null;
  capacity: number | null;
  contentType: string;
}) {
  return (
    <form action={updateKaikanContent} className="space-y-3">
      <input type="hidden" name="id" value={id} />

      <div>
        <label className="text-xs text-muted-foreground">タイトル（必須）</label>
        <input
          name="title"
          type="text"
          defaultValue={title}
          required
          className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">説明</label>
        <textarea
          name="description"
          defaultValue={description}
          rows={2}
          className="mt-1 w-full resize-none rounded-md border border-input px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs text-muted-foreground">場所</label>
          <input
            name="location"
            type="text"
            defaultValue={location}
            className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">定員（空欄=無制限）</label>
          <input
            name="capacity"
            type="number"
            min={0}
            defaultValue={capacity ?? ""}
            className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">登壇者（複数は改行または／で区切る）</label>
        <textarea
          name="speaker"
          defaultValue={speaker}
          rows={2}
          className="mt-1 w-full resize-none rounded-md border border-input px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground">開始</label>
          <input
            name="starts_at"
            type="datetime-local"
            defaultValue={utcToDatetimeLocal(startsAt)}
            className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">終了</label>
          <input
            name="ends_at"
            type="datetime-local"
            defaultValue={utcToDatetimeLocal(endsAt)}
            className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">種別</label>
          <select
            name="content_type"
            defaultValue={contentType}
            className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
          >
            <option value="session">セッション</option>
            <option value="workshop">ワークショップ</option>
            <option value="keynote">基調講演</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
