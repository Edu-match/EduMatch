// AIペルソナ／アバター生成のための選択肢（クライアント・サーバー共通で利用）。

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
