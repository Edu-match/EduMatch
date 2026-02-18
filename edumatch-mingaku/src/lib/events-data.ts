/**
 * セミナー・イベントの表示用データ（管理画面やAPIで差し替え可能）
 */
export const eventTypes = [
  { value: "all", label: "すべて" },
  { value: "seminar", label: "セミナー" },
  { value: "workshop", label: "ワークショップ" },
  { value: "exhibition", label: "展示会" },
  { value: "conference", label: "カンファレンス" },
] as const;

export const formats = [
  { value: "all", label: "すべての形式" },
  { value: "online", label: "オンライン" },
  { value: "offline", label: "オフライン" },
  { value: "hybrid", label: "ハイブリッド" },
] as const;

export type EventItem = {
  id: number;
  title: string;
  description: string;
  image: string;
  type: string;
  format: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  registered: number;
  price: string;
  speaker: string;
  tags: string[];
  externalUrl?: string;
  featured?: boolean;
};

export const events: EventItem[] = [
  {
    id: 1,
    title: "EdTech導入セミナー2024",
    description:
      "教育現場へのEdTech導入の成功事例と失敗事例から学ぶ、実践的なセミナーです。",
    image: "https://placehold.co/400x250/fef3c7/ca8a04?text=Seminar",
    type: "seminar",
    format: "online",
    date: "2024-02-15",
    time: "14:00〜16:00",
    location: "オンライン開催",
    capacity: 200,
    registered: 145,
    price: "無料",
    speaker: "山田太郎（教育ICTコンサルタント）",
    tags: ["EdTech", "導入支援", "初心者向け"],
  },
  {
    id: 2,
    title: "プログラミング教育ワークショップ",
    description:
      "小学校でのプログラミング教育の具体的な指導方法を、実際に体験しながら学びます。",
    image: "https://placehold.co/400x250/fed7aa/ea580c?text=Workshop",
    type: "workshop",
    format: "offline",
    date: "2024-02-20",
    time: "10:00〜17:00",
    location: "東京都渋谷区（会場詳細は申込後にご連絡）",
    capacity: 30,
    registered: 28,
    price: "¥5,000",
    speaker: "佐藤花子（プログラミング教育専門家）",
    tags: ["プログラミング", "小学校", "実践"],
  },
  {
    id: 3,
    title: "教育DX推進カンファレンス",
    description:
      "教育現場のDX推進について、先進事例の発表とパネルディスカッションを行います。",
    image: "https://placehold.co/400x250/fecaca/dc2626?text=Conference",
    type: "conference",
    format: "hybrid",
    date: "2024-03-01",
    time: "13:00〜18:00",
    location: "東京国際フォーラム / オンライン同時配信",
    capacity: 500,
    registered: 320,
    price: "¥3,000（オンライン無料）",
    speaker: "複数の登壇者",
    tags: ["DX", "カンファレンス", "事例発表"],
    featured: true,
  },
  {
    id: 4,
    title: "学習分析入門セミナー",
    description:
      "学習データの分析手法と、それを活用した指導改善の方法について解説します。",
    image: "https://placehold.co/400x250/d9f99d/65a30d?text=Seminar",
    type: "seminar",
    format: "online",
    date: "2024-03-10",
    time: "19:00〜20:30",
    location: "オンライン開催（Zoom）",
    capacity: 100,
    registered: 67,
    price: "無料",
    speaker: "田中一郎（学習分析研究者）",
    tags: ["学習分析", "データ活用", "初心者向け"],
  },
  {
    id: 5,
    title: "EdTech EXPO 2024",
    description:
      "最新のEdTechサービス・製品が一堂に会する大規模展示会。体験ブースも多数。",
    image: "https://placehold.co/400x250/bfdbfe/2563eb?text=EXPO",
    type: "exhibition",
    format: "offline",
    date: "2024-03-15",
    time: "10:00〜18:00",
    location: "東京ビッグサイト",
    capacity: 5000,
    registered: 2800,
    price: "入場無料（事前登録制）",
    speaker: "-",
    tags: ["展示会", "EdTech", "最新技術"],
  },
  {
    id: 6,
    title: "オンライン授業スキルアップ講座",
    description:
      "オンライン授業をより効果的に行うためのスキルとツールの使い方を学びます。",
    image: "https://placehold.co/400x250/e9d5ff/9333ea?text=Workshop",
    type: "workshop",
    format: "online",
    date: "2024-03-22",
    time: "15:00〜17:00",
    location: "オンライン開催",
    capacity: 50,
    registered: 35,
    price: "¥2,000",
    speaker: "鈴木美咲（オンライン教育専門家）",
    tags: ["オンライン授業", "スキルアップ"],
  },
];

export function getEventById(id: number): EventItem | undefined {
  return events.find((e) => e.id === id);
}
