/** CSV「議論トピック一覧」の◎（二重丸）優先トピック */

export type InteropPriorityTopic = {
  no: number;
  major: string;
  majorLabel: string;
  category: string;
  color: string;
  /** 対応する井戸端フォーラムルームID（/forum/{roomId} で実ルームへ接続） */
  roomId: string;
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
  category: string,
  roomId: string
): InteropPriorityTopic {
  const meta = MAJOR_META[major];
  return { no, major, majorLabel: meta.label, category, color: meta.color, roomId };
}

/** 優先度◎の28トピック（CSV準拠）。roomId は forum_rooms.id（井戸端ルーム）と一対一。 */
export const INTEROP_PRIORITY_TOPICS: InteropPriorityTopic[] = [
  topic(3, "A", "デジタル教科書", "room-ai-technology--community--digital-textbook"),
  topic(7, "A", "EdTech・教育サービス導入", "room-ai-technology--community--edtech-adoption"),
  topic(9, "A", "AIリテラシー・情報モラル教育", "room-ai-technology--community--ai-literacy-moral"),
  topic(10, "A", "個別最適化学習", "room-ai-technology--community--personalized-learning"),
  topic(14, "B", "探究学習・PBL", "room-evaluation-curriculum--community--inquiry-pbl"),
  topic(17, "B", "宿題・家庭学習", "room-evaluation-curriculum--community--homework"),
  topic(19, "B", "学習指導要領の改訂", "room-evaluation-curriculum--community--course-of-study-revision"),
  topic(20, "B", "非認知能力の育成", "room-evaluation-curriculum--community--non-cognitive-skills"),
  topic(21, "C", "校則・生徒指導", "room-children-rights-discipline--community--school-rules-guidance"),
  topic(22, "C", "いじめ対策", "room-children-rights-discipline--community--bullying-prevention"),
  topic(23, "C", "不登校支援", "room-children-rights-discipline--community--school-refusal-support"),
  topic(25, "C", "スマホ・SNSとの付き合い方", "room-children-rights-discipline--community--smartphone-sns"),
  topic(31, "D", "インクルーシブ教育・特別支援", "room-diversity-inclusion--community--inclusive-special-needs"),
  topic(32, "D", "外国にルーツのある子どもの教育", "room-diversity-inclusion--community--multicultural-foreign-roots"),
  topic(41, "E", "教員の働き方改革", "room-teacher-school-system--community--teacher-work-style-reform"),
  topic(46, "E", "学校統廃合・小規模校", "room-teacher-school-system--community--school-consolidation"),
  topic(51, "F", "国語", "room-subject-teaching--community--japanese-language"),
  topic(52, "F", "算数・数学", "room-subject-teaching--community--mathematics"),
  topic(53, "F", "理科", "room-subject-teaching--community--science"),
  topic(54, "F", "社会", "room-subject-teaching--community--social-studies"),
  topic(55, "F", "英語・外国語", "room-subject-teaching--community--english-foreign-language"),
  topic(56, "F", "道徳", "room-subject-teaching--community--moral-education"),
  topic(57, "F", "体育・保健", "room-subject-teaching--community--pe-health"),
  topic(58, "F", "音楽・美術", "room-subject-teaching--community--music-art"),
  topic(59, "F", "家庭科・技術", "room-subject-teaching--community--home-economics-technology"),
  topic(60, "F", "総合的な学習", "room-subject-teaching--community--integrated-inquiry-time"),
  topic(61, "F", "情報", "room-subject-teaching--community--information-subject"),
  topic(62, "F", "キャリア教育", "room-subject-teaching--community--career-guidance"),
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
