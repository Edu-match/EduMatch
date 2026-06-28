"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generatePersonaAndAvatar } from "@/app/_actions";
import {
  PERSONA_TRAIT_OPTIONS,
  PERSONA_TONE_OPTIONS,
  PERSONA_COLOR_OPTIONS,
  PERSONA_MBTI_OPTIONS,
  MBTI_GUIDE_URL,
} from "@/lib/persona-options";
import {
  PERSONA_DIAGNOSTIC,
  summarizeDiagnostic,
  isDiagnosticComplete,
} from "@/lib/persona-diagnostic";

export type PersonaCreatorDefaults = {
  name?: string;
  bio?: string;
  organization?: string | null;
  role?: string | null;
  interests?: string[];
};

export type PersonaGenerated = {
  avatarUrl?: string;
  expertise?: string[];
  valuesText?: string;
};

/**
 * AIペルソナ＆アバターを作成する共通フォーム。
 * 「MBTIを選ぶ」か「独自の価値観診断（12問）」のどちらかで人格の核を決め、
 * 性格・雰囲気・色・好きなもの・活動・肩書きを足して生成する。
 * 登録フロー・管理者ページの双方から利用する。
 */
export function PersonaCreator({
  defaults,
  currentAvatarUrl,
  onGenerated,
}: {
  defaults: PersonaCreatorDefaults;
  currentAvatarUrl?: string | null;
  onGenerated?: (r: PersonaGenerated) => void;
}) {
  const [mode, setMode] = useState<"mbti" | "diagnostic">("mbti");
  const [mbti, setMbti] = useState("");
  const [answers, setAnswers] = useState<Record<string, "A" | "B">>({});
  const [traits, setTraits] = useState<string[]>([]);
  const [tone, setTone] = useState("");
  const [color, setColor] = useState("");
  const [keywords, setKeywords] = useState("");
  const [activities, setActivities] = useState("");
  const [jobTitle, setJobTitle] = useState(defaults.role ?? "");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<PersonaGenerated | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl ?? null);

  const diagnosticDone = isDiagnosticComplete(answers);
  const answeredCount = PERSONA_DIAGNOSTIC.filter((q) => answers[q.id]).length;

  const coreReady = mode === "mbti" ? !!mbti : diagnosticDone;
  const canGenerate =
    !generating &&
    (coreReady || traits.length > 0 || !!tone || !!color || keywords.trim() !== "" || activities.trim() !== "" || !!photo);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const freeKeywords = keywords.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
      const mbtiName = PERSONA_MBTI_OPTIONS.find((m) => m.code === mbti)?.name;
      const coreText =
        mode === "mbti"
          ? (mbti ? `MBTI：${mbti}${mbtiName ? `（${mbtiName}）` : ""}（この性格タイプらしさを反映）` : "")
          : summarizeDiagnostic(answers);
      const mindsetText = [
        coreText,
        traits.length ? `性格・タイプ：${traits.join("、")}` : "",
        tone ? `雰囲気：${tone}` : "",
        color ? `好きな色：${color}` : "",
        freeKeywords.length ? `好きなもの・趣味：${freeKeywords.join("、")}（アバターのイラストに反映）` : "",
      ].filter(Boolean).join("。 ");

      const result = await generatePersonaAndAvatar({
        name: (defaults.name || "").trim(),
        bio: defaults.bio || undefined,
        mindset: mindsetText || undefined,
        activities: activities.trim() || undefined,
        interests: defaults.interests ?? [],
        organization: defaults.organization || undefined,
        role: jobTitle.trim() || defaults.role || undefined,
        appearance: tone || color ? [tone, color && `好きな色：${color}`].filter(Boolean).join("、") : undefined,
        photoBase64: photo || undefined,
      });

      if (result.success && result.avatarUrl) {
        setAvatarUrl(result.avatarUrl);
        const gen: PersonaGenerated = {
          avatarUrl: result.avatarUrl,
          expertise: result.persona?.expertise ?? [],
          valuesText: result.persona?.valuesText ?? "",
        };
        setInfo(gen);
        onGenerated?.(gen);
      } else {
        setError(result.error ?? "生成に失敗しました");
      }
    } catch {
      setError("生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  }

  const toggleTrait = (v: string) =>
    setTraits((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  return (
    <div className="space-y-4 rounded-xl border bg-gradient-to-br from-primary/[0.06] to-violet-500/[0.06] p-4">
      <div className="flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">AIペルソナ＆アバターを作成 <span className="font-normal text-muted-foreground">（任意）</span></p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            あなたらしさを入力すると、AIがアイコンと「あなたの分身AI」を作ります。井戸端会議で本人らしく返信できます。
          </p>
        </div>
      </div>

      {/* 人格の核：MBTI か 価値観診断 を選ぶ */}
      <div className="rounded-lg border bg-background/60 p-3">
        <p className="text-xs font-semibold">① 人格の核を決める</p>
        <div className="mt-2 inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
          <button type="button" onClick={() => setMode("mbti")} className={`rounded-md px-3 py-1.5 transition ${mode === "mbti" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>MBTIを選ぶ</button>
          <button type="button" onClick={() => setMode("diagnostic")} className={`rounded-md px-3 py-1.5 transition ${mode === "diagnostic" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>価値観診断（12問）</button>
        </div>

        {mode === "mbti" ? (
          <div className="mt-3 space-y-1.5">
            <a href={MBTI_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary underline underline-offset-2 hover:opacity-80">
              MBTIとは？ タイプ診断・解説を見る ↗
            </a>
            <div className="grid grid-cols-4 gap-1.5">
              {PERSONA_MBTI_OPTIONS.map((m) => {
                const on = mbti === m.code;
                return (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => setMbti(on ? "" : m.code)}
                    className={`flex flex-col items-center rounded-lg border px-1 py-1.5 transition active:scale-95 ${on ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-input bg-background text-foreground/70 hover:border-primary/40 hover:bg-primary/5"}`}
                  >
                    <span className="text-xs font-bold tracking-wide">{m.code}</span>
                    <span className={`text-[9px] ${on ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            <p className="text-[11px] text-muted-foreground">直感で選んでください（{answeredCount}/{PERSONA_DIAGNOSTIC.length}）。MBTIが分からなくても大丈夫です。</p>
            {PERSONA_DIAGNOSTIC.map((q, i) => {
              const cur = answers[q.id];
              return (
                <div key={q.id} className="rounded-lg border bg-background p-2.5">
                  <p className="text-[12px] font-medium">{i + 1}. {q.text}</p>
                  <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {(["A", "B"] as const).map((opt) => {
                      const on = cur === opt;
                      const label = opt === "A" ? q.a : q.b;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className={`rounded-md border px-2.5 py-2 text-left text-[12px] transition active:scale-[0.99] ${on ? "border-primary bg-primary/10 font-medium" : "border-input bg-background text-foreground/70 hover:border-primary/40 hover:bg-primary/5"}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 性格・タイプ */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold">② あなたのタイプ <span className="font-normal text-muted-foreground">（複数OK・任意）</span></p>
        <div className="flex flex-wrap gap-1.5">
          {PERSONA_TRAIT_OPTIONS.map((v) => {
            const on = traits.includes(v);
            return (
              <button key={v} type="button" onClick={() => toggleTrait(v)} className={`rounded-full border px-3 py-1.5 text-xs transition active:scale-95 ${on ? "border-primary bg-primary text-primary-foreground font-medium shadow-sm" : "border-input bg-background text-foreground/70 hover:border-primary/40 hover:bg-primary/5"}`}>{v}</button>
            );
          })}
        </div>
      </div>

      {/* 雰囲気 */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold">③ アイコンの雰囲気 <span className="font-normal text-muted-foreground">（1つ・任意）</span></p>
        <div className="flex flex-wrap gap-1.5">
          {PERSONA_TONE_OPTIONS.map((t) => {
            const on = tone === t;
            return (
              <button key={t} type="button" onClick={() => setTone(on ? "" : t)} className={`rounded-full border px-3 py-1.5 text-xs transition active:scale-95 ${on ? "border-primary bg-primary text-primary-foreground font-medium shadow-sm" : "border-input bg-background text-foreground/70 hover:border-primary/40 hover:bg-primary/5"}`}>{t}</button>
            );
          })}
        </div>
      </div>

      {/* 好きな色 */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold">④ 好きな色 <span className="font-normal text-muted-foreground">（1つ・任意）</span></p>
        <div className="flex flex-wrap gap-1.5">
          {PERSONA_COLOR_OPTIONS.map((c) => {
            const on = color === c.label;
            return (
              <button key={c.label} type="button" onClick={() => setColor(on ? "" : c.label)} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition active:scale-95 ${on ? "border-primary bg-primary/10 font-medium" : "border-input bg-background text-foreground/70 hover:border-primary/40 hover:bg-primary/5"}`}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.dot }} />{c.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 好きなもの・キーワード */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold">⑤ 好きなもの・キーワード <span className="font-normal text-muted-foreground">（任意・カンマ区切り）</span></p>
        <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="例：野球, ラグビー, 読書, 音楽, 自然" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <p className="text-[10px] text-muted-foreground">好きなものはアバターのイラストにモチーフとして反映されます。</p>
      </div>

      {/* 肩書き・活動 */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold">⑥ 肩書き・活動 <span className="font-normal text-muted-foreground">（任意）</span></p>
        <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="肩書き・役割（例：高校教員、起業部 顧問）" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <textarea value={activities} onChange={(e) => setActivities(e.target.value)} rows={3} placeholder="普段の活動・取り組み（例：探究学習の授業づくり、子ども向けプログラミング教室の運営 など）" className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <p className="text-[10px] text-muted-foreground">活動・経験は、AIペルソナが「あなたらしく」返信する材料になります。</p>
      </div>

      {/* 本人写真（任意） */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">本人写真（任意）— 指定すると写真の雰囲気を活かしたイラストを生成します</label>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 8 * 1024 * 1024) { setError("画像は8MB以内にしてください"); return; }
              const reader = new FileReader();
              reader.onload = () => { setPhoto(typeof reader.result === "string" ? reader.result : null); setPhotoName(f.name); };
              reader.readAsDataURL(f);
            }}
            className="text-xs file:mr-2 file:rounded-md file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-xs"
          />
          {photo && <button type="button" className="text-[11px] text-muted-foreground underline" onClick={() => { setPhoto(null); setPhotoName(""); }}>取り消す</button>}
        </div>
        {photoName && <p className="truncate text-[11px] text-violet-600">添付: {photoName}</p>}
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {generating ? "生成中…（30秒ほど）" : avatarUrl ? "作り直す" : "AIペルソナ＆アバターを生成"}
      </button>
      {error && <p className="text-[11px] text-red-500">{error}</p>}

      {(avatarUrl || info) && (
        <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="生成されたアバター" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          )}
          <div className="min-w-0 text-[11px] text-muted-foreground">
            <p className="font-bold text-emerald-600">✅ ペルソナ＆アイコンを設定しました。</p>
            {info?.expertise && info.expertise.length > 0 && <p className="truncate">得意分野: {info.expertise.join("、")}</p>}
            {info?.valuesText && <p className="line-clamp-2">価値観: {info.valuesText}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
