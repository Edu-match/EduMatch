"use client";

import { useState } from "react";
import { Sparkles, Loader2, Plus, X } from "lucide-react";
import { generatePersonaAndAvatar } from "@/app/_actions";
import { PERSONA_MBTI_OPTIONS, MBTI_GUIDE_URL } from "@/lib/persona-options";
import { PERSONA_DIAGNOSTIC, summarizeDiagnostic, isDiagnosticComplete } from "@/lib/persona-diagnostic";

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

// 「好きなこと」をタップで足せるサジェスト（一般的で誰にでも当てはまるカテゴリ）。
const INTEREST_SUGGESTIONS = [
  "読書", "音楽", "映画・ドラマ", "旅行", "料理", "カフェ", "スポーツ",
  "アウトドア・自然", "写真", "アート", "テクノロジー", "ゲーム",
  "ファッション", "散歩", "動物・ペット", "学び・自己研鑽",
];

/**
 * AIペルソナ＆アバターを作成する共通フォーム。
 * 人格の核は「MBTIを選ぶ」か「独自の価値観診断（12問）」で決め、
 * 好きなこと・肩書き・活動を足して生成する。登録フロー／管理者ページで共用。
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
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState("");
  const [jobTitle, setJobTitle] = useState(defaults.role ?? "");
  const [activities, setActivities] = useState<string[]>(["", "", ""]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<PersonaGenerated | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl ?? null);

  const diagnosticDone = isDiagnosticComplete(answers);
  const answeredCount = PERSONA_DIAGNOSTIC.filter((q) => answers[q.id]).length;
  const activityList = activities.map((a) => a.trim()).filter(Boolean);

  const coreReady = mode === "mbti" ? !!mbti : diagnosticDone;
  const canGenerate =
    !generating && (coreReady || interests.length > 0 || activityList.length > 0 || !!photo);

  const addInterest = (v: string) => {
    const t = v.trim();
    if (!t) return;
    setInterests((prev) => (prev.includes(t) ? prev : [...prev, t]));
  };
  const toggleInterest = (v: string) =>
    setInterests((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const mbtiName = PERSONA_MBTI_OPTIONS.find((m) => m.code === mbti)?.name;
      const coreText =
        mode === "mbti"
          ? (mbti ? `MBTI：${mbti}${mbtiName ? `（${mbtiName}）` : ""}（この性格タイプらしさを反映）` : "")
          : summarizeDiagnostic(answers);
      const mindsetText = [
        coreText,
        interests.length ? `好きなこと・趣味：${interests.join("、")}（アバターのイラストに反映）` : "",
      ].filter(Boolean).join("。 ");

      const result = await generatePersonaAndAvatar({
        name: (defaults.name || "").trim(),
        bio: defaults.bio || undefined,
        mindset: mindsetText || undefined,
        activities: activityList.length ? activityList.join("、") : undefined,
        interests: [...(defaults.interests ?? []), ...interests],
        organization: defaults.organization || undefined,
        role: jobTitle.trim() || defaults.role || undefined,
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

  return (
    <div className="space-y-5 rounded-xl border bg-gradient-to-br from-primary/[0.06] to-violet-500/[0.06] p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold">AIペルソナ＆アバターを作成 <span className="font-normal text-muted-foreground">（任意）</span></p>
      </div>

      {/* ① 人格の核：MBTI か 価値観診断 */}
      <div className="rounded-lg border bg-background/60 p-3">
        <p className="text-sm font-bold">① 人格の核を決める</p>
        <div className="mt-2 inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
          <button type="button" onClick={() => setMode("mbti")} className={`rounded-md px-3 py-1.5 transition ${mode === "mbti" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>MBTIを選ぶ</button>
          <button type="button" onClick={() => setMode("diagnostic")} className={`rounded-md px-3 py-1.5 transition ${mode === "diagnostic" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>価値観診断</button>
        </div>

        {mode === "mbti" ? (
          <div className="mt-3 space-y-2">
            <a href={MBTI_GUIDE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2 hover:opacity-80">
              MBTIタイプ診断・解説を見る ↗
            </a>
            <div className="grid grid-cols-4 gap-1.5">
              {PERSONA_MBTI_OPTIONS.map((m) => {
                const on = mbti === m.code;
                return (
                  <button key={m.code} type="button" onClick={() => setMbti(on ? "" : m.code)} className={`flex flex-col items-center rounded-lg border px-1 py-1.5 transition active:scale-95 ${on ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-input bg-background text-foreground/70 hover:border-primary/40 hover:bg-primary/5"}`}>
                    <span className="text-xs font-bold tracking-wide">{m.code}</span>
                    <span className={`text-[10px] ${on ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2.5">
            <p className="text-xs font-medium text-foreground/70">直感で選んでください（{answeredCount}/{PERSONA_DIAGNOSTIC.length}）</p>
            {PERSONA_DIAGNOSTIC.map((q, i) => {
              const cur = answers[q.id];
              return (
                <div key={q.id} className="rounded-lg border bg-background p-2.5">
                  <p className="text-[13px] font-medium">{i + 1}. {q.text}</p>
                  <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {(["A", "B"] as const).map((opt) => {
                      const on = cur === opt;
                      return (
                        <button key={opt} type="button" onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))} className={`rounded-md border px-2.5 py-2 text-left text-[13px] transition active:scale-[0.99] ${on ? "border-primary bg-primary/10 font-medium" : "border-input bg-background text-foreground/70 hover:border-primary/40 hover:bg-primary/5"}`}>
                          {opt === "A" ? q.a : q.b}
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

      {/* ② 好きなこと（タップで追加） */}
      <div className="rounded-lg border bg-background/60 p-3">
        <p className="text-sm font-bold">② 好きなこと <span className="font-normal text-muted-foreground">（タップで追加・任意）</span></p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {INTEREST_SUGGESTIONS.map((v) => {
            const on = interests.includes(v);
            return (
              <button key={v} type="button" onClick={() => toggleInterest(v)} className={`rounded-full border px-3 py-1.5 text-xs transition active:scale-95 ${on ? "border-primary bg-primary text-primary-foreground font-medium shadow-sm" : "border-input bg-background text-foreground/70 hover:border-primary/40 hover:bg-primary/5"}`}>{v}</button>
            );
          })}
        </div>
        {/* 自由追加 */}
        <div className="mt-2 flex gap-2">
          <input
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInterest(customInterest); setCustomInterest(""); } }}
            placeholder="その他を追加"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button type="button" onClick={() => { addInterest(customInterest); setCustomInterest(""); }} className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-muted">
            <Plus className="h-4 w-4" /> 追加
          </button>
        </div>
        {/* 追加済み（サジェスト外も含む） */}
        {interests.filter((v) => !INTEREST_SUGGESTIONS.includes(v)).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {interests.filter((v) => !INTEREST_SUGGESTIONS.includes(v)).map((v) => (
              <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                {v}
                <button type="button" onClick={() => toggleInterest(v)} aria-label="削除"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ③ 肩書き・活動 */}
      <div className="rounded-lg border bg-background/60 p-3">
        <p className="text-sm font-bold">③ 肩書き・活動 <span className="font-normal text-muted-foreground">（任意）</span></p>
        <input
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="肩書き・役割（例：高校教員 / 起業部 顧問）"
          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <p className="mt-2 text-sm font-medium text-foreground/70">いまの活動（短く・最大3つ）</p>
        <div className="mt-1 space-y-1.5">
          {activities.map((a, i) => (
            <input
              key={i}
              value={a}
              onChange={(e) => setActivities((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={i === 0 ? "例：探究学習の授業づくり" : i === 1 ? "例：子ども向けプログラミング教室の運営" : "例：部活動の改革"}
              maxLength={40}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          ))}
        </div>
      </div>

      {/* 本人写真 */}
      <div className="rounded-lg border bg-background/60 p-3">
        <p className="text-sm font-bold">本人写真 <span className="font-normal text-muted-foreground">（任意・雰囲気を活かしてイラスト化）</span></p>
        <div className="mt-2 flex items-center gap-2">
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
          {photo && <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { setPhoto(null); setPhotoName(""); }}>取り消す</button>}
        </div>
        {photoName && <p className="mt-1 truncate text-xs text-violet-600">添付: {photoName}</p>}
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
      {error && <p className="text-sm text-red-500">{error}</p>}

      {(avatarUrl || info) && (
        <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
          {avatarUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="生成されたアバター" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          )}
          <div className="min-w-0 text-sm">
            <p className="font-bold text-emerald-600">✅ ペルソナ＆アイコンを設定しました。</p>
            {info?.expertise && info.expertise.length > 0 && <p className="truncate text-muted-foreground">得意分野: {info.expertise.join("、")}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
