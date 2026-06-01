/** AI チャット SSE ストリームの共有型・エンコーダ */

export type ChatActivityPhase =
  | "analyze"
  | "site_search"
  | "site_item"
  | "site_done"
  | "site_empty"
  | "keyword_fallback"
  | "rag_search"
  | "rag_item"
  | "rag_done"
  | "rag_empty"
  | "prepare"
  | "web_search"
  | "web_searching"
  | "web_sources"
  | "web_skipped"
  | "generating";

export type WebSource = {
  title: string;
  url: string;
};

export type RagDocRef = {
  title: string;
  url: string | null;
};

export type ChatStreamStatusEvent =
  | {
      type: "status";
      id: string;
      phase: ChatActivityPhase;
      message: string;
      submessage?: string;
      status: "active";
    }
  | {
      type: "status_update";
      id: string;
      message?: string;
      submessage?: string;
      status: "done" | "skipped";
    };

export type ChatStreamEvent =
  | ChatStreamStatusEvent
  | {
      type: "meta";
      ragKnowledgeHits: number;
      siteContextHits: number;
      ragDocRefs: RagDocRef[];
      webSources: WebSource[];
    }
  | { type: "delta"; content: string }
  | { type: "error"; message: string }
  | { type: "done" };

const _enc = new TextEncoder();

export function encodeSse(event: ChatStreamEvent): Uint8Array {
  return _enc.encode(`data: ${JSON.stringify(event)}\n\n`);
}

export const SSE_DONE_BYTES = _enc.encode("data: [DONE]\n\n");
