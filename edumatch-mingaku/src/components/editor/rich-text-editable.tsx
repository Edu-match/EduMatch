"use client";

import { useRef, useEffect, useCallback } from "react";
import TurndownService from "turndown";
import { inlineMarkdownToHtml } from "@/lib/inline-markdown-html";

const turndown = new TurndownService({
  headingStyle: "atx",
  emDelimiter: "*", // 斜体を * で出力（_ ではなく）
});
turndown.addRule("strikethrough", {
  filter: ["del", "s"],
  replacement: (content) => `~~${content}~~`,
});

export function htmlToMarkdown(html: string): string {
  if (!html || html === "<br>" || html === "<div><br></div>") return "";
  const md = turndown.turndown(html);
  return md.trim();
}

interface RichTextEditableProps {
  blockId: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  refCallback?: (el: HTMLDivElement | null) => void;
  "data-block-id"?: string;
}

export function RichTextEditable({
  blockId,
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  style,
  refCallback,
}: RichTextEditableProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const isInternalChangeRef = useRef(false);
  const lastValueRef = useRef(value);

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      divRef.current = el;
      refCallback?.(el);
    },
    [refCallback]
  );

  // 親から value が変わったとき（外部変更）のみ innerHTML を更新
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    const el = divRef.current;
    if (!el) return;
    const html = inlineMarkdownToHtml(value || "");
    if (el.innerHTML !== html) {
      el.innerHTML = html || "";
    }
  }, [value]);

  const handleInput = useCallback(() => {
    const el = divRef.current;
    if (!el) return;
    const md = htmlToMarkdown(el.innerHTML);
    lastValueRef.current = md;
    isInternalChangeRef.current = true;
    onChange(md);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    const el = divRef.current;
    if (!el) return;
    const md = htmlToMarkdown(el.innerHTML);
    onBlur?.(md);
  }, [onBlur]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  // 初回マウント時・blockId 変更時に innerHTML を設定
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    el.innerHTML = inlineMarkdownToHtml(value || "") || "";
  }, [blockId]); // マウント時・blockId 変更時のみ（value は親から value 変更で別 useEffect が処理）

  return (
    <div
      ref={setRef}
      contentEditable
      suppressContentEditableWarning
      data-block-id={blockId}
      onInput={handleInput}
      onBlur={handleBlur}
      onPaste={handlePaste}
      data-placeholder={placeholder}
      className={className}
      style={style}
    />
  );
}
