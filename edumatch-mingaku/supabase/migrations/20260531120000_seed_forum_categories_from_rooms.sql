-- 既存 forum_rooms（CSV）をもとに大カテゴリを投入
-- 前提: 20260531000000_forum_categories.sql を先に実行すること
-- 類似テーマの部屋を1つの大カテゴリに統合

INSERT INTO public.forum_categories (name, slug, description, color, sort_order)
VALUES
  (
    'AI×教育',
    'ai-education',
    '授業設計・AIリテラシー・部活・特別支援・探究・医療保育など、教育現場でのAI活用全般',
    '#C9D4F6',
    0
  ),
  (
    '教員の働き方',
    'teacher-work-life',
    '長時間労働・業務効率化ツール・テクノロジーと教員業務の変化',
    '#FBC9D4',
    1
  ),
  (
    'GIGA・デジタル化',
    'giga-digital',
    'GIGAスクール・デジタル教科書・教育格差とEdTech',
    '#C7EFC0',
    2
  ),
  (
    '多様な学び',
    'diverse-learning',
    '不登校・オルタナティブ教育・エンタメと学びの融合',
    '#F6EBB0',
    3
  ),
  (
    'プログラミング教育',
    'programming-education',
    '学校教育におけるプログラミング・バイブコーディング・AI活用',
    '#E7CCF4',
    4
  ),
  (
    '社会・政策・国際',
    'society-policy',
    '海外教育・政策動向・産業（半導体など）と教育の関係',
    '#FFD9B8',
    5
  ),
  (
    'SNS・メディアリテラシー',
    'sns-media-literacy',
    'SNSの活用法・情報リテラシー・安全な利用',
    '#B8E6FF',
    6
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();
