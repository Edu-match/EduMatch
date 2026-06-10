/** CSV「議論トピック一覧」の◎（二重丸）優先トピック */

export type InteropPriorityTopic = {
  no: number;
  major: string;
  majorLabel: string;
  category: string;
  color: string;
};

const MAJOR_META: Record<string, { label: string; color: string }> = {
  A: { label: "AI・テクノロジー活用", color: "#BDE8FB" },
  B: { label: "評価・学力・カリキュラム", color: "#C7EFC0" },
  C: { label: "子どもの権利・生活・規律", color: "#FBC9D4" },
  D: { label: "多様性・包摂・公正", color: "#E7CCF4" },
  E: { label: "教師・学校経営・制度", color: "#F6EBB0" },
  F: { label: "教科の指導", color: "#C9D4F6" },
};

function topic(
  no: number,
  major: keyof typeof MAJOR_META,
  category: string
): InteropPriorityTopic {
  const meta = MAJOR_META[major];
  return { no, major, majorLabel: meta.label, category, color: meta.color };
}

/** 優先度◎の28トピック（CSV準拠） */
export const INTEROP_PRIORITY_TOPICS: InteropPriorityTopic[] = [
  topic(3, "A", "デジタル教科書"),
  topic(7, "A", "EdTech・教育サービス導入"),
  topic(9, "A", "AIリテラシー・情報モラル教育"),
  topic(10, "A", "個別最適化学習"),
  topic(14, "B", "探究学習・PBL"),
  topic(17, "B", "宿題・家庭学習"),
  topic(19, "B", "学習指導要領の改訂"),
  topic(20, "B", "非認知能力の育成"),
  topic(21, "C", "校則・生徒指導"),
  topic(22, "C", "いじめ対策"),
  topic(23, "C", "不登校支援"),
  topic(25, "C", "スマホ・SNSとの付き合い方"),
  topic(31, "D", "インクルーシブ教育・特別支援"),
  topic(32, "D", "外国にルーツのある子どもの教育"),
  topic(41, "E", "教員の働き方改革"),
  topic(46, "E", "学校統廃合・小規模校"),
  topic(51, "F", "国語"),
  topic(52, "F", "算数・数学"),
  topic(53, "F", "理科"),
  topic(54, "F", "社会"),
  topic(55, "F", "英語・外国語"),
  topic(56, "F", "道徳"),
  topic(57, "F", "体育・保健"),
  topic(58, "F", "音楽・美術"),
  topic(59, "F", "家庭科・技術"),
  topic(60, "F", "総合的な学習"),
  topic(61, "F", "情報"),
  topic(62, "F", "キャリア教育"),
];

export function priorityTopicId(no: number): string {
  return `interop-topic-${no}`;
}

/** 大カテゴリ順＋番号順で外周配置用に並べ替え */
export function sortTopicsForBurst(topics: InteropPriorityTopic[]): InteropPriorityTopic[] {
  const majorOrder = Object.keys(MAJOR_META);
  return [...topics].sort((a, b) => {
    const ma = majorOrder.indexOf(a.major);
    const mb = majorOrder.indexOf(b.major);
    if (ma !== mb) return ma - mb;
    return a.no - b.no;
  });
}
