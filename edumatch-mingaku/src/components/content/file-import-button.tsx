"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { toast } from "sonner";
import { toImportedContent, type ImportType } from "@/lib/imported-content";

const ACCEPT = ".html,.htm,.css,.md,.tsx,.jsx";

type Props = {
  onImport: (content: string) => void;
  disabled?: boolean;
};

export function FileImportButton({ onImport, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    const typeMap: Record<string, ImportType> = {
      html: "html",
      htm: "html",
      css: "css",
      md: "md",
      tsx: "tsx",
      jsx: "tsx",
    };
    const type = typeMap[ext ?? ""];
    if (!type) {
      toast.error(".html / .css / .md / .tsx ファイルを選択してください");
      e.target.value = "";
      return;
    }
    try {
      const raw = await file.text();
      const content = toImportedContent(type, raw);
      onImport(content);
      toast.success("ファイルをインポートしました");
    } catch (err) {
      console.error(err);
      toast.error("ファイルの読み込みに失敗しました");
    }
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <FileUp className="h-4 w-4 mr-2" />
        ファイルをインポート
      </Button>
    </>
  );
}
