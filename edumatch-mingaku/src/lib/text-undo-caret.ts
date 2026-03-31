/**
 * 直前の編集を取り消したあと、どの文字位置にキャレットを置くかの推定。
 * （1 回の挿入・削除を想定した単純な共通接頭辞／接尾辞ベース）
 */
export function caretPositionAfterUndoToPrevious(prev: string, next: string): number {
  let i = 0;
  const minLen = Math.min(prev.length, next.length);
  while (i < minLen && prev[i] === next[i]) i++;
  if (prev.length >= next.length) {
    return Math.min(i + (prev.length - next.length), prev.length);
  }
  return Math.min(i, prev.length);
}

/** 本文・Markdown 等で連続入力をまとめるときの既定の休止時間（ms） */
export const UNDO_TYPING_MERGE_MS = 380;

/**
 * @param idleMs このミリ秒以上入力が止まると「1 まとまり」終了。0 以下なら毎回 Undo を積む（ショートフィールド向け）
 */
export function createUndoGroupTracker(idleMs: number | undefined = UNDO_TYPING_MERGE_MS, onFlush?: () => void) {
  if (idleMs <= 0) {
    return {
      shouldPushSnapshot: () => true,
      flush: () => {},
    };
  }

  let inGroup = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (inGroup) {
      inGroup = false;
      onFlush?.();
    }
  };

  const scheduleEnd = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, idleMs);
  };

  /** 次の変更で新しい Undo スナップショットを積むべきか */
  const shouldPushSnapshot = (): boolean => {
    if (!inGroup) {
      inGroup = true;
      scheduleEnd();
      return true;
    }
    scheduleEnd();
    return false;
  };

  return { shouldPushSnapshot, flush };
}

/** contenteditable 内のキャレット位置（文字オフセット。ノード内 ZWSP も 1 文字としてカウント） */
export function getPlainTextCaretOffset(root: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return 0;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return 0;
  const pre = range.cloneRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

export function setContentEditablePlainCaret(root: HTMLElement, offset: number): void {
  const o = Math.max(0, offset);
  const sel = window.getSelection();
  if (!sel) return;
  let remaining = o;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = walker.nextNode();
  while (n) {
    const textNode = n as Text;
    const len = textNode.length;
    if (remaining <= len) {
      const range = document.createRange();
      range.setStart(textNode, remaining);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      root.focus();
      return;
    }
    remaining -= len;
    n = walker.nextNode();
  }
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  root.focus();
}
