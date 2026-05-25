"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

type OverrideEntry = { override: string; original: string };

type TextEditContextValue = {
  /** 編集モードが有効か */
  editMode: boolean;
  /** 編集モードの切り替え */
  setEditMode: (v: boolean) => void;
  /** 管理者など、編集権限があるか */
  canEdit: boolean;
};

const TextEditContext = createContext<TextEditContextValue>({
  editMode: false,
  setEditMode: () => {},
  canEdit: false,
});

export function useTextEdit() {
  return useContext(TextEditContext);
}

/* ------------------------------------------------------------------ */
/* DOM ユーティリティ                                                  */
/* ------------------------------------------------------------------ */

function isIgnored(node: Node | null): boolean {
  let el: Element | null =
    node && node.nodeType === Node.TEXT_NODE
      ? node.parentElement
      : (node as Element | null);
  while (el) {
    if (typeof SVGElement !== "undefined" && el instanceof SVGElement) return true;
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return true;
    if (el.getAttribute && el.getAttribute("data-te-ignore") !== null) return true;
    el = el.parentElement;
  }
  return false;
}

/** body を基準にした、テキストノードの安定キー（子インデックスの並び）。 */
function domPathOf(node: Node): string | null {
  const parts: number[] = [];
  let cur: Node | null = node;
  const root = document.body;
  while (cur && cur !== root) {
    const parent: Node | null = cur.parentNode;
    if (!parent) return null;
    parts.unshift(Array.prototype.indexOf.call(parent.childNodes, cur));
    cur = parent;
  }
  if (cur !== root) return null;
  return parts.join("/");
}

function walkText(cb: (t: Text) => void) {
  if (typeof document === "undefined" || !document.body) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const t = n as Text;
      if (!t.nodeValue || !t.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (isIgnored(t)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null = walker.nextNode();
  while (n) {
    cb(n as Text);
    n = walker.nextNode();
  }
}

/** 前後の空白を保ったまま中身だけ差し替えられるよう分解する。 */
function splitWhitespace(value: string): { lead: string; core: string; trail: string } {
  const lead = (value.match(/^\s*/) ?? [""])[0];
  const trail = (value.match(/\s*$/) ?? [""])[0];
  const core = value.slice(lead.length, value.length - trail.length);
  return { lead, core, trail };
}

function getTextNodeAtPoint(x: number, y: number): Text | null {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (
      x: number,
      y: number
    ) => { offsetNode: Node } | null;
  };
  let node: Node | null = null;
  if (typeof doc.caretRangeFromPoint === "function") {
    node = doc.caretRangeFromPoint(x, y)?.startContainer ?? null;
  } else if (typeof doc.caretPositionFromPoint === "function") {
    node = doc.caretPositionFromPoint(x, y)?.offsetNode ?? null;
  }
  if (
    node &&
    node.nodeType === Node.TEXT_NODE &&
    (node as Text).nodeValue?.trim() &&
    !isIgnored(node)
  ) {
    return node as Text;
  }
  return null;
}

/** クリック位置から編集対象のテキストノードを特定する。 */
function resolveTextNode(target: EventTarget | null, x: number, y: number): Text | null {
  const atPoint = getTextNodeAtPoint(x, y);
  if (atPoint) return atPoint;

  const el = target as Element | null;
  if (!el || !(el instanceof Element) || isIgnored(el)) return null;

  // 直下のテキストノードを優先
  for (const c of Array.from(el.childNodes)) {
    if (c.nodeType === Node.TEXT_NODE && c.nodeValue?.trim()) return c as Text;
  }
  // なければ最初の子孫テキストノード
  let found: Text | null = null;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const t = n as Text;
      if (!t.nodeValue || !t.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (isIgnored(t)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  found = walker.nextNode() as Text | null;
  return found;
}

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

type EditorState = {
  open: boolean;
  key: string;
  value: string;
  original: string;
  hasOverride: boolean;
};

const EMPTY_EDITOR: EditorState = {
  open: false,
  key: "",
  value: "",
  original: "",
  hasOverride: false,
};

export function TextEditProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [canEdit, setCanEdit] = useState(false);
  const [editMode, setEditModeState] = useState(false);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [saving, setSaving] = useState(false);

  const overridesRef = useRef<Map<string, OverrideEntry>>(new Map());
  const applyingRef = useRef(false);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  /* 管理者判定 */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setCanEdit(d?.profile?.role === "ADMIN");
      })
      .catch(() => {
        if (!cancelled) setCanEdit(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /* 上書きの適用 */
  const applyOverrides = useCallback(() => {
    const map = overridesRef.current;
    if (!map.size) return;
    applyingRef.current = true;
    try {
      walkText((t) => {
        const key = domPathOf(t);
        if (!key) return;
        const entry = map.get(key);
        if (!entry) return;
        const { lead, trail } = splitWhitespace(t.nodeValue ?? "");
        const next = lead + entry.override + trail;
        if (t.nodeValue !== next) t.nodeValue = next;
      });
    } finally {
      applyingRef.current = false;
    }
  }, []);

  /* ページが変わるたびに上書きを取得して適用 */
  useEffect(() => {
    let cancelled = false;
    overridesRef.current = new Map();
    fetch(`/api/text-overrides?pathname=${encodeURIComponent(pathname)}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d: { overrides?: { key: string; override: string; original: string }[] }) => {
        if (cancelled) return;
        const map = new Map<string, OverrideEntry>();
        for (const o of d.overrides ?? []) {
          map.set(o.key, { override: o.override, original: o.original });
        }
        overridesRef.current = map;
        applyOverrides();
        // 初期描画が遅れても反映されるよう少し後にも適用
        setTimeout(applyOverrides, 300);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname, applyOverrides]);

  /* DOM 変化を監視して再適用 */
  useEffect(() => {
    if (typeof MutationObserver === "undefined" || !document.body) return;
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (applyingRef.current || scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        applyOverrides();
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [applyOverrides]);

  const setEditMode = useCallback(
    (v: boolean) => {
      if (v && !canEdit) return;
      setEditModeState(v);
      if (!v) setEditor(EMPTY_EDITOR);
    },
    [canEdit]
  );

  /* 編集モード中のクリック・ホバー処理 */
  useEffect(() => {
    if (!editMode || !canEdit) return;

    document.body.classList.add("te-edit-active");

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target && target.closest && target.closest("[data-te-ignore]")) return;
      const node = resolveTextNode(e.target, e.clientX, e.clientY);
      if (!node) return;
      e.preventDefault();
      e.stopPropagation();
      const key = domPathOf(node);
      if (!key) return;
      const { core } = splitWhitespace(node.nodeValue ?? "");
      const existing = overridesRef.current.get(key);
      setEditor({
        open: true,
        key,
        value: core,
        original: existing ? existing.original : core,
        hasOverride: !!existing,
      });
    };

    const onMove = (e: MouseEvent) => {
      const box = highlightRef.current;
      if (!box) return;
      const target = e.target as Element | null;
      if (target && target.closest && target.closest("[data-te-ignore]")) {
        box.style.display = "none";
        return;
      }
      const node = resolveTextNode(e.target, e.clientX, e.clientY);
      const el = node?.parentElement;
      if (!el) {
        box.style.display = "none";
        return;
      }
      const r = el.getBoundingClientRect();
      box.style.display = "block";
      box.style.top = `${r.top - 2}px`;
      box.style.left = `${r.left - 2}px`;
      box.style.width = `${r.width + 4}px`;
      box.style.height = `${r.height + 4}px`;
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("mousemove", onMove, true);
    return () => {
      document.body.classList.remove("te-edit-active");
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("mousemove", onMove, true);
    };
  }, [editMode, canEdit]);

  const handleSave = useCallback(async () => {
    const key = editor.key;
    const newText = editor.value;
    setSaving(true);
    try {
      const res = await fetch("/api/text-overrides", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pathname,
          textKey: key,
          original: editor.original,
          override: newText,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "保存に失敗しました");
      }
      overridesRef.current.set(key, {
        override: newText,
        original: editor.original,
      });
      applyOverrides();
      setEditor(EMPTY_EDITOR);
      toast.success("文言を保存しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [editor, pathname, applyOverrides]);

  const handleReset = useCallback(async () => {
    const key = editor.key;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/text-overrides?pathname=${encodeURIComponent(
          pathname
        )}&textKey=${encodeURIComponent(key)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("リセットに失敗しました");
      const entry = overridesRef.current.get(key);
      overridesRef.current.delete(key);
      // 元の文言にDOMを戻す
      walkText((t) => {
        if (domPathOf(t) !== key) return;
        const { lead, trail } = splitWhitespace(t.nodeValue ?? "");
        t.nodeValue = lead + (entry?.original ?? editor.original) + trail;
      });
      setEditor(EMPTY_EDITOR);
      toast.success("元の文言に戻しました");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "リセットに失敗しました");
    } finally {
      setSaving(false);
    }
  }, [editor, pathname]);

  return (
    <TextEditContext.Provider value={{ editMode, setEditMode, canEdit }}>
      {children}

      {editMode && canEdit && (
        <>
          {/* ホバー中の文字を囲うハイライト */}
          <div
            ref={highlightRef}
            data-te-ignore
            style={{
              display: "none",
              position: "fixed",
              zIndex: 55,
              pointerEvents: "none",
              border: "2px solid #f97316",
              borderRadius: "4px",
              background: "rgba(249,115,22,0.08)",
              transition: "all 60ms ease-out",
            }}
          />

          {/* 上部の操作バー */}
          <div
            data-te-ignore
            className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-3 border-t border-orange-300 bg-orange-50 px-4 py-2 text-sm shadow-[0_-2px_8px_rgba(0,0,0,0.06)]"
          >
            <span className="font-bold text-orange-700">テキスト編集モード</span>
            <span className="hidden text-orange-700/80 sm:inline">
              編集したい文字をクリックしてください
            </span>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="ml-2 rounded-md bg-orange-600 px-3 py-1 font-medium text-white hover:bg-orange-500"
            >
              編集モードを終了
            </button>
          </div>

          {/* 編集パネル */}
          {editor.open && (
            <div
              data-te-ignore
              className="fixed bottom-16 left-1/2 z-[70] w-[min(92vw,520px)] -translate-x-1/2 rounded-lg border bg-white p-4 shadow-2xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">文言を編集</h3>
                <button
                  type="button"
                  onClick={() => setEditor(EMPTY_EDITOR)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="閉じる"
                >
                  ✕
                </button>
              </div>
              <p className="mb-1 text-xs text-gray-500">
                元の文言: <span className="text-gray-700">{editor.original}</span>
              </p>
              <textarea
                autoFocus
                value={editor.value}
                onChange={(e) =>
                  setEditor((prev) => ({ ...prev, value: e.target.value }))
                }
                rows={Math.min(6, Math.max(2, editor.value.split("\n").length))}
                className="w-full resize-y rounded-md border border-gray-300 p-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <div className="mt-3 flex items-center justify-end gap-2">
                {editor.hasOverride && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={saving}
                    className="mr-auto rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    元に戻す
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditor(EMPTY_EDITOR)}
                  disabled={saving}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-500 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </TextEditContext.Provider>
  );
}
