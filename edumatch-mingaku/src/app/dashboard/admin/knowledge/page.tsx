"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

// ─── 文書種別 ────────────────────────────────────────────────────────────────

type SourceType =
  | "curriculum_elementary" | "curriculum_middle" | "curriculum_high"
  | "mext_giga" | "mext_digital" | "mext_special" | "mext_guideline"
  | "oecd_learning" | "oecd_teaching" | "oecd_other"
  | "school_standard" | "education_plan"
  | "cue_answer" | "law_education"
  | "other";

type SourceTypeGroup = {
  label: string;
  options: { value: SourceType; label: string }[];
};

const SOURCE_TYPE_GROUPS: SourceTypeGroup[] = [
  {
    label: "学習指導要領",
    options: [
      { value: "curriculum_elementary", label: "学習指導要領（小学校）" },
      { value: "curriculum_middle",     label: "学習指導要領（中学校）" },
      { value: "curriculum_high",       label: "学習指導要領（高等学校）" },
    ],
  },
  {
    label: "文科省ガイドライン・施策",
    options: [
      { value: "mext_giga",      label: "GIGAスクール構想関連" },
      { value: "mext_digital",   label: "デジタル教育・教科書" },
      { value: "mext_special",   label: "特別支援教育" },
      { value: "mext_guideline", label: "文科省ガイドライン（その他）" },
    ],
  },
  {
    label: "OECD",
    options: [
      { value: "oecd_learning", label: "OECD ラーニングコンパス 2030" },
      { value: "oecd_teaching", label: "OECD ティーチングコンパス" },
      { value: "oecd_other",    label: "OECD その他" },
    ],
  },
  {
    label: "法令・基準・計画",
    options: [
      { value: "school_standard", label: "学校設置基準" },
      { value: "education_plan",  label: "教育振興基本計画" },
      { value: "cue_answer",      label: "中央教育審議会答申" },
      { value: "law_education",   label: "教育基本法・学校教育法" },
    ],
  },
  {
    label: "その他",
    options: [
      { value: "other", label: "その他（自由記述）" },
    ],
  },
];

const SOURCE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  SOURCE_TYPE_GROUPS.flatMap((g) => g.options.map((o) => [o.value, o.label]))
);

// ─── 型 ────────────────────────────────────────────────────────────────────

type KnowledgeDoc = {
  id: string;
  title: string;
  source_type: string;
  source_type_other: string | null;
  source_url: string | null;
  description: string | null;
  created_at: string;
  _count: { chunks: number };
};

// ─── ページ ─────────────────────────────────────────────────────────────────

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
    source_type: "curriculum_elementary" as SourceType,
    source_type_other: "",
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

  useEffect(() => { void fetchDocuments(); }, [fetchDocuments]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setError("ファイルを選択してください"); return; }
    if (!form.title.trim()) { setError("タイトルを入力してください"); return; }
    if (form.source_type === "other" && !form.source_type_other.trim()) {
      setError("「その他」を選んだ場合は種別名を入力してください"); return;
    }

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", form.title.trim());
      fd.append("source_type", form.source_type);
      if (form.source_type === "other") fd.append("source_type_other", form.source_type_other.trim());
      if (form.source_url.trim())    fd.append("source_url", form.source_url.trim());
      if (form.description.trim())   fd.append("description", form.description.trim());

      const res = await fetch("/api/knowledge/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) { setError(data.error ?? "アップロードに失敗しました"); return; }

      setSuccess(`登録完了: ${data.chunk_count} チャンクを保存しました`);
      setForm({ title: "", source_type: "curriculum_elementary", source_type_other: "", source_url: "", description: "" });
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

  const docLabel = (doc: KnowledgeDoc) => {
    if (doc.source_type === "other" && doc.source_type_other) return doc.source_type_other;
    return SOURCE_TYPE_LABEL[doc.source_type] ?? doc.source_type;
  };

  // カテゴリ別に集計
  const groupCounts = SOURCE_TYPE_GROUPS.map((g) => ({
    label: g.label,
    count: documents.filter((d) => g.options.some((o) => o.value === d.source_type)).length,
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ナレッジ文書管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          教育公的文書・ガイドラインをアップロードしてAIの参照源に追加します。
          PDF・TXT・MD 対応。アップロード後にチャンク分割と Embedding 生成が自動実行されます。
        </p>
        {/* 統計バッジ */}
        <div className="mt-3 flex flex-wrap gap-2">
          {groupCounts.filter((g) => g.count > 0).map((g) => (
            <span key={g.label} className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-1">
              {g.label}
              <span className="font-bold">{g.count}</span>
            </span>
          ))}
          {documents.length === 0 && (
            <span className="text-xs text-gray-400">まだ文書が登録されていません</span>
          )}
        </div>
      </div>

      {/* アップロードフォーム */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-5">文書を追加</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* タイトル */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例: 学習指導要領（2017年改訂・小学校）"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* 文書種別 */}
            <div className={form.source_type === "other" ? "" : "md:col-span-2"}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                文書種別 <span className="text-red-500">*</span>
              </label>
              <select
                value={form.source_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, source_type: e.target.value as SourceType, source_type_other: "" }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {SOURCE_TYPE_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* その他: 自由記述 */}
            {form.source_type === "other" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  種別名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.source_type_other}
                  onChange={(e) => setForm((f) => ({ ...f, source_type_other: e.target.value }))}
                  placeholder="例: 不登校対策ガイドライン"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}

            {/* 出典URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                出典URL <span className="text-gray-400 text-xs font-normal">（任意）</span>
              </label>
              <input
                type="url"
                value={form.source_url}
                onChange={(e) => setForm((f) => ({ ...f, source_url: e.target.value }))}
                placeholder="https://www.mext.go.jp/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* 説明 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明・メモ <span className="text-gray-400 text-xs font-normal">（任意）</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="改訂年度・対象範囲・章番号など"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* ファイル */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ファイル <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-gray-400 font-normal">PDF / TXT / MD（最大20MB）</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                required
              />
              {file && (
                <p className="mt-1 text-xs text-gray-500">
                  {file.name}（{(file.size / 1024).toFixed(0)} KB）
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{success}</div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                処理中…（チャンク化・Embedding生成）
              </>
            ) : "アップロードして登録"}
          </button>
        </form>
      </div>

      {/* 文書一覧 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          登録済み文書
          <span className="ml-2 text-sm font-normal text-gray-500">（{documents.length} 件）</span>
        </h2>

        {loading ? (
          <div className="text-sm text-gray-500 py-8 text-center">読み込み中…</div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-300 rounded-xl">
            まだ文書が登録されていません
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 text-sm">{doc.title}</span>
                    <span className="inline-block text-xs bg-indigo-100 text-indigo-700 rounded-full px-2 py-0.5 whitespace-nowrap">
                      {docLabel(doc)}
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
                      <a href={doc.source_url} target="_blank" rel="noopener noreferrer"
                        className="hover:text-indigo-600 truncate max-w-xs">
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
