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

// ─── 型定義 ──────────────────────────────────────────────────────────────────

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

const MAX_FILES = 10;

type SourceEntry = {
  id: string;
  file: File | null;
  label: string;       // タイトルに付与するサブラベル（例: "小学校編"）
  sourceUrl: string;   // 出典参照URL
  inputKey: number;    // file input をリセットするためのキー
};

function makeEntry(seq: number): SourceEntry {
  return { id: String(seq), file: null, label: "", sourceUrl: "", inputKey: Date.now() + seq };
}

// ─── ページ ──────────────────────────────────────────────────────────────────

export default function AdminKnowledgePage() {
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reEmbedding, setReEmbedding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const seqRef = useRef(2);

  // ─── 共通フォームフィールド ─────────────────────────────────────────────
  const [form, setForm] = useState({
    title: "",
    source_type: "curriculum_elementary" as SourceType,
    source_type_other: "",
    description: "",
  });

  // ─── ソースエントリリスト（ファイル + ラベル + 出典URL） ─────────────────
  const [sourceEntries, setSourceEntries] = useState<SourceEntry[]>([makeEntry(1)]);

  const addEntry = () => {
    if (sourceEntries.length >= MAX_FILES) return;
    const id = String(seqRef.current++);
    setSourceEntries((prev) => [...prev, makeEntry(Number(id))]);
  };

  const removeEntry = (id: string) => {
    setSourceEntries((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((e) => e.id !== id);
    });
  };

  const updateEntry = (id: string, patch: Partial<SourceEntry>) => {
    setSourceEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const resetEntries = () => {
    seqRef.current = 2;
    setSourceEntries([makeEntry(1)]);
  };

  // ─── ドキュメント一覧取得 ────────────────────────────────────────────────
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

  // ─── Re-Embedding ────────────────────────────────────────────────────────
  const handleReEmbed = async () => {
    if (!window.confirm("全チャンクの Embedding を再生成しますか？\n件数によっては数分かかります。")) return;
    setError(null);
    setSuccess(null);
    setReEmbedding(true);
    try {
      const res = await fetch("/api/knowledge/re-embed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Re-Embedding に失敗しました"); return; }
      setSuccess(
        `Re-Embedding 完了: ${data.updated}件 更新 / ${data.failed}件 失敗（合計 ${data.total}件）`
        + (data.errors?.length ? `\nエラー詳細: ${data.errors.join("; ")}` : "")
      );
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setReEmbedding(false);
    }
  };

  // ─── アップロード ────────────────────────────────────────────────────────
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validEntries = sourceEntries.filter((en) => en.file !== null);
    if (validEntries.length === 0) {
      setError("ファイルを1つ以上選択してください");
      return;
    }
    if (!form.title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (form.source_type === "other" && !form.source_type_other.trim()) {
      setError("「その他」を選んだ場合は種別名を入力してください");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("source_type", form.source_type);
      if (form.source_type === "other") fd.append("source_type_other", form.source_type_other.trim());
      if (form.description.trim()) fd.append("description", form.description.trim());

      for (const entry of validEntries) {
        fd.append("files", entry.file!);
        fd.append("labels", entry.label.trim());
        fd.append("source_urls", entry.sourceUrl.trim());
      }

      const res = await fetch("/api/knowledge/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "アップロードに失敗しました");
        return;
      }

      let msg = `登録完了: ${data.document_count}文書、合計 ${data.total_chunk_count} チャンクを保存しました`;
      if (data.errors?.length) {
        msg += `\n失敗 ${data.errors.length}件: ${data.errors.map((er: { title: string; error: string }) => `「${er.title}」${er.error}`).join(" / ")}`;
      }
      setSuccess(msg);
      setForm({ title: "", source_type: "curriculum_elementary", source_type_other: "", description: "" });
      resetEntries();
      await fetchDocuments();
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  // ─── 削除 ────────────────────────────────────────────────────────────────
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

  const groupCounts = SOURCE_TYPE_GROUPS.map((g) => ({
    label: g.label,
    count: documents.filter((d) => g.options.some((o) => o.value === d.source_type)).length,
  }));

  const validCount = sourceEntries.filter((e) => e.file !== null).length;

  // ─── レンダリング ────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ナレッジ文書管理</h1>
        <p className="mt-1 text-sm text-gray-500">
          教育公的文書・ガイドラインをアップロードしてAIの参照源に追加します。
          1タイトルに対してPDF・TXT・MDを最大{MAX_FILES}件まとめて登録できます。
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

        {/* Re-Embedding ボタン */}
        {documents.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={handleReEmbed}
              disabled={reEmbedding}
              className="inline-flex items-center gap-2 text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 disabled:opacity-60 text-amber-800 rounded-lg px-3 py-1.5 transition-colors"
            >
              {reEmbedding ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Embedding 再生成中…
                </>
              ) : "⚙️ 全チャンクの Embedding を再生成"}
            </button>
            <span className="text-xs text-gray-400">※ ダミー値が入っている場合に使用</span>
          </div>
        )}
      </div>

      {/* アップロードフォーム */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-5">文書を追加</h2>
        <form onSubmit={handleUpload} className="space-y-5">

          {/* ── 共通メタデータ ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* タイトル */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タイトル <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-gray-400 font-normal">（複数ファイルに共通）</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="例: 学習指導要領（2017年改訂）"
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

            {/* 説明 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                説明・メモ <span className="text-gray-400 text-xs font-normal">（任意・共通）</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="改訂年度・対象範囲・章番号など"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* ── ファイルリスト ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                ファイル
                <span className="text-red-500 ml-0.5">*</span>
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  PDF / TXT / MD（各最大20MB）合計最大{MAX_FILES}件
                </span>
              </label>
              <span className="text-xs text-gray-400">
                {validCount}/{MAX_FILES} 件選択中
              </span>
            </div>

            <div className="space-y-3">
              {sourceEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2"
                >
                  {/* ファイル行 */}
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 font-mono w-5 pt-2.5 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <input
                        key={entry.inputKey}
                        type="file"
                        accept=".pdf,.txt,.md"
                        onChange={(e) =>
                          updateEntry(entry.id, { file: e.target.files?.[0] ?? null })
                        }
                        className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {entry.file && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {entry.file.name}（{(entry.file.size / 1024).toFixed(0)} KB）
                        </p>
                      )}
                    </div>
                    {sourceEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="shrink-0 text-xs text-red-400 hover:text-red-600 transition-colors px-1.5 py-1 rounded"
                        aria-label="このエントリを削除"
                      >
                        削除
                      </button>
                    )}
                  </div>

                  {/* ラベル・出典URL行 */}
                  <div className="flex gap-2 pl-7">
                    <div className="w-36 shrink-0">
                      <input
                        type="text"
                        value={entry.label}
                        onChange={(e) => updateEntry(entry.id, { label: e.target.value })}
                        placeholder="ラベル（例: 小学校編）"
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="url"
                        value={entry.sourceUrl}
                        onChange={(e) => updateEntry(entry.id, { sourceUrl: e.target.value })}
                        placeholder="出典URL（任意）https://www.mext.go.jp/..."
                        className="w-full border border-gray-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ファイルを追加ボタン */}
            {sourceEntries.length < MAX_FILES && (
              <button
                type="button"
                onClick={addEntry}
                className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-dashed border-indigo-300 hover:border-indigo-500 rounded-lg px-3 py-2 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                ファイルを追加（あと{MAX_FILES - sourceEntries.length}件）
              </button>
            )}
          </div>

          {/* エラー・成功メッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 whitespace-pre-line">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 whitespace-pre-line">{success}</div>
          )}

          <button
            type="submit"
            disabled={uploading || validCount === 0}
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
            ) : `${validCount}件のファイルをアップロードして登録`}
          </button>
        </form>
      </div>

      {/* 登録済み文書一覧 */}
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
