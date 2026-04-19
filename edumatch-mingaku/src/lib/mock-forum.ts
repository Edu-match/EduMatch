// ─── 型定義 ────────────────────────────────────────────────

export type AuthorRole = "教員" | "学生" | "専門家" | "企業" | "一般" | "匿名";

export type ForumPost = {
  id: string;
  roomId: string;
  authorName: string;
  authorRole: AuthorRole;
  body: string;
  likeCount: number;
  replyCount: number;
  postedAt: string;
  isPinned?: boolean; // 注目投稿（運営ピックアップ）
  relatedArticleUrl?: string;
  replies?: ForumReply[];
};

export type ForumReply = {
  id: string;
  authorName: string;
  authorRole: AuthorRole;
  body: string;
  likeCount: number;
  postedAt: string;
};

export type ForumRoom = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  weeklyTopic: string;
  postCount: number;
  participantCount: number;
  lastPostedAt: string;
  /** AIディスカッション機能の有効フラグ */
  aiDiscussion?: boolean;
};

// ─── 部屋一覧（6部屋固定） ────────────────────────────────

export const FORUM_ROOMS: ForumRoom[] = [
  {
    id: "ai-dx",
    name: "教育AI・DX",
    description: "生成AI活用、EdTech、デジタル化の実践や課題を語り合う場",
    emoji: "🤖",
    weeklyTopic: "生成AIを授業で使ってみた——成功・失敗の体験談を聞かせてください",
    postCount: 47,
    participantCount: 31,
    lastPostedAt: "2026-04-07T18:32:00Z",
    aiDiscussion: true,
  },
  {
    id: "steam",
    name: "探究・STEAM",
    description: "探究学習・プロジェクト型・STEAM教育の実践を共有",
    emoji: "🔬",
    weeklyTopic: "「探究がうまくいかない」よくある失敗パターンと打開策は？",
    postCount: 34,
    participantCount: 24,
    lastPostedAt: "2026-04-07T14:11:00Z",
  },
  {
    id: "management",
    name: "学校経営・働き方",
    description: "管理職・ミドルリーダーの悩み、働き方改革、組織づくりを議論",
    emoji: "🏫",
    weeklyTopic: "残業削減に本当に効果があった施策——現場の声を集めます",
    postCount: 29,
    participantCount: 19,
    lastPostedAt: "2026-04-06T21:44:00Z",
  },
  {
    id: "policy",
    name: "教育政策・制度",
    description: "新学習指導要領・入試改革・教員免許更新など制度の読み解き",
    emoji: "📜",
    weeklyTopic: "「高校情報科」必修化——現場はどう変わった？変わっていない？",
    postCount: 22,
    participantCount: 16,
    lastPostedAt: "2026-04-06T10:05:00Z",
  },
  {
    id: "diversity",
    name: "多様な学び・支援",
    description: "不登校・特別支援・インクルーシブ教育・フリースクールなど",
    emoji: "🌈",
    weeklyTopic: "通常学級での発達特性のある子どもへのサポート——何が一番難しい？",
    postCount: 38,
    participantCount: 27,
    lastPostedAt: "2026-04-07T16:55:00Z",
  },
  {
    id: "global",
    name: "国際・海外教育",
    description: "海外教育事情・国際バカロレア・留学・グローバル人材育成",
    emoji: "🌏",
    weeklyTopic: "日本とフィンランド、教育の「違い」を実感した瞬間は？",
    postCount: 18,
    participantCount: 14,
    lastPostedAt: "2026-04-05T09:22:00Z",
  },
];

// ─── 投稿ダミーデータ ──────────────────────────────────────

export const FORUM_POSTS: ForumPost[] = [
  // ── ai-dx ──
  {
    id: "ai-dx-1",
    roomId: "ai-dx",
    authorName: "佐藤 雄介",
    authorRole: "教員",
    body: "中学3年生の国語で「意見文の構成を考える」授業に ChatGPT を使ってみました。生徒が自分の意見に対して「反論するとしたら？」とAIに聞いていく活動です。最初は遊んでいる子も多かったですが、30分後には深みのある意見文を書けていて驚きました。ただ、AIの回答をそのままコピーする子も出たので、「AIは道具」という指導が必要だと実感しました。",
    likeCount: 24,
    replyCount: 3,
    postedAt: "2026-04-07T18:32:00Z",
    isPinned: true,
    replies: [
      {
        id: "ai-dx-1-r1",
        authorName: "田中 恵美",
        authorRole: "教員",
        body: "国語でのAI活用、参考になります！私も同様の課題を感じています。「AIと対話しながら思考する」という活動設計、ぜひ詳しいワークシートを教えてください。",
        likeCount: 8,
        postedAt: "2026-04-07T19:10:00Z",
      },
      {
        id: "ai-dx-1-r2",
        authorName: "山田 リサーチラボ",
        authorRole: "専門家",
        body: "論文でも同様の報告があります。「批判的思考を引き出すプロンプト設計」が鍵で、単なる質問よりも「反論せよ」「別の視点で」という指示が深い思考を促すとされています。",
        likeCount: 15,
        postedAt: "2026-04-07T20:05:00Z",
      },
      {
        id: "ai-dx-1-r3",
        authorName: "石井 テック",
        authorRole: "企業",
        body: "弊社ではそういった活動をサポートするツールを開発中です。生徒の入力をリアルタイムで分析して「もう少し深掘りしてみよう」とナッジする機能を実装予定です。",
        likeCount: 5,
        postedAt: "2026-04-08T07:30:00Z",
      },
    ],
  },
  {
    id: "ai-dx-2",
    roomId: "ai-dx",
    authorName: "高橋 美咲",
    authorRole: "教員",
    body: "AIを使った成績処理の自動化に取り組んでいます。定期テストの採点後、Excelデータ→Python→GPT APIで「一言コメント」を自動生成するパイプラインを作りました。最初の設定に2時間かかりましたが、今は毎回10分で200人分のコメントが完成します。",
    likeCount: 31,
    replyCount: 2,
    postedAt: "2026-04-06T11:20:00Z",
    replies: [
      {
        id: "ai-dx-2-r1",
        authorName: "橋本 孝",
        authorRole: "教員",
        body: "Pythonが使えないとできない話ですか？もう少しノーコードな方法はありますか？",
        likeCount: 9,
        postedAt: "2026-04-06T13:40:00Z",
      },
      {
        id: "ai-dx-2-r2",
        authorName: "高橋 美咲",
        authorRole: "教員",
        body: "Google スプレッドシート + GAS（Google Apps Script）でも同様のことができます。GPT APIを直接GASから呼べるので、Pythonが不要です。詳しくはDMください！",
        likeCount: 14,
        postedAt: "2026-04-06T15:00:00Z",
      },
    ],
  },
  {
    id: "ai-dx-3",
    roomId: "ai-dx",
    authorName: "りんご先生",
    authorRole: "匿名",
    body: "AIに頼りすぎることへの不安、みなさんはどう考えていますか？「AIネイティブ」な子どもたちが自力で考える力を失うのでは、と校長先生が懸念しています。現場ではどう説明しますか？",
    likeCount: 19,
    replyCount: 0,
    postedAt: "2026-04-05T09:15:00Z",
    replies: [],
  },
  {
    id: "ai-dx-4",
    roomId: "ai-dx",
    authorName: "松下 教育DX推進部",
    authorRole: "企業",
    body: "自治体向けにAI活用研修を提供しています。最近特に多い相談が「どこから始めればいいか分からない」というもの。まずは「AIで校務を楽にする体験」から入ると、教員の意識変革につながると感じています。",
    likeCount: 12,
    replyCount: 0,
    postedAt: "2026-04-04T16:30:00Z",
    replies: [],
  },

  // ── steam ──
  {
    id: "steam-1",
    roomId: "steam",
    authorName: "伊藤 健太",
    authorRole: "教員",
    body: "高2の「総合的な探究の時間」で地域課題探究を3年目。最初の2年は「発表して終わり」になりがちでしたが、今年は行政との連携を入れ、生徒の提案が実際の政策検討に採用されました。変わったのは「本物の相手がいる」設定にしたこと。これだけで生徒の本気度が全然違います。",
    likeCount: 38,
    replyCount: 2,
    postedAt: "2026-04-07T14:11:00Z",
    isPinned: true,
    replies: [
      {
        id: "steam-1-r1",
        authorName: "水田 さとこ",
        authorRole: "教員",
        body: "行政との連携、素晴らしいです！どのようにパートナーを探しましたか？校長先生経由でしょうか、それとも自分で動いた？",
        likeCount: 11,
        postedAt: "2026-04-07T15:30:00Z",
      },
      {
        id: "steam-1-r2",
        authorName: "伊藤 健太",
        authorRole: "教員",
        body: "自分で市の企画課に電話しました。最初は警戒されましたが、「生徒の提案を批判的にフィードバックしてほしいだけで採用は求めない」と伝えたら快諾してもらえました。",
        likeCount: 20,
        postedAt: "2026-04-07T16:00:00Z",
      },
    ],
  },
  {
    id: "steam-2",
    roomId: "steam",
    authorName: "木村 サイエンス",
    authorRole: "教員",
    body: "中学校でSTEAM教育を始めようとしているのですが、教科横断の時間割調整が最大の壁です。数学・理科・技術・美術の先生が同じ方向を向けない。管理職の方でうまく動かした方、いらっしゃいますか？",
    likeCount: 22,
    replyCount: 0,
    postedAt: "2026-04-06T10:44:00Z",
    replies: [],
  },
  {
    id: "steam-3",
    roomId: "steam",
    authorName: "STEAM推進ラボ",
    authorRole: "専門家",
    body: "先週、小学校でマイクロビットを使ったプログラミング×図工の授業を見学しました。子どもたちが「光るアクセサリー」を作るために、電子回路・コーディング・デザインを自然に学んでいて感動。STEAM教育の本質は「教科を超えた問いを立てること」だと再確認しました。",
    likeCount: 27,
    replyCount: 0,
    postedAt: "2026-04-05T13:20:00Z",
    replies: [],
  },

  // ── management ──
  {
    id: "mgmt-1",
    roomId: "management",
    authorName: "渡辺 副校長",
    authorRole: "教員",
    body: "昨年度、部活動の地域移行を進めました。最も難しかったのは「やりたい先生」と「やりたくない先生」の温度差の調整。最終的に「希望者のみが外部コーチと連携」という形に落ち着きましたが、まだ課題はあります。同じ経験をされた方いますか？",
    likeCount: 29,
    replyCount: 2,
    postedAt: "2026-04-06T21:44:00Z",
    isPinned: true,
    replies: [
      {
        id: "mgmt-1-r1",
        authorName: "中村 教頭",
        authorRole: "教員",
        body: "うちも全く同じ状況でした。「移行することがゴールではなく、先生の負担を減らすことがゴール」という言葉を繰り返すことで、反対派の先生たちが少し柔軟になってくれました。",
        likeCount: 18,
        postedAt: "2026-04-07T08:15:00Z",
      },
      {
        id: "mgmt-1-r2",
        authorName: "小林 スポーツ政策研究",
        authorRole: "専門家",
        body: "地域移行のケーススタディを収集しています。よろしければ取材させてください。多くの学校で参考になる事例です。",
        likeCount: 7,
        postedAt: "2026-04-07T09:30:00Z",
      },
    ],
  },
  {
    id: "mgmt-2",
    roomId: "management",
    authorName: "加藤 主幹教諭",
    authorRole: "教員",
    body: "週次の職員会議をGoogle Meet + Docsのハイブリッドにしたら、会議時間が平均50分→25分になりました。事前に議題と資料をシェアして、当日は「決定事項の確認のみ」にしたのが効いた気がします。",
    likeCount: 34,
    replyCount: 0,
    postedAt: "2026-04-05T17:00:00Z",
    replies: [],
  },
  {
    id: "mgmt-3",
    roomId: "management",
    authorName: "新米管理職",
    authorRole: "匿名",
    body: "今年度から教頭になりました。初めて予算管理を任されて何から手をつけていいか分からない状態です。おすすめの本や研修はありますか？",
    likeCount: 16,
    replyCount: 0,
    postedAt: "2026-04-04T12:00:00Z",
    replies: [],
  },

  // ── policy ──
  {
    id: "policy-1",
    roomId: "policy",
    authorName: "斉藤 情報科担当",
    authorRole: "教員",
    body: "高校情報科必修化から1年。うちの学校では「情報Ⅰ」を週2コマで実施していますが、生徒の習熟度の差が激しすぎて困っています。プログラミング経験ゼロの子とAtCoder参加者が同じクラスにいる状況をどう乗り越えていますか？",
    likeCount: 19,
    replyCount: 2,
    postedAt: "2026-04-06T10:05:00Z",
    isPinned: true,
    replies: [
      {
        id: "policy-1-r1",
        authorName: "村田 プログラミング教育研究",
        authorRole: "専門家",
        body: "習熟度差が大きい場合は「協働学習」が有効です。上位の生徒に教える役割を与えると、彼らの理解も深まり、下位の生徒もハードルが下がります。ピアティーチングと呼ばれる手法です。",
        likeCount: 14,
        postedAt: "2026-04-06T11:30:00Z",
      },
      {
        id: "policy-1-r2",
        authorName: "鈴木 ICT支援員",
        authorRole: "一般",
        body: "Chrome Bookを活用したScratchベースの導入が、経験ゼロの生徒にも好評でした。ビジュアルから入ることで「プログラミングは難しくない」という入口を作れます。",
        likeCount: 10,
        postedAt: "2026-04-06T13:00:00Z",
      },
    ],
  },
  {
    id: "policy-2",
    roomId: "policy",
    authorName: "岡田 教育ジャーナリスト",
    authorRole: "専門家",
    body: "共通テストの記述式問題導入が再び議論されています。2020年の廃止を振り返ると、採点の公平性と実施コストが最大の壁でした。AIを使った自動採点の精度が上がった今、再挑戦する価値はあると思いますか？",
    likeCount: 23,
    replyCount: 0,
    postedAt: "2026-04-05T14:20:00Z",
    replies: [],
  },
  {
    id: "policy-3",
    roomId: "policy",
    authorName: "塾講師A",
    authorRole: "一般",
    body: "私学・公立・塾の三者それぞれの立場から入試改革を見ると、全然違う景色です。受験生の親御さんから「何を信じていいか分からない」という声が増えています。情報リテラシー教育と入試設計、両方変えないといけないのでは？",
    likeCount: 11,
    replyCount: 0,
    postedAt: "2026-04-04T09:00:00Z",
    replies: [],
  },

  // ── diversity ──
  {
    id: "div-1",
    roomId: "diversity",
    authorName: "内田 特支担当",
    authorRole: "教員",
    body: "通常学級でADHDの可能性がある子どもへの支援、一番効果があったのは「座席の工夫」でした。前から2番目・通路側・先生の目線に入る位置に変えただけで、授業離脱が週5回→週1回以下に。環境調整の効果を改めて実感しました。",
    likeCount: 42,
    replyCount: 2,
    postedAt: "2026-04-07T16:55:00Z",
    isPinned: true,
    replies: [
      {
        id: "div-1-r1",
        authorName: "藤田 臨床心理士",
        authorRole: "専門家",
        body: "座席の工夫は非常に重要です。加えて、「見通しを持てること」（次に何をするか分かること）も離脱防止に効果的です。ホワイトボードで今日の予定を可視化するだけでも変わります。",
        likeCount: 25,
        postedAt: "2026-04-07T17:30:00Z",
      },
      {
        id: "div-1-r2",
        authorName: "保護者M",
        authorRole: "一般",
        body: "親の立場から感謝します。担任の先生にこういった配慮をお願いするにはどう伝えれば良いか、いつも迷っています。「学校への上手な相談の仕方」も共有していただけると嬉しいです。",
        likeCount: 18,
        postedAt: "2026-04-08T07:00:00Z",
      },
    ],
  },
  {
    id: "div-2",
    roomId: "diversity",
    authorName: "NPO法人みらい学校",
    authorRole: "専門家",
    body: "不登校の子どもたちへのオンライン学習支援を3年間続けています。最も難しいのは「つながりを保つこと」。週1回15分のビデオ通話でも、継続することで自己効力感の回復につながるケースが多い。量より質・継続が大事だと感じます。",
    likeCount: 33,
    replyCount: 0,
    postedAt: "2026-04-06T13:40:00Z",
    replies: [],
  },
  {
    id: "div-3",
    roomId: "diversity",
    authorName: "新任教員Y",
    authorRole: "匿名",
    body: "特別支援学級と通常学級の交流及び共同学習の機会を増やしたいのですが、保護者の反応が心配です。「うちの子がいじめられるのでは」という不安の声もあります。うまく進めていらっしゃる学校の事例を教えてください。",
    likeCount: 20,
    replyCount: 0,
    postedAt: "2026-04-05T11:10:00Z",
    replies: [],
  },

  // ── global ──
  {
    id: "global-1",
    roomId: "global",
    authorName: "西村 在フィンランド日本人教師",
    authorRole: "教員",
    body: "フィンランドの小学校で3年間教えています。最大の違いは「間違えることへのリアクション」。日本では間違えると恥ずかしいという雰囲気がありますが、ここでは先生が「おっ、面白い考え方だね！なぜそう思った？」と全て受け止めます。この積み重ねが探究心の差になっていると実感。",
    likeCount: 45,
    replyCount: 2,
    postedAt: "2026-04-05T09:22:00Z",
    isPinned: true,
    replies: [
      {
        id: "global-1-r1",
        authorName: "前田 比較教育研究",
        authorRole: "専門家",
        body: "フィンランド教育研究では「心理的安全性」が学力向上の背景にあると指摘されています。先生の言語的フィードバックのパターン分析でも、同様の傾向が見られます。",
        likeCount: 19,
        postedAt: "2026-04-05T10:30:00Z",
      },
      {
        id: "global-1-r2",
        authorName: "保護者・元留学生",
        authorRole: "一般",
        body: "大学時代にフィンランドに留学した経験があります。授業中に先生が「私も正解を知りません、一緒に考えましょう」と言った時は本当に驚きました。あの体験が今の教育観の原点です。",
        likeCount: 22,
        postedAt: "2026-04-05T12:00:00Z",
      },
    ],
  },
  {
    id: "global-2",
    roomId: "global",
    authorName: "山本 国際バカロレア指導教員",
    authorRole: "教員",
    body: "IB（国際バカロレア）の教員研修を受けて一番印象に残っているのが「ATL（学習の方法）」の概念。教科の内容だけでなく、「考え方・コミュニケーション・社会性・自己管理・リサーチ」を横断的に教えるフレームワークです。日本のカリキュラムにも取り入れられるはず。",
    likeCount: 28,
    replyCount: 0,
    postedAt: "2026-04-03T15:00:00Z",
    replies: [],
  },
  {
    id: "global-3",
    roomId: "global",
    authorName: "留学エージェント坂田",
    authorRole: "企業",
    body: "今年の高校生海外留学の問い合わせ数が昨年比1.5倍です。コロナ後の留学意欲の回復に加え、「英語力だけでなく異文化体験を積ませたい」という保護者の意識変化を感じます。短期より長期留学のニーズが増えているのも新しいトレンドです。",
    likeCount: 14,
    replyCount: 0,
    postedAt: "2026-04-02T11:20:00Z",
    replies: [],
  },
];

// ─── ヘルパー関数 ─────────────────────────────────────────

export function getRoomById(id: string): ForumRoom | undefined {
  return FORUM_ROOMS.find((r) => r.id === id);
}

export function getPostsByRoom(roomId: string): ForumPost[] {
  return FORUM_POSTS.filter((p) => p.roomId === roomId);
}

export function getPinnedPosts(roomId: string): ForumPost[] {
  return FORUM_POSTS.filter((p) => p.roomId === roomId && p.isPinned);
}
