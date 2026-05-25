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

/** キー = 「出現順インデックス」+ SEP + 「元の文言(トリム済み)」 */
const SEP = "";

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

  for (const c of Array.from(el.childNodes)) {
    if (c.nodeType === Node.TEXT_NODE && c.nodeValue?.trim()) return c as Text;
  }
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const t = n as Text;
      if (!t.nodeValue || !t.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (isIgnored(t)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  return walker.nextNode() as Text | null;
}

function decodeKey(key: string): { idx: number; original: string } {
  const i = key.indexOf(SEP);
  if (i < 0) return { idx: 0, original: key };
  return { idx: parseInt(key.slice(0, i), 10) || 0, original: key.slice(i + 1) };
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

  const overridesRef = useRef<Map<string, OverrideEntry>>(new Map());
  const applyingRef = useRef(false);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  // 各テキストノードに割り当てた安定キー（再描画で内容が変わっても保持）
  const nodeKeyRef = useRef<WeakMap<Text, string>>(new WeakMap());

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

  /**
   * 全テキストノードを走査し、各ノードに安定キー（出現順＋元文言）を割り当てて cb を呼ぶ。
   * 内容ベースのキーなので、リロードしても同じ文言・同じ並びなら同じキーになる。
   */
  const walkAssign = useCallback((cb: (t: Text, key: string) => void) => {
    const counts = new Map<string, number>();
    walkText((t) => {
      let key = nodeKeyRef.current.get(t);
      if (key) {
        const { idx, original } = decodeKey(key);
        const c = counts.get(original) ?? 0;
        counts.set(original, Math.max(c, idx + 1));
      } else {
        const { core } = splitWhitespace(t.nodeValue ?? "");
        const idx = counts.get(core) ?? 0;
        counts.set(core, idx + 1);
        key = `${idx}${SEP}${core}`;
        nodeKeyRef.current.set(t, key);
      }
      cb(t, key);
    });
  }, []);

  /* 上書きの適用 */
  const applyOverrides = useCallback(() => {
    const map = overridesRef.current;
    if (!map.size) return;
    applyingRef.current = true;
    try {
      walkAssign((t, key) => {
        const entry = map.get(key);
        if (!entry) return;
        const { lead, trail } = splitWhitespace(t.nodeValue ?? "");
        const next = lead + entry.override + trail;
        if (t.nodeValue !== next) t.nodeValue = next;
      });
    } finally {
      applyingRef.current = false;
    }
  }, [walkAssign]);

  /** クリックされたノードの安定キーを求める。 */
  const computeKeyForNode = useCallback(
    (target: Text): string | null => {
      let found: string | null = null;
      walkAssign((t, key) => {
        if (t === target) found = key;
      });
      return found;
    },
    [walkAssign]
  );

  /* ページが変わるたびに上書きを取得して適用 */
  useEffect(() => {
    let cancelled = false;
    overridesRef.current = new Map();
    nodeKeyRef.current = new WeakMap();
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
        setTimeout(applyOverrides, 300);
        setTimeout(applyOverrides, 1000);
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
      const key = computeKeyForNode(node);
      if (!key) return;
      const { core } = splitWhitespace(node.nodeValue ?? "");
      const existing = overridesRef.current.get(key);
      setEditor({
        open: true,
        key,
        value: existing ? existing.override : core,
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
  }, [editMode, canEdit, computeKeyForNode]);

  /** 指定キーのノードを元の文言に戻す（DOM上）。 */
  const restoreToOriginal = useCallback(
    (key: string, original: string) => {
      applyingRef.current = true;
      try {
        walkAssign((t, k) => {
          if (k !== key) return;
          const { lead, trail } = splitWhitespace(t.nodeValue ?? "");
          t.nodeValue = lead + original + trail;
        });
      } finally {
        applyingRef.current = false;
      }
    },
    [walkAssign]
  );

  /* 保存：先に画面へ反映し、サーバー保存はバックグラウンドで行う */
  const handleSave = useCallback(() => {
    const key = editor.key;
    const newText = editor.value;
    const original = editor.original;
    const prev = overridesRef.current.get(key);

    // 楽観的更新：すぐ反映してパネルを閉じる
    overridesRef.current.set(key, { override: newText, original });
    applyOverrides();
    setEditor(EMPTY_EDITOR);

    void fetch("/api/text-overrides", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathname, textKey: key, original, override: newText }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error || "保存に失敗しました");
        }
        toast.success("文言を保存しました");
      })
      .catch((err) => {
        // 失敗したら元に戻す
        if (prev) overridesRef.current.set(key, prev);
        else overridesRef.current.delete(key);
        if (prev) applyOverrides();
        else restoreToOriginal(key, original);
        toast.error(err instanceof Error ? err.message : "保存に失敗しました");
      });
  }, [editor, pathname, applyOverrides, restoreToOriginal]);

  /* リセット：元の文言に戻す */
  const handleReset = useCallback(() => {
    const key = editor.key;
    const entry = overridesRef.current.get(key);
    const original = entry?.original ?? editor.original;

    overridesRef.current.delete(key);
    restoreToOriginal(key, original);
    setEditor(EMPTY_EDITOR);

    void fetch(
      `/api/text-overrides?pathname=${encodeURIComponent(
        pathname
      )}&textKey=${encodeURIComponent(key)}`,
      { method: "DELETE", credentials: "include" }
    )
      .then((res) => {
        if (!res.ok) throw new Error("リセットに失敗しました");
        toast.success("元の文言に戻しました");
      })
      .catch((err) => {
        // 失敗したら戻す
        if (entry) {
          overridesRef.current.set(key, entry);
          applyOverrides();
        }
        toast.error(err instanceof Error ? err.message : "リセットに失敗しました");
      });
  }, [editor, pathname, applyOverrides, restoreToOriginal]);

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

          {/* 下部の操作バー */}
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
                    className="mr-auto rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    元に戻す
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditor(EMPTY_EDITOR)}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-500"
                >
                  保存
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </TextEditContext.Provider>
  );
}
