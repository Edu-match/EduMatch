"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

type SourceType =
  | "curriculum"
  | "mext_guideline"
  | "oecd_compass"
  | "school_standard"
  | "education_plan"
  | "other";

const SOURCE_TYPE_OPTIONS: { value: SourceType; label: string }[] = [
  { value: "curriculum", label: "学習指導要領" },
  { value: "mext_guideline", label: "文科省ガイドライン（GIGAスクール等）" },
  { value: "oecd_compass", label: "OECD Learning Compass 2030" },
  { value: "school_standard", label: "学校設置基準" },
  { value: "education_plan", label: "教育振興基本計画" },
  { value: "other", label: "その他" },
];

type KnowledgeDoc = {
  id: string;
  title: string;
  source_type: string;
  source_url: string | null;
  description: string | null;
  created_at: string;
  _count: { chunks: number };
};

const SOURCE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  SOURCE_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

export default function AdminKnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    source_type: "curriculum" as SourceType,
    source_url: "",
    description: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge/upload");
      if (!res.ok) throw new Error("文書一覧の取得に失敗しました");
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("ファイルを選択してください");
      return;
    }
    if (!form.title.trim()) {
      setError("タイトルを入力してください");
      return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", form.title.trim());
      fd.append("source_type", form.source_type);
      if (form.source_url.trim()) fd.append("source_url", form.source_url.trim());
      if (form.description.trim()) fd.append("description", form.description.trim());

      const res = await fetch("/api/knowledge/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "アップロードに失敗しました");
        return;
      }

      setSuccess(`登録完了: ${data.chunk_count} チャンクを保存しました`);
      setForm({ title: "", source_type: "curriculum", source_url: "", description: "" });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await fetchDocuments();
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteId(id);
    setError(null);
    try {
      const res = await fetch("/api/knowledge/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "削除に失敗しました");
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError("削除中にエラーが発生しました");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ナレッジ文書管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          教育公的文書・ガイドラインをアップロードしてRAGの参照源に追加します。
          PDF・TXT・MD に対応。アップロード後にチャンク分割とEmbedding生成が自動実行されます。
        </p>
      </div>

      {/* アップロードフォーム */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">文書を追加</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例: 学習指導要領（2017年改訂・小学校）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                文書種別 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.source_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source_type: e.target.value as SourceType }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SOURCE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                出典URL（任意）
              </label>
              <input
                type="url"
                value={form.source_url}
                onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                placeholder="https://www.mext.go.jp/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明・メモ（任意）
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="文書の概要や改訂年度など"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ファイル <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  PDF / TXT / MD（最大20MB）
                </span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                required
              />
              {file && (
                <p className="mt-1 text-xs text-gray-500">
                  {file.name} ({(file.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                処理中…（チャンク化・Embedding生成）
              </>
            ) : (
              "アップロードして登録"
            )}
          </button>
        </form>
      </div>

      {/* 文書一覧 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          登録済み文書
          <span className="ml-2 text-sm font-normal text-gray-500">
            ({documents.length} 件)
          </span>
        </h2>

        {loading ? (
          <div className="text-sm text-gray-500 py-8 text-center">読み込み中…</div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-300 rounded-xl">
            まだ文書が登録されていません
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {doc.title}
                    </span>
                    <span className="inline-block text-xs bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 whitespace-nowrap">
                      {SOURCE_TYPE_LABEL[doc.source_type] ?? doc.source_type}
                    </span>
                    <span className="inline-block text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 whitespace-nowrap">
                      {doc._count.chunks} チャンク
                    </span>
                  </div>
                  {doc.description && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">{doc.description}</p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
                    {doc.source_url && (
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 truncate max-w-xs"
                      >
                        {doc.source_url}
                      </a>
                    )}
                    <span>{new Date(doc.created_at).toLocaleDateString("ja-JP")}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleteId === doc.id}
                  className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 disabled:text-red-300 transition-colors px-2 py-1 rounded"
                >
                  {deleteId === doc.id ? "削除中…" : "削除"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
