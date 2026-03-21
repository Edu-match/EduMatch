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
  let md = turndown.turndown(html).replace(/\u200B/g, "");
  if (!md.replace(/[\s\u00a0]/g, "")) return "";
  // 先頭の空白のみ除去（.trim() は行末の Markdown 改行「  \n」まで消してしまう）
  return md.replace(/^\s+/, "");
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

  // value が変わったら innerHTML をスタイル付きで同期
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      lastValueRef.current = value;
      const el = divRef.current;
      if (!el) return;
      const html = inlineMarkdownToHtml(value || "");
      el.innerHTML = html || "";
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

  /**
   * Enter のデフォルト（ブロック用の div が増える）だと Turndown が空行を落とし、
   * 親の Markdown 同期で改行が消える。明示的に <br> を入れる。
   * フォーム内では Enter が submit されうるため止める。
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Enter") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      e.stopPropagation();
      const el = divRef.current;
      if (!el) return;
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const range = sel.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;
      range.deleteContents();
      const br = document.createElement("br");
      range.insertNode(br);
      const zwsp = document.createTextNode("\u200B");
      br.parentNode?.insertBefore(zwsp, br.nextSibling);
      range.setStartAfter(zwsp);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      handleInput();
    },
    [handleInput]
  );

  /** 編集時はリンククリックで飛ばないようにする */
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a[href]");
    if (anchor instanceof HTMLAnchorElement) {
      e.preventDefault();
    }
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
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPaste={handlePaste}
      onClick={handleClick}
      data-placeholder={placeholder}
      className={className}
      style={style}
    />
  );
}
