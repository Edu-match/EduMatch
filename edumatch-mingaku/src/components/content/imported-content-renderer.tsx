"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { transform } from "sucrase";
import type { ImportType } from "@/lib/imported-content";

type Props = {
  type: ImportType;
  content: string;
  className?: string;
};

/** HTML をサニタイズして表示（style タグは許可） */
function SafeHtml({ html, className }: { html: string; className?: string }) {
  const sanitized = useMemo(() => {
    let s = html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|iframe|object|embed|form)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<(script|iframe|object|embed|input|button)[^>]*\/?>/gi, "")
      .replace(/\s+on\w+=["'][^"']*["']/gi, "")
      .replace(/\s+on\w+=\s*[^\s>]+/gi, "")
      .replace(/javascript:/gi, "");
    return s;
  }, [html]);
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

/** TSX をトランスパイルして実行（iframe で隔離、軽量） */
function TsxRenderer({ code, className }: { code: string; className?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [srcdoc, setSrcdoc] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    try {
      const js = transform(code, {
        transforms: ["jsx", "typescript"],
        jsxRuntime: "classic",
      }).code;
      const mod = js.replace(/export\s+default\s+/, "var __Component = ");
      const escaped = mod.replace(/<\/script>/gi, "<\\/script>");
      const html = `<!DOCTYPE html><html><head><script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script><script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script></head><body><div id="root"><\/div><pre id="err" style="color:red;padding:8px;font-size:12px;display:none;"><\/pre><script>
var React=window.React,ReactDOM=window.ReactDOM;
try{${escaped}
var C=typeof __Component!=="undefined"?__Component:function(){return React.createElement("div",null,"export default が必要です");};
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(C,{}));}catch(e){document.getElementById("err").textContent=e.message||String(e);document.getElementById("err").style.display="block";}
<\/script><\/body><\/html>`;
      if (!cancelled) setSrcdoc(html);
    } catch (e) {
      if (!cancelled) setError(e instanceof Error ? e.message : String(e));
    }
    return () => { cancelled = true; };
  }, [code]);

  if (error) {
    return (
      <div className={`rounded border border-destructive bg-destructive/10 p-4 text-sm ${className ?? ""}`}>
        <p className="font-medium text-destructive">TSX の実行エラー</p>
        <pre className="mt-2 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <iframe
      title="TSX Preview"
      srcDoc={srcdoc}
      className={`w-full min-h-[200px] border rounded-lg ${className ?? ""}`}
      sandbox="allow-scripts"
    />
  );
}

export function ImportedContentRenderer({ type, content, className }: Props) {
  if (type === "html") {
    return <SafeHtml html={content} className={className} />;
  }
  if (type === "css") {
    return (
      <div className={className}>
        <style dangerouslySetInnerHTML={{ __html: content }} />
        <p className="text-sm text-muted-foreground">CSS を読み込みました（スタイルはページに適用されます）</p>
      </div>
    );
  }
  if (type === "md") {
    return (
      <div className={`prose prose-slate max-w-none dark:prose-invert ${className ?? ""}`}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }
  if (type === "tsx") {
    return <TsxRenderer code={content} className={className} />;
  }
  return null;
}
