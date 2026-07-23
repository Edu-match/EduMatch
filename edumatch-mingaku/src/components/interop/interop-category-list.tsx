"use client";

import { ArrowLeft, ChevronRight, ExternalLink, MessageCircle, Users } from "lucide-react";

export type InteropListItem = {
  id: string;
  name: string;
  description?: string;
  postCount?: number;
  participantCount?: number;
  /** 設定時は外部リンク（掲示板ではない）を示す */
  isLink?: boolean;
};

/**
 * 一般カテゴリ内の一覧UI（アイコン中心の周回マップに代わるリスト表示）。
 * 行をタップすると階層の次（掲示板/論点）または外部リンクへ遷移する。
 */
export function InteropCategoryList({
  title,
  accent = "#9fb4e8",
  items,
  onSelect,
  onBack,
  backLabel = "戻る",
}: {
  title: string;
  accent?: string;
  items: InteropListItem[];
  onSelect: (item: InteropListItem) => void;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* ヘッダー（タイトルは控えめ・アイコンは中心化しない） */}
      <div className="flex items-center gap-3 px-4 pt-16 pb-3 sm:px-6 sm:pt-20">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-bold text-white/85 backdrop-blur transition-colors hover:bg-black/60"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
        </button>
        <h2 className="text-lg font-bold text-white" style={{ textShadow: `0 0 16px ${accent}55` }}>
          {title}
        </h2>
      </div>

      {/* 一覧 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 sm:px-6">
        <ul className="mx-auto flex max-w-2xl flex-col gap-2">
          {items.length === 0 ? (
            <li className="py-16 text-center text-sm text-white/45">項目がありません。</li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(135deg, rgba(14,22,52,0.66) 0%, ${accent}1f 100%)`,
                    borderColor: `${accent}44`,
                    boxShadow: `0 2px 14px rgba(0,0,0,0.3)`,
                  }}
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
                    style={{ background: `${accent}26`, border: `1px solid ${accent}55` }}
                  >
                    {item.isLink ? (
                      <ExternalLink className="h-4 w-4" style={{ color: accent }} />
                    ) : (
                      <MessageCircle className="h-4 w-4" style={{ color: accent }} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-white/95">{item.name}</span>
                      {item.isLink && (
                        <span className="shrink-0 rounded-full bg-sky-400/15 px-1.5 py-0.5 text-[10px] font-bold text-sky-200">
                          リンク
                        </span>
                      )}
                    </span>
                    {item.description && (
                      <span className="mt-0.5 line-clamp-1 block text-[11px] text-white/50">{item.description}</span>
                    )}
                    {!item.isLink && (item.postCount ?? 0) > 0 && (
                      <span className="mt-1 inline-flex items-center gap-2 text-[10.5px] text-white/45">
                        <span className="inline-flex items-center gap-0.5">
                          <MessageCircle className="h-3 w-3" /> {item.postCount}
                        </span>
                        {(item.participantCount ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <Users className="h-3 w-3" /> {item.participantCount}
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
