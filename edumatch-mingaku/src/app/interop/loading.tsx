import { Loader2 } from "lucide-react";

/** /interop 配下のページ遷移中に表示するローディング（戻る・進む共通） */
export default function Loading() {
  return (
    <div className="grid min-h-[100dvh] w-full place-items-center bg-[#070a1c] text-white/70">
      <span className="flex items-center gap-2 text-sm font-bold">
        <Loader2 className="h-6 w-6 animate-spin" /> 読み込み中…
      </span>
    </div>
  );
}
