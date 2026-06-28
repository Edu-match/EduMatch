// AIペルソナ／アバター生成のための選択肢（クライアント・サーバー共通で利用）。

export const PERSONA_TRAIT_OPTIONS = [
  "明るい・社交的", "落ち着いている", "好奇心旺盛", "論理的・冷静",
  "面倒見がいい", "創造的・アイデア型", "行動派・エネルギッシュ",
  "聞き上手・共感型", "まじめ・誠実", "マイペース", "ユーモアがある", "情熱的",
];

export const PERSONA_TONE_OPTIONS = [
  "やわらかい・親しみやすい", "知的・落ち着いた", "元気・ポップ",
  "クール・スタイリッシュ", "ナチュラル・温かい", "かわいい系",
];

export const PERSONA_COLOR_OPTIONS: { label: string; dot: string }[] = [
  { label: "ブルー系", dot: "#3b82f6" },
  { label: "グリーン系", dot: "#22c55e" },
  { label: "イエロー・オレンジ系", dot: "#f59e0b" },
  { label: "パープル系", dot: "#8b5cf6" },
  { label: "ピンク系", dot: "#ec4899" },
  { label: "モノトーン", dot: "#64748b" },
];

// MBTIの説明リンク（非認知層の離脱防止）。
export const MBTI_GUIDE_URL = "https://www.16personalities.com/ja";

export const PERSONA_MBTI_OPTIONS: { code: string; name: string }[] = [
  { code: "INTJ", name: "建築家" }, { code: "INTP", name: "論理学者" },
  { code: "ENTJ", name: "指揮官" }, { code: "ENTP", name: "討論者" },
  { code: "INFJ", name: "提唱者" }, { code: "INFP", name: "仲介者" },
  { code: "ENFJ", name: "主人公" }, { code: "ENFP", name: "運動家" },
  { code: "ISTJ", name: "管理者" }, { code: "ISFJ", name: "擁護者" },
  { code: "ESTJ", name: "幹部" }, { code: "ESFJ", name: "領事" },
  { code: "ISTP", name: "巨匠" }, { code: "ISFP", name: "冒険家" },
  { code: "ESTP", name: "起業家" }, { code: "ESFP", name: "エンターテイナー" },
];

export const AVATAR_TEMPLATES = [
  "/avatars/templates/1.svg",
  "/avatars/templates/2.svg",
  "/avatars/templates/3.svg",
  "/avatars/templates/4.svg",
] as const;
