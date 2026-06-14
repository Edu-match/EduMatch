/** CSV「議論トピック一覧」の◎（二重丸）優先トピック */

export type InteropPriorityTopic = {
  no: number;
  major: string;
  majorLabel: string;
  category: string;
  color: string;
  /** 対応する井戸端フォーラムルームID（/forum/{roomId} で実ルームへ接続） */
  roomId: string;
  /** CSV のトピック1〜3（この◎カテゴリ内の論点） */
  topics: [string, string, string];
};

export const MAJOR_META: Record<string, { label: string; color: string }> = {
  A: { label: "AI・テクノロジー活用", color: "#BDE8FB" },
  B: { label: "評価・学力・カリキュラム", color: "#C7EFC0" },
  C: { label: "子どもの権利・生活・規律", color: "#FBC9D4" },
  D: { label: "多様性・包摂・公正", color: "#E7CCF4" },
  E: { label: "教師・学校経営・制度", color: "#F6EBB0" },
  F: { label: "教科の指導", color: "#C9D4F6" },
};

/** DB の interop_topics 行 → InteropPriorityTopic（色・ラベルは major から導出） */
export type InteropTopicRow = {
  no: number;
  major: string;
  name: string;
  room_id: string;
  topic1: string;
  topic2: string;
  topic3: string;
};
export function dbRowToTopic(r: InteropTopicRow): InteropPriorityTopic {
  const meta = MAJOR_META[r.major] ?? MAJOR_META.F;
  return {
    no: r.no,
    major: r.major,
    majorLabel: meta.label,
    category: r.name,
    color: meta.color,
    roomId: r.room_id,
    topics: [r.topic1, r.topic2, r.topic3],
  };
}

function topic(
  no: number,
  major: keyof typeof MAJOR_META,
  category: string,
  roomId: string,
  topics: [string, string, string]
): InteropPriorityTopic {
  const meta = MAJOR_META[major];
  return { no, major, majorLabel: meta.label, category, color: meta.color, roomId, topics };
}

/** 優先度◎の28トピック（CSV準拠）。roomId は forum_rooms.id（井戸端ルーム）と一対一、topics は CSV トピック1〜3。 */
export const INTEROP_PRIORITY_TOPICS: InteropPriorityTopic[] = [
  topic(3, "A", "デジタル教科書", "room-ai-technology--community--digital-textbook", [
    "紙の教科書を全面的にデジタルへ移行すべきか",
    "デジタル教科書は子どもの読解力に影響するか",
    "デジタルと紙はどう使い分けるべきか",
  ]),
  topic(7, "A", "EdTech・教育サービス導入", "room-ai-technology--community--edtech-adoption", [
    "学校はEdTechサービスをどう選定すべきか",
    "民間サービスへの依存はどこまで許容されるか",
    "無料サービスの利用に潜むリスクをどう考えるか",
  ]),
  topic(9, "A", "AIリテラシー・情報モラル教育", "room-ai-technology--community--ai-literacy-moral", [
    "AIリテラシー教育は何歳から始めるべきか",
    "フェイク情報への対応をどう教えるか",
    "情報モラル教育は学校と家庭のどちらが担うべきか",
  ]),
  topic(10, "A", "個別最適化学習", "room-ai-technology--community--personalized-learning", [
    "個別最適化学習は学びを豊かにするか、孤立させるか",
    "アダプティブ教材と一斉授業をどう両立させるか",
    "「最適化」を誰の基準で決めるべきか",
  ]),
  topic(14, "B", "探究学習・PBL", "room-evaluation-curriculum--community--inquiry-pbl", [
    "探究学習は本当に学力を伸ばすか",
    "探究の成果をどう評価すべきか",
    "教科学習と探究学習のバランスをどう取るか",
  ]),
  topic(17, "B", "宿題・家庭学習", "room-evaluation-curriculum--community--homework", [
    "宿題は必要か、あるとすればどうあるべきか",
    "宿題の丸つけ・管理は教師が担うべきか",
    "家庭環境による格差を宿題はどう助長するか",
  ]),
  topic(19, "B", "学習指導要領の改訂", "room-evaluation-curriculum--community--course-of-study-revision", [
    "学習指導要領は現場の自由度を奪っているか",
    "「詰め込み」と「ゆとり」のバランスをどう取るか",
    "次期改訂で何を増やし、何を減らすべきか",
  ]),
  topic(20, "B", "非認知能力の育成", "room-evaluation-curriculum--community--non-cognitive-skills", [
    "非認知能力は学校で育てられるか",
    "非認知能力を評価することは可能か、すべきか",
    "認知能力と非認知能力のどちらを優先すべきか",
  ]),
  topic(21, "C", "校則・生徒指導", "room-children-rights-discipline--community--school-rules-guidance", [
    "校則をどこまで子ども自身に決めさせるべきか",
    "ブラック校則の見直しをどう進めるか",
    "校則は何のために存在するのか",
  ]),
  topic(22, "C", "いじめ対策", "room-children-rights-discipline--community--bullying-prevention", [
    "いじめの「重大事態」をどう線引きするか",
    "加害児童への指導と被害児童の保護をどう両立するか",
    "いじめ防止にAI・通報アプリは有効か",
  ]),
  topic(23, "C", "不登校支援", "room-children-rights-discipline--community--school-refusal-support", [
    "不登校の子に学校以外の学びをどこまで認めるか",
    "「学校復帰」を支援の目標とすべきか",
    "不登校を「問題」と捉える見方は適切か",
  ]),
  topic(25, "C", "スマホ・SNSとの付き合い方", "room-children-rights-discipline--community--smartphone-sns", [
    "スマホの校内持ち込みを認めるべきか",
    "SNSトラブルに学校はどこまで介入すべきか",
    "デジタルとの付き合い方は誰が教えるべきか",
  ]),
  topic(31, "D", "インクルーシブ教育・特別支援", "room-diversity-inclusion--community--inclusive-special-needs", [
    "障害のある子への合理的配慮をどこまで提供すべきか",
    "通常学級と特別支援学級の学びの場をどう考えるか",
    "インクルーシブ教育を支える人員をどう確保するか",
  ]),
  topic(32, "D", "外国にルーツのある子どもの教育", "room-diversity-inclusion--community--multicultural-foreign-roots", [
    "日本語指導をどう充実させるか",
    "母語・母文化の保持を学校はどこまで支援すべきか",
    "多言語対応をどこまで進めるべきか",
  ]),
  topic(41, "E", "教員の働き方改革", "room-teacher-school-system--community--teacher-work-style-reform", [
    "教員の働き方改革のために何を削るべきか",
    "残業の上限規制を実効性あるものにするには",
    "「子どものため」という言葉が長時間労働を生んでいないか",
  ]),
  topic(46, "E", "学校統廃合・小規模校", "room-teacher-school-system--community--school-consolidation", [
    "小規模校の統廃合をどう判断すべきか",
    "学校は地域コミュニティの核として残すべきか",
    "統廃合による通学負担をどう考えるか",
  ]),
  topic(51, "F", "国語", "room-subject-teaching--community--japanese-language", [
    "国語でAIをどう活用するか",
    "漢字の手書き指導はどこまで必要か",
    "話す・書く力をどう評価するか",
  ]),
  topic(52, "F", "算数・数学", "room-subject-teaching--community--mathematics", [
    "算数・数学でAIをどう活用するか",
    "電卓・数式アプリを授業でどこまで使わせるか",
    "「なぜ数学を学ぶのか」にどう答えるか",
  ]),
  topic(53, "F", "理科", "room-subject-teaching--community--science", [
    "理科でAIをどう活用するか",
    "知識の習得と探究的な学びのバランスをどう取るか",
    "理科離れをどう食い止めるか",
  ]),
  topic(54, "F", "社会（地理・歴史・公民）", "room-subject-teaching--community--social-studies", [
    "社会でAIをどう活用するか",
    "現代の論争的なテーマをどこまで扱うべきか",
    "主権者教育・シティズンシップをどう育てるか",
  ]),
  topic(55, "F", "英語・外国語", "room-subject-teaching--community--english-foreign-language", [
    "英語でAIをどう活用するか",
    "文法・読解と会話のどちらを優先すべきか",
    "AI翻訳がある時代に英語を学ぶ意味は何か",
  ]),
  topic(56, "F", "道徳", "room-subject-teaching--community--moral-education", [
    "道徳でAIをどう活用するか",
    "「正解のある道徳」になっていないか",
    "価値観の多様性をどう扱うか",
  ]),
  topic(57, "F", "体育・保健", "room-subject-teaching--community--pe-health", [
    "体育・保健でAIをどう活用するか",
    "競争・順位づけは体育に必要か",
    "保健（性・健康・安全）をどこまで踏み込むか",
  ]),
  topic(58, "F", "音楽・美術", "room-subject-teaching--community--music-art", [
    "音楽・美術でAIをどう活用するか",
    "技能の習得と自由な表現のどちらを重視すべきか",
    "芸術教育の時間削減をどう考えるか",
  ]),
  topic(59, "F", "家庭科・技術", "room-subject-teaching--community--home-economics-technology", [
    "技術家庭科でAIをどう活用するか",
    "生活スキルの教育を学校はどこまで担うべきか",
    "技術科とプログラミング・ものづくりをどう統合するか",
  ]),
  topic(60, "F", "総合的な学習／探究の時間", "room-subject-teaching--community--integrated-inquiry-time", [
    "総合的な学習でAIをどう活用するか",
    "教科横断の学びをどう設計するか",
    "成果をどう評価し、何を学びとするか",
  ]),
  topic(61, "F", "情報", "room-subject-teaching--community--information-subject", [
    "情報でAIをどう活用するか",
    "情報モラルと情報技術のどちらを重視すべきか",
    "大学入試科目「情報」をどう位置づけるか",
  ]),
  topic(62, "F", "キャリア教育・進路指導", "room-subject-teaching--community--career-guidance", [
    "進路指導でAIをどう活用するか",
    "進路指導は「偏差値」から脱却できるか",
    "変化の激しい時代に何を基準に進路を示すか",
  ]),
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
