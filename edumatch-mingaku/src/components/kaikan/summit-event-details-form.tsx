"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FormData = {
  consent_agreed: boolean;
  participant_type: string;
  referrer_name: string;
  event_discovery_source: string;
  additional_notes: string;
};

type Props = {
  onDataChange?: (data: FormData) => void;
  errors?: Partial<Record<keyof FormData, string>>;
};

/** 議員会館サミット等イベント申込時の詳細情報フォーム
 * （同意・属性・紹介者・きっかけ・連絡事項）
 */
export function SummitEventDetailsForm({ onDataChange, errors }: Props) {
  const [formData, setFormData] = useState<FormData>({
    consent_agreed: false,
    participant_type: "general",
    referrer_name: "",
    event_discovery_source: "",
    additional_notes: "",
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["consent"])
  );

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setExpandedSections(next);
  };

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    const next = { ...formData, [key]: value };
    setFormData(next);
    onDataChange?.(next);
  };

  const consentItems = [
    "主催者がイベント当日に撮影した写真・動画をホームページやSNS、印刷物等に掲載させていただく場合があります",
    "イベント参加者による会場内・講演等の撮影については、会場内の案内およびスタッフの指示に従ってください",
    "未成年者が参加される場合は、保護者の同意を得たうえでお申し込みください。また、イベント内で生成AI等を利用する場合についても、保護者の同意を前提とします",
    "ご提供いただいた個人情報は、一般社団法人教育AI活用協会が適切に管理し、本イベントの運営・ご案内等の目的に利用します。また、本イベントの協力企業等へ、関連情報のご案内を目的として提供させていただく場合があります",
    "本イベントへの参加に関連して生じた参加者間または第三者とのトラブル、損害等について、主催者の故意または重大過失による場合を除き、主催者は責任を負いかねます",
    "プログラム内容・登壇者・実施形式等は、予告なく変更となる場合があります",
    "他の参加者への迷惑行為、連盟の妨げとなる行為、主催者が不適切と判断する行為があった場合、主催者の判断により参加をお断りする、または退場いただく場合があります",
  ];

  return (
    <div className="space-y-3">
      {/* 同意チェック */}
      <details
        open={expandedSections.has("consent")}
        className="group rounded-xl border bg-amber-50/50 dark:bg-amber-950/20"
      >
        <summary
          onClick={(e) => {
            e.preventDefault();
            toggleSection("consent");
          }}
          className="flex cursor-pointer list-none items-center gap-3 p-4"
        >
          <input
            type="checkbox"
            checked={formData.consent_agreed}
            onChange={(e) => updateField("consent_agreed", e.target.checked)}
            className="h-5 w-5 rounded border-input text-primary"
            onClick={(e) => e.stopPropagation()}
            aria-label="イベント参加規約に同意する"
          />
          <span className="flex-1">
            <span className="block text-sm font-bold text-foreground">
              イベント参加規約に同意する{" "}
              <span className="text-destructive">*</span>
            </span>
            <span className="block text-[11px] text-muted-foreground">
              タップで詳細を表示
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-amber-200/50 dark:border-amber-900/30 space-y-2 px-4 py-3">
          {consentItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 text-[13px] text-foreground">
              <span className="shrink-0 font-bold text-muted-foreground">
                ③
              </span>
              <p>{item}</p>
            </div>
          ))}
        </div>
        {errors?.consent_agreed && (
          <p className="px-4 text-sm text-destructive">{errors.consent_agreed}</p>
        )}
      </details>

      {/* 参加者属性 */}
      <details
        open={expandedSections.has("participant")}
        className="group rounded-xl border bg-card"
      >
        <summary
          onClick={(e) => {
            e.preventDefault();
            toggleSection("participant");
          }}
          className="flex cursor-pointer list-none items-center gap-3 p-4"
        >
          <span className="flex-1">
            <span className="block text-sm font-bold text-foreground">
              当てはまるものにチェックをお願いいたします{" "}
              <span className="text-destructive">*</span>
            </span>
            <span className="block text-[11px] text-muted-foreground">
              {formData.participant_type === "general"
                ? "一般参加"
                : formData.participant_type === "media"
                ? "メディア関係者"
                : formData.participant_type === "aiueo"
                ? "AIUEO関係者"
                : "共創メンバー希望"}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t space-y-3 px-4 py-3">
          {[
            { value: "general", label: "一般参加" },
            { value: "media", label: "メディア関係者" },
            { value: "aiueo", label: "AIUEO関係者（スタッフ、共創メンバー）" },
            { value: "founder", label: "「共創メンバー」になることを希望する" },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-3 cursor-pointer"
            >
              <input
                type="radio"
                name="participant_type"
                value={opt.value}
                checked={formData.participant_type === opt.value}
                onChange={(e) =>
                  updateField("participant_type", e.target.value)
                }
                className="h-4 w-4 text-primary"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </details>

      {/* 紹介者・きっかけ・連絡事項 */}
      <details
        open={expandedSections.has("additional")}
        className="group rounded-xl border bg-card"
      >
        <summary
          onClick={(e) => {
            e.preventDefault();
            toggleSection("additional");
          }}
          className="flex cursor-pointer list-none items-center gap-3 p-4"
        >
          <span className="flex-1">
            <span className="block text-sm font-bold text-foreground">
              その他情報（任意）
            </span>
            <span className="block text-[11px] text-muted-foreground">
              紹介者・きっかけ・ご連絡事項
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t space-y-4 px-4 py-3">
          <div>
            <label className="block text-sm font-medium">
              ご紹介者がいらっしゃる場合、お名前をご記入ください
            </label>
            <input
              type="text"
              value={formData.referrer_name}
              onChange={(e) => updateField("referrer_name", e.target.value)}
              placeholder="例：山田太郎"
              className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              本イベントを知ったきっかけをご記入ください
            </label>
            <input
              type="text"
              value={formData.event_discovery_source}
              onChange={(e) =>
                updateField("event_discovery_source", e.target.value)
              }
              placeholder="例：SNS / 学校からの紹介 / その他"
              className="mt-1 block w-full rounded-md border border-input px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              その他連絡事項等ございましたらご記入ください
            </label>
            <textarea
              value={formData.additional_notes}
              onChange={(e) => updateField("additional_notes", e.target.value)}
              placeholder="例：当日の参加が難しくなる可能性があります など"
              rows={3}
              className="mt-1 block w-full resize-none rounded-md border border-input px-3 py-2 text-sm"
            />
          </div>
        </div>
      </details>

      {!formData.consent_agreed && (
        <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
          <p className="text-sm text-destructive font-medium">
            イベント参加規約への同意が必須です
          </p>
        </div>
      )}

      {/* Hidden inputs for form submission */}
      <input type="hidden" name="consent_agreed" value={formData.consent_agreed ? "true" : "false"} />
      <input type="hidden" name="participant_type" value={formData.participant_type} />
      <input type="hidden" name="referrer_name" value={formData.referrer_name} />
      <input type="hidden" name="event_discovery_source" value={formData.event_discovery_source} />
      <input type="hidden" name="additional_notes" value={formData.additional_notes} />
    </div>
  );
}
