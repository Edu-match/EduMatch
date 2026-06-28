// MBTIの代わりに使える「独自の価値観診断」。
// 12問・各2択。教育コミュニティでの価値観・スタンスを6軸で捉え、
// 回答からその人らしい価値観テキストを組み立ててペルソナ生成に渡す。

export type DiagnosticAxis =
  | "collab" | "practice" | "innovate" | "lead" | "outcome" | "intuition";

export type DiagnosticQuestion = {
  id: string;
  axis: DiagnosticAxis;
  text: string;
  /** A を選ぶと軸の「A極」へ。 */
  a: string;
  /** B を選ぶと軸の「B極」へ。 */
  b: string;
};

/** 各軸の両極を表すラベル（A極 / B極）。 */
export const DIAGNOSTIC_AXES: Record<DiagnosticAxis, { a: string; b: string }> = {
  collab: { a: "協働・チームで進める", b: "個人で深く掘り下げる" },
  practice: { a: "実践・現場から考える", b: "理論・原理から考える" },
  innovate: { a: "新しい挑戦・変化を好む", b: "安定・積み重ねを大切にする" },
  lead: { a: "自分が前に出て引っ張る", b: "人を支え伴走する" },
  outcome: { a: "成果・結果を重視する", b: "過程・関係性を重視する" },
  intuition: { a: "直感・ひらめきを活かす", b: "分析・データで判断する" },
};

export const PERSONA_DIAGNOSTIC: DiagnosticQuestion[] = [
  { id: "q1", axis: "collab", text: "学びや仕事を進めるとき、どちらが心地よい？", a: "みんなで話しながら一緒に進める", b: "まず一人でじっくり考える" },
  { id: "q2", axis: "practice", text: "新しいテーマに出会ったら？", a: "まずやってみて手を動かす", b: "仕組みや背景をまず理解する" },
  { id: "q3", axis: "innovate", text: "やり方を選ぶなら？", a: "前例のない新しい方法を試したい", b: "確かな実績のある方法を選びたい" },
  { id: "q4", axis: "lead", text: "グループでの自分の役回りは？", a: "方向を示して引っ張ることが多い", b: "一人ひとりを支え後押しすることが多い" },
  { id: "q5", axis: "outcome", text: "うまくいったか判断するとき重視するのは？", a: "目に見える成果・達成", b: "取り組みの過程や関わった人の変化" },
  { id: "q6", axis: "intuition", text: "判断に迷ったとき頼るのは？", a: "そのときの直感・ひらめき", b: "集めた情報やデータ" },
  { id: "q7", axis: "collab", text: "アイデアが深まるのは？", a: "人と対話している時", b: "一人で集中している時" },
  { id: "q8", axis: "practice", text: "説明するなら？", a: "具体的な事例やエピソードで", b: "原則や全体像の整理で" },
  { id: "q9", axis: "innovate", text: "うまく回っている取り組みに対して？", a: "もっと良くできないか変えたくなる", b: "良い形を維持し磨きたくなる" },
  { id: "q10", axis: "lead", text: "意見が割れたとき？", a: "自分の考えを示して場を動かす", b: "それぞれの意見を引き出しまとめる" },
  { id: "q11", axis: "outcome", text: "プロジェクトで気になるのは？", a: "ゴールと締め切りの達成", b: "メンバーの納得感やチームの空気" },
  { id: "q12", axis: "intuition", text: "企画を考えるとき?", a: "面白そう！という感覚から広げる", b: "課題やニーズの分析から固める" },
];

/** 回答（id -> "A"|"B"）から、各軸の傾きを判定して価値観テキストを組み立てる。 */
export function summarizeDiagnostic(answers: Record<string, "A" | "B">): string {
  const score: Record<DiagnosticAxis, number> = {
    collab: 0, practice: 0, innovate: 0, lead: 0, outcome: 0, intuition: 0,
  };
  const counted: Record<DiagnosticAxis, number> = {
    collab: 0, practice: 0, innovate: 0, lead: 0, outcome: 0, intuition: 0,
  };
  for (const q of PERSONA_DIAGNOSTIC) {
    const ans = answers[q.id];
    if (ans !== "A" && ans !== "B") continue;
    counted[q.axis] += 1;
    score[q.axis] += ans === "A" ? 1 : -1; // A極=+ / B極=-
  }

  const parts: string[] = [];
  (Object.keys(DIAGNOSTIC_AXES) as DiagnosticAxis[]).forEach((axis) => {
    if (counted[axis] === 0) return;
    const s = score[axis];
    if (s === 0) {
      parts.push(`「${DIAGNOSTIC_AXES[axis].a}」と「${DIAGNOSTIC_AXES[axis].b}」のバランス型`);
    } else if (s > 0) {
      parts.push(DIAGNOSTIC_AXES[axis].a);
    } else {
      parts.push(DIAGNOSTIC_AXES[axis].b);
    }
  });
  if (parts.length === 0) return "";
  return `価値観診断の結果：${parts.join("／")}。`;
}

/** 全問回答済みか。 */
export function isDiagnosticComplete(answers: Record<string, "A" | "B">): boolean {
  return PERSONA_DIAGNOSTIC.every((q) => answers[q.id] === "A" || answers[q.id] === "B");
}
