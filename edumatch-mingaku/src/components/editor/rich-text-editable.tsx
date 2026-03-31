"use client";

import { useRef, useEffect, useCallback } from "react";
import TurndownService from "turndown";
import { inlineMarkdownToHtml } from "@/lib/inline-markdown-html";
import {
  caretPositionAfterUndoToPrevious,
  createUndoGroupTracker,
  isRedoShortcut,
  isUndoShortcut,
  setContentEditablePlainCaret,
  UNDO_TYPING_MERGE_MS,
} from "@/lib/text-undo-caret";

const turndown = new TurndownService({
  headingStyle: "atx",
  emDelimiter: "*", // 斜体を * で出力（_ ではなく）
});
turndown.addRule("strikethrough", {
  filter: ["del", "s"],
  replacement: (content) => `~~${content}~~`,
});

const MAX_UNDO_STACK = 100;

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
  const valueRef = useRef(value);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isApplyingHistoryRef = useRef(false);
  const composingRef = useRef(false);
  const groupTrackerRef = useRef(createUndoGroupTracker(UNDO_TYPING_MERGE_MS));

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      divRef.current = el;
      refCallback?.(el);
    },
    [refCallback]
  );

  const applyMarkdownValue = useCallback(
    (next: string) => {
      groupTrackerRef.current.flush();
      const from = valueRef.current;
      isApplyingHistoryRef.current = true;
      lastValueRef.current = next;
      valueRef.current = next;
      const el = divRef.current;
      const caretMd = caretPositionAfterUndoToPrevious(next, from);
      if (el) {
        el.innerHTML = inlineMarkdownToHtml(next || "") || "";
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const maxPlain = el.innerText.length;
            setContentEditablePlainCaret(el, Math.min(caretMd, maxPlain));
          });
        });
      }
      isInternalChangeRef.current = true;
      onChange(next);
    },
    [onChange]
  );

  // value が変わったら innerHTML をスタイル付きで同期
  useEffect(() => {
    valueRef.current = value;

    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      isInternalChangeRef.current = false;
      lastValueRef.current = value;
      // innerHTML は applyMarkdownValue 側で既に同期済み。ここで触るとキャレット復元と競合する。
      return;
    }

    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      lastValueRef.current = value;
      const el = divRef.current;
      if (!el) return;
      const targetHtml = inlineMarkdownToHtml(value || "") || "";
      const fromDom = htmlToMarkdown(el.innerHTML);
      if (fromDom !== value) {
        el.innerHTML = targetHtml;
        return;
      }
      // DOM から読んだ Markdown が value と同じなら、無差し替えでカーソル位置を維持する。
      // （毎回 innerHTML を書き換えると <div> ラッパー差などでキャレットが先頭に飛ぶ）
      const hasRenderedRich = /<strong>|<em>|<del>|<a\s/i.test(targetHtml);
      if (!hasRenderedRich || el.innerHTML === targetHtml) {
        return;
      }
      el.innerHTML = targetHtml;
      return;
    }

    if (value === lastValueRef.current) return;

    // 親（AI生成・インポート等）から差し替えられたときは Undo 履歴が無意味なのでクリア
    groupTrackerRef.current.flush();
    undoStackRef.current = [];
    redoStackRef.current = [];
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
    if (md === valueRef.current) return;
    if (!isApplyingHistoryRef.current && !composingRef.current) {
      if (groupTrackerRef.current.shouldPushSnapshot()) {
        undoStackRef.current.push(valueRef.current);
        redoStackRef.current = [];
        while (undoStackRef.current.length > MAX_UNDO_STACK) {
          undoStackRef.current.shift();
        }
      }
    }
    lastValueRef.current = md;
    valueRef.current = md;
    isInternalChangeRef.current = true;
    onChange(md);
  }, [onChange]);

  const handleCompositionStart = useCallback(() => {
    composingRef.current = true;
    groupTrackerRef.current.flush();
  }, []);

  const handleCompositionEnd = useCallback(() => {
    composingRef.current = false;
  }, []);

  const handleBlur = useCallback(() => {
    groupTrackerRef.current.flush();
    const el = divRef.current;
    if (!el) return;
    const md = htmlToMarkdown(el.innerHTML);
    onBlur?.(md);
  }, [onBlur]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    groupTrackerRef.current.flush();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  /**
   * ブラウザの contenteditable 履歴（Ctrl+Z 等）は Turndown·React 同期と競合し、
   * 逆変換の結果バックスラッシュが増殖するなどの不具合が出るため無効化する。
   */
  const handleBeforeInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const ie = e.nativeEvent as InputEvent;
    if (ie.inputType === "historyUndo" && undoStackRef.current.length > 0) {
      e.preventDefault();
      return;
    }
    if (ie.inputType === "historyRedo" && redoStackRef.current.length > 0) {
      e.preventDefault();
    }
  }, []);

  /**
   * Enter のデフォルト（ブロック用の div が増える）だと Turndown が空行を落とし、
   * 親の Markdown 同期で改行が消える。明示的に <br> を入れる。
   * フォーム内では Enter が submit されうるため止める。
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (isUndoShortcut(e) && undoStackRef.current.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        groupTrackerRef.current.flush();
        const prev = undoStackRef.current.pop()!;
        redoStackRef.current.push(valueRef.current);
        while (redoStackRef.current.length > MAX_UNDO_STACK) {
          redoStackRef.current.shift();
        }
        applyMarkdownValue(prev);
        return;
      }
      if (isRedoShortcut(e) && redoStackRef.current.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        groupTrackerRef.current.flush();
        const next = redoStackRef.current.pop()!;
        undoStackRef.current.push(valueRef.current);
        while (undoStackRef.current.length > MAX_UNDO_STACK) {
          undoStackRef.current.shift();
        }
        applyMarkdownValue(next);
        return;
      }

      if (e.key !== "Enter") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // IME 変換中・確定直前の Enter はブラウザに任せる（ここで止めると確定だけで改行になる）
      if (e.nativeEvent.isComposing || e.keyCode === 229) return;
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
      groupTrackerRef.current.flush();
      handleInput();
    },
    [applyMarkdownValue, handleInput]
  );

  /** 編集時はリンククリックで飛ばないようにする */
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (e.target as HTMLElement).closest("a[href]");
    if (anchor instanceof HTMLAnchorElement) {
      e.preventDefault();
    }
  }, []);

  // ブロック切り替え時は履歴を捨てる
  useEffect(() => {
    groupTrackerRef.current = createUndoGroupTracker(UNDO_TYPING_MERGE_MS);
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, [blockId]);

  // 初回マウント時・blockId 変更時に innerHTML を設定
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    el.innerHTML = inlineMarkdownToHtml(value || "") || "";
    valueRef.current = value;
    lastValueRef.current = value;
  }, [blockId]); // マウント時・blockId 変更時のみ（value は親から value 変更で別 useEffect が処理）

  return (
    <div
      ref={setRef}
      contentEditable
      suppressContentEditableWarning
      data-block-id={blockId}
      onBeforeInput={handleBeforeInput}
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
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
