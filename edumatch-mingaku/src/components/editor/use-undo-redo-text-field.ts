"use client";

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_MAX_DEPTH = 100;

export type UndoRedoTextFieldBinding = {
  inputRef: React.MutableRefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  commit: (next: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onBeforeInput: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
};

/**
 * ネイティブの input/textarea 履歴とフォームの短縮キーが競合しやすい箇所向けに、
 * マークダウンブロック・キャプション・リスト行などで Ctrl+Z / Ctrl+Shift+Z（および Ctrl+Y）を統一する。
 */
export function useUndoRedoTextField({
  value,
  onCommit,
  historyKey,
  maxDepth = DEFAULT_MAX_DEPTH,
}: {
  value: string;
  onCommit: (next: string) => void;
  historyKey: string;
  maxDepth?: number;
}): UndoRedoTextFieldBinding {
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const valueRef = useRef(value);
  const lastCommittedRef = useRef(value);
  const composingRef = useRef(false);
  const isApplyingHistoryRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, [historyKey]);

  useEffect(() => {
    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      lastCommittedRef.current = value;
      valueRef.current = value;
      const el = inputRef.current;
      if (el && "setSelectionRange" in el) {
        const len = value.length;
        requestAnimationFrame(() => {
          try {
            el.setSelectionRange(len, len);
          } catch {
            /* 非対応タイプは無視 */
          }
        });
      }
      return;
    }
    if (value !== lastCommittedRef.current) {
      undoStackRef.current = [];
      redoStackRef.current = [];
      lastCommittedRef.current = value;
    }
    valueRef.current = value;
  }, [value]);

  const applyHistory = useCallback(
    (next: string) => {
      isApplyingHistoryRef.current = true;
      valueRef.current = next;
      lastCommittedRef.current = next;
      onCommit(next);
    },
    [onCommit]
  );

  const commit = useCallback(
    (next: string) => {
      if (!isApplyingHistoryRef.current && !composingRef.current) {
        if (next !== valueRef.current) {
          undoStackRef.current.push(valueRef.current);
          redoStackRef.current = [];
          while (undoStackRef.current.length > maxDepth) undoStackRef.current.shift();
        }
      }
      valueRef.current = next;
      lastCommittedRef.current = next;
      onCommit(next);
    },
    [onCommit, maxDepth]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "z" || k === "y") {
          const redo = k === "y" || (k === "z" && e.shiftKey);
          const undo = k === "z" && !e.shiftKey;
          if (undo || redo) {
            e.preventDefault();
            e.stopPropagation();
            if (undo && undoStackRef.current.length > 0) {
              const prev = undoStackRef.current.pop()!;
              redoStackRef.current.push(valueRef.current);
              while (redoStackRef.current.length > maxDepth) redoStackRef.current.shift();
              applyHistory(prev);
              return;
            }
            if (redo && redoStackRef.current.length > 0) {
              const next = redoStackRef.current.pop()!;
              undoStackRef.current.push(valueRef.current);
              while (undoStackRef.current.length > maxDepth) undoStackRef.current.shift();
              applyHistory(next);
            }
          }
        }
      }
    },
    [applyHistory, maxDepth]
  );

  const onBeforeInput = useCallback((e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const ie = e.nativeEvent as InputEvent;
    if (ie.inputType === "historyUndo" || ie.inputType === "historyRedo") {
      e.preventDefault();
    }
  }, []);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(() => {
    composingRef.current = false;
  }, []);

  return {
    inputRef,
    commit,
    onKeyDown,
    onBeforeInput,
    onCompositionStart,
    onCompositionEnd,
  };
}
