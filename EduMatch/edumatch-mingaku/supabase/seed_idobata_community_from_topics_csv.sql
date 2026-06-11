-- =============================================================================
-- 井戸端会議コミュニティ シード（議論トピック一覧 CSV より）
-- 対象環境: EduMatchPJ-Prod2
-- 実行: Supabase SQL Editor で postgres として実行
--
-- 構成:
--   forum_categories      … カテゴリー 62件（CSV の各行 = 1 議論ルーム）
--   forum_rooms           … コミュニティルーム 62件（各カテゴリー × community）
--   forum_room_topics     … トピック 186件（各ルーム 3件）
--
-- 大分類（A〜F）は forum_categories.description / tags[1] で表現
-- forum_rooms の (category_id, sub_category_id) 部分ユニーク制約に合わせ、
-- 1 カテゴリー = 1 コミュニティルーム とする。
--
-- 前提:
--   - forum_sub_categories に slug = 'community' が存在すること
--   - forum_categories.tags は 3 要素固定（CHECK 制約）
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. 旧体系カテゴリの非アクティブ化（任意）
--     新しい井戸端体系のみ表示したい場合はコメントを外してください。
-- ---------------------------------------------------------------------------
-- UPDATE public.forum_categories
-- SET is_active = false, updated_at = now()
-- WHERE slug NOT LIKE 'ido-%';

-- ---------------------------------------------------------------------------
-- 1. カテゴリー（forum_categories）62件
-- ---------------------------------------------------------------------------
INSERT INTO public.forum_categories (slug, name, description, color, sort_order, is_active, tags)
VALUES
  ('ido-gen-ai-education', '生成AIの教育利用', 'A. AI・テクノロジー活用', '#4A90D9', 0, true, ARRAY['井戸端', 'AI', '生成AI']),
  ('ido-programming-education', 'プログラミング教育', 'A. AI・テクノロジー活用', '#4A90D9', 1, true, ARRAY['井戸端', 'AI', 'プログラミング']),
  ('ido-digital-textbook', 'デジタル教科書', 'A. AI・テクノロジー活用', '#4A90D9', 2, true, ARRAY['井戸端', 'AI', 'デジタル教科書']),
  ('ido-giga-one-device', 'GIGAスクール・1人1台端末', 'A. AI・テクノロジー活用', '#4A90D9', 3, true, ARRAY['井戸端', 'AI', 'GIGA']),
  ('ido-school-dx', '校務のDX・デジタル化', 'A. AI・テクノロジー活用', '#4A90D9', 4, true, ARRAY['井戸端', 'AI', '校務DX']),
  ('ido-data-driven-education', 'データに基づく教育', 'A. AI・テクノロジー活用', '#4A90D9', 5, true, ARRAY['井戸端', 'AI', '学習データ']),
  ('ido-edtech-adoption', 'EdTech・教育サービス導入', 'A. AI・テクノロジー活用', '#4A90D9', 6, true, ARRAY['井戸端', 'AI', 'EdTech']),
  ('ido-online-remote-learning', 'オンライン授業・遠隔教育', 'A. AI・テクノロジー活用', '#4A90D9', 7, true, ARRAY['井戸端', 'AI', 'オンライン授業']),
  ('ido-ai-literacy-moral', 'AIリテラシー・情報モラル教育', 'A. AI・テクノロジー活用', '#4A90D9', 8, true, ARRAY['井戸端', 'AI', 'AIリテラシー']),
  ('ido-personalized-learning', '個別最適化学習', 'A. AI・テクノロジー活用', '#4A90D9', 9, true, ARRAY['井戸端', 'AI', '個別最適化']),
  ('ido-national-achievement-test', '学力テスト・全国学力調査', 'B. 評価・学力・カリキュラム', '#E67E22', 10, true, ARRAY['井戸端', '評価', '学力テスト']),
  ('ido-grade-evaluation', '成績評価・通知表のあり方', 'B. 評価・学力・カリキュラム', '#E67E22', 11, true, ARRAY['井戸端', '評価', '成績評価']),
  ('ido-entrance-exam-reform', '入試制度改革', 'B. 評価・学力・カリキュラム', '#E67E22', 12, true, ARRAY['井戸端', '評価', '入試改革']),
  ('ido-inquiry-pbl', '探究学習・PBL', 'B. 評価・学力・カリキュラム', '#E67E22', 13, true, ARRAY['井戸端', '評価', '探究学習']),
  ('ido-steam-education', 'STEAM教育', 'B. 評価・学力・カリキュラム', '#E67E22', 14, true, ARRAY['井戸端', '評価', 'STEAM']),
  ('ido-reading-literacy', '読解力・言語能力の育成', 'B. 評価・学力・カリキュラム', '#E67E22', 15, true, ARRAY['井戸端', '評価', '読解力']),
  ('ido-homework', '宿題・家庭学習', 'B. 評価・学力・カリキュラム', '#E67E22', 16, true, ARRAY['井戸端', '評価', '宿題']),
  ('ido-mastery-based-instruction', '習熟度別指導', 'B. 評価・学力・カリキュラム', '#E67E22', 17, true, ARRAY['井戸端', '評価', '習熟度別']),
  ('ido-course-of-study-revision', '学習指導要領の改訂', 'B. 評価・学力・カリキュラム', '#E67E22', 18, true, ARRAY['井戸端', '評価', '学習指導要領']),
  ('ido-non-cognitive-skills', '非認知能力の育成', 'B. 評価・学力・カリキュラム', '#E67E22', 19, true, ARRAY['井戸端', '評価', '非認知能力']),
  ('ido-school-rules-guidance', '校則・生徒指導', 'C. 子どもの権利・生活・規律', '#9B59B6', 20, true, ARRAY['井戸端', '子ども', '校則']),
  ('ido-bullying-prevention', 'いじめ対策', 'C. 子どもの権利・生活・規律', '#9B59B6', 21, true, ARRAY['井戸端', '子ども', 'いじめ']),
  ('ido-school-refusal-support', '不登校支援', 'C. 子どもの権利・生活・規律', '#9B59B6', 22, true, ARRAY['井戸端', '子ども', '不登校']),
  ('ido-children-rights-voice', '子どもの権利・意見表明', 'C. 子どもの権利・生活・規律', '#9B59B6', 23, true, ARRAY['井戸端', '子ども', '意見表明']),
  ('ido-smartphone-sns', 'スマホ・SNSとの付き合い方', 'C. 子どもの権利・生活・規律', '#9B59B6', 24, true, ARRAY['井戸端', '子ども', 'スマホ']),
  ('ido-uniform-dress-code', '制服・服装の自由', 'C. 子どもの権利・生活・規律', '#9B59B6', 25, true, ARRAY['井戸端', '子ども', '制服']),
  ('ido-club-activities', '部活動のあり方', 'C. 子どもの権利・生活・規律', '#9B59B6', 26, true, ARRAY['井戸端', '子ども', '部活動']),
  ('ido-mental-health', '子どものメンタルヘルス', 'C. 子どもの権利・生活・規律', '#9B59B6', 27, true, ARRAY['井戸端', '子ども', 'メンタルヘルス']),
  ('ido-child-abuse-protection', '児童虐待・要保護児童への対応', 'C. 子どもの権利・生活・規律', '#9B59B6', 28, true, ARRAY['井戸端', '子ども', '児童虐待']),
  ('ido-corporal-punishment-guidance', '体罰・指導の線引き', 'C. 子どもの権利・生活・規律', '#9B59B6', 29, true, ARRAY['井戸端', '子ども', '体罰']),
  ('ido-inclusive-special-needs', 'インクルーシブ教育・特別支援', 'D. 多様性・包摂・公正', '#1ABC9C', 30, true, ARRAY['井戸端', '多様性', 'インクルーシブ']),
  ('ido-multicultural-foreign-roots', '外国にルーツのある子どもの教育', 'D. 多様性・包摂・公正', '#1ABC9C', 31, true, ARRAY['井戸端', '多様性', '外国ルーツ']),
  ('ido-gifted-talent-education', 'ギフテッド・才能教育', 'D. 多様性・包摂・公正', '#1ABC9C', 32, true, ARRAY['井戸端', '多様性', 'ギフテッド']),
  ('ido-educational-poverty-gap', '教育格差・貧困と学習支援', 'D. 多様性・包摂・公正', '#1ABC9C', 33, true, ARRAY['井戸端', '多様性', '教育格差']),
  ('ido-gender-education', 'ジェンダーと教育', 'D. 多様性・包摂・公正', '#1ABC9C', 34, true, ARRAY['井戸端', '多様性', 'ジェンダー']),
  ('ido-sex-education', '性教育', 'D. 多様性・包摂・公正', '#1ABC9C', 35, true, ARRAY['井戸端', '多様性', '性教育']),
  ('ido-multicultural-coexistence', '多文化共生教育', 'D. 多様性・包摂・公正', '#1ABC9C', 36, true, ARRAY['井戸端', '多様性', '多文化共生']),
  ('ido-night-junior-high', '夜間中学・学び直し', 'D. 多様性・包摂・公正', '#1ABC9C', 37, true, ARRAY['井戸端', '多様性', '学び直し']),
  ('ido-medical-care-children', '医療的ケア児への対応', 'D. 多様性・包摂・公正', '#1ABC9C', 38, true, ARRAY['井戸端', '多様性', '医療的ケア']),
  ('ido-diverse-learning-places', '多様な学びの場の保障', 'D. 多様性・包摂・公正', '#1ABC9C', 39, true, ARRAY['井戸端', '多様性', '学びの場']),
  ('ido-teacher-work-style-reform', '教員の働き方改革', 'E. 教師・学校経営・制度', '#E74C3C', 40, true, ARRAY['井戸端', '教師', '働き方改革']),
  ('ido-teacher-shortage-recruitment', '教員不足・採用・人材確保', 'E. 教師・学校経営・制度', '#E74C3C', 41, true, ARRAY['井戸端', '教師', '教員不足']),
  ('ido-teacher-licensure', '教員養成・免許制度', 'E. 教師・学校経営・制度', '#E74C3C', 42, true, ARRAY['井戸端', '教師', '免許制度']),
  ('ido-teacher-training', '教員研修・専門性開発', 'E. 教師・学校経営・制度', '#E74C3C', 43, true, ARRAY['井戸端', '教師', '教員研修']),
  ('ido-club-community-transition', '部活動の地域移行', 'E. 教師・学校経営・制度', '#E74C3C', 44, true, ARRAY['井戸端', '教師', '部活移行']),
  ('ido-school-consolidation', '学校統廃合・小規模校', 'E. 教師・学校経営・制度', '#E74C3C', 45, true, ARRAY['井戸端', '教師', '統廃合']),
  ('ido-school-family-community', '学校と家庭・地域の連携', 'E. 教師・学校経営・制度', '#E74C3C', 46, true, ARRAY['井戸端', '教師', '地域連携']),
  ('ido-parent-demands', '保護者対応・学校への要求', 'E. 教師・学校経営・制度', '#E74C3C', 47, true, ARRAY['井戸端', '教師', '保護者対応']),
  ('ido-principal-leadership', '校長・管理職のリーダーシップ', 'E. 教師・学校経営・制度', '#E74C3C', 48, true, ARRAY['井戸端', '教師', '管理職']),
  ('ido-education-governance', '教育行政・教育委員会のガバナンス', 'E. 教師・学校経営・制度', '#E74C3C', 49, true, ARRAY['井戸端', '教師', '教育行政']),
  ('ido-japanese-language', '国語', 'F. 教科の指導', '#F39C12', 50, true, ARRAY['井戸端', '教科', '国語']),
  ('ido-mathematics', '算数・数学', 'F. 教科の指導', '#F39C12', 51, true, ARRAY['井戸端', '教科', '算数数学']),
  ('ido-science', '理科', 'F. 教科の指導', '#F39C12', 52, true, ARRAY['井戸端', '教科', '理科']),
  ('ido-social-studies', '社会（地理・歴史・公民）', 'F. 教科の指導', '#F39C12', 53, true, ARRAY['井戸端', '教科', '社会']),
  ('ido-english-foreign-language', '英語・外国語', 'F. 教科の指導', '#F39C12', 54, true, ARRAY['井戸端', '教科', '英語']),
  ('ido-moral-education', '道徳', 'F. 教科の指導', '#F39C12', 55, true, ARRAY['井戸端', '教科', '道徳']),
  ('ido-pe-health', '体育・保健', 'F. 教科の指導', '#F39C12', 56, true, ARRAY['井戸端', '教科', '体育保健']),
  ('ido-music-art', '音楽・美術', 'F. 教科の指導', '#F39C12', 57, true, ARRAY['井戸端', '教科', '音楽美術']),
  ('ido-home-economics-technology', '家庭科・技術', 'F. 教科の指導', '#F39C12', 58, true, ARRAY['井戸端', '教科', '家庭科技術']),
  ('ido-integrated-inquiry-time', '総合的な学習／探究の時間', 'F. 教科の指導', '#F39C12', 59, true, ARRAY['井戸端', '教科', '総合的な学習']),
  ('ido-information-subject', '情報', 'F. 教科の指導', '#F39C12', 60, true, ARRAY['井戸端', '教科', '情報']),
  ('ido-career-guidance', 'キャリア教育・進路指導', 'F. 教科の指導', '#F39C12', 61, true, ARRAY['井戸端', '教科', '進路指導'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  tags = EXCLUDED.tags,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. コミュニティルーム（forum_rooms）62件
-- ---------------------------------------------------------------------------
INSERT INTO public.forum_rooms (
  id, name, description, emoji, weekly_topic,
  ai_discussion, ai_weekly_topic_enabled, is_hidden,
  category_id, sub_category_id
)
SELECT
  c.slug,
  c.name,
  c.description || ' › ' || c.name || ' の議論スペース',
  '💬',
  v.weekly_topic,
  true,
  false,
  false,
  c.id,
  sc.id
FROM public.forum_categories c
JOIN public.forum_sub_categories sc ON sc.slug = 'community' AND sc.is_active = true
JOIN (VALUES
  ('ido-gen-ai-education', '生成AIを児童生徒に何歳から使わせるべきか'),
  ('ido-programming-education', 'プログラミングは全児童生徒に必修とすべきか'),
  ('ido-digital-textbook', '紙の教科書を全面的にデジタルへ移行すべきか'),
  ('ido-giga-one-device', 'GIGA端末の家庭への持ち帰りを認めるべきか'),
  ('ido-school-dx', '校務支援システムは教員の負担を減らしたか'),
  ('ido-data-driven-education', '学習ログを指導にどこまで活用すべきか'),
  ('ido-edtech-adoption', '学校はEdTechサービスをどう選定すべきか'),
  ('ido-online-remote-learning', 'オンライン授業は対面授業の代わりになるか'),
  ('ido-ai-literacy-moral', 'AIリテラシー教育は何歳から始めるべきか'),
  ('ido-personalized-learning', '個別最適化学習は学びを豊かにするか、孤立させるか'),
  ('ido-national-achievement-test', '全国学力調査の結果を学校間で公開すべきか'),
  ('ido-grade-evaluation', '数値による成績評価は必要か'),
  ('ido-entrance-exam-reform', '一発勝負の入試は公平か'),
  ('ido-inquiry-pbl', '探究学習は本当に学力を伸ばすか'),
  ('ido-steam-education', 'STEAM教育は文系・理系の枠を越えられるか'),
  ('ido-reading-literacy', 'デジタル時代に読解力をどう育てるか'),
  ('ido-homework', '宿題は必要か、あるとすればどうあるべきか'),
  ('ido-mastery-based-instruction', '習熟度別クラス編成は是か非か'),
  ('ido-course-of-study-revision', '学習指導要領は現場の自由度を奪っているか'),
  ('ido-non-cognitive-skills', '非認知能力は学校で育てられるか'),
  ('ido-school-rules-guidance', '校則をどこまで子ども自身に決めさせるべきか'),
  ('ido-bullying-prevention', 'いじめの「重大事態」をどう線引きするか'),
  ('ido-school-refusal-support', '不登校の子に学校以外の学びをどこまで認めるか'),
  ('ido-children-rights-voice', '子どもの声を学校運営にどう反映させるか'),
  ('ido-smartphone-sns', 'スマホの校内持ち込みを認めるべきか'),
  ('ido-uniform-dress-code', '制服は必要か'),
  ('ido-club-activities', '部活動の強制加入は是か非か'),
  ('ido-mental-health', '学校はメンタルヘルスにどこまで踏み込むべきか'),
  ('ido-child-abuse-protection', '学校はどこまで家庭に介入すべきか'),
  ('ido-corporal-punishment-guidance', '厳しい指導と体罰の線引きをどこに置くか'),
  ('ido-inclusive-special-needs', '障害のある子への合理的配慮をどこまで提供すべきか'),
  ('ido-multicultural-foreign-roots', '日本語指導をどう充実させるか'),
  ('ido-gifted-talent-education', '特異な才能のある子への支援は必要か'),
  ('ido-educational-poverty-gap', '貧困家庭の子の学習支援を学校はどこまで担うべきか'),
  ('ido-gender-education', '名簿・呼称・制服のジェンダー配慮をどう進めるか'),
  ('ido-sex-education', '性教育をどこまで踏み込んで行うべきか'),
  ('ido-multicultural-coexistence', '多文化共生をどう学校文化に根づかせるか'),
  ('ido-night-junior-high', '学び直しの機会をどう保障するか'),
  ('ido-medical-care-children', '医療的ケア児の通常学級での学びをどう支えるか'),
  ('ido-diverse-learning-places', 'フリースクールを正式な学びの場と認めるべきか'),
  ('ido-teacher-work-style-reform', '教員の働き方改革のために何を削るべきか'),
  ('ido-teacher-shortage-recruitment', '教員不足をどう解消するか'),
  ('ido-teacher-licensure', '教員免許制度は今のままでよいか'),
  ('ido-teacher-training', '教員研修は教育の質向上に役立っているか'),
  ('ido-club-community-transition', '部活動の地域移行を進めるべきか'),
  ('ido-school-consolidation', '小規模校の統廃合をどう判断すべきか'),
  ('ido-school-family-community', '学校・家庭・地域の役割分担をどう設計するか'),
  ('ido-parent-demands', '過剰な保護者要求に学校はどこまで応じるべきか'),
  ('ido-principal-leadership', '管理職に求められるリーダーシップとは何か'),
  ('ido-education-governance', '教育委員会は形骸化していないか'),
  ('ido-japanese-language', '国語でAIをどう活用するか'),
  ('ido-mathematics', '算数・数学でAIをどう活用するか'),
  ('ido-science', '理科でAIをどう活用するか'),
  ('ido-social-studies', '社会でAIをどう活用するか'),
  ('ido-english-foreign-language', '英語でAIをどう活用するか'),
  ('ido-moral-education', '道徳でAIをどう活用するか'),
  ('ido-pe-health', '体育・保健でAIをどう活用するか'),
  ('ido-music-art', '音楽・美術でAIをどう活用するか'),
  ('ido-home-economics-technology', '技術家庭科でAIをどう活用するか'),
  ('ido-integrated-inquiry-time', '総合的な学習でAIをどう活用するか'),
  ('ido-information-subject', '情報でAIをどう活用するか'),
  ('ido-career-guidance', '進路指導でAIをどう活用するか')
) AS v(category_slug, weekly_topic) ON v.category_slug = c.slug
WHERE c.slug LIKE 'ido-%'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  emoji = EXCLUDED.emoji,
  weekly_topic = EXCLUDED.weekly_topic,
  ai_discussion = EXCLUDED.ai_discussion,
  ai_weekly_topic_enabled = EXCLUDED.ai_weekly_topic_enabled,
  is_hidden = EXCLUDED.is_hidden,
  category_id = EXCLUDED.category_id,
  sub_category_id = EXCLUDED.sub_category_id,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. 議論トピック（forum_room_topics）186件
-- ---------------------------------------------------------------------------
INSERT INTO public.forum_room_topics (id, room_id, title, period_start)
SELECT v.topic_id, v.room_id, v.title, now()
FROM (VALUES
  ('ido-gen-ai-education-t1', 'ido-gen-ai-education', '生成AIを児童生徒に何歳から使わせるべきか'),
  ('ido-gen-ai-education-t2', 'ido-gen-ai-education', '読書感想文や作文に生成AIを使うのは「ずる」か'),
  ('ido-gen-ai-education-t3', 'ido-gen-ai-education', '教師が校務に生成AIを使うことをどこまで認めるか'),
  ('ido-programming-education-t1', 'ido-programming-education', 'プログラミングは全児童生徒に必修とすべきか'),
  ('ido-programming-education-t2', 'ido-programming-education', 'プログラミング教育の目的は論理的思考か、技能習得か'),
  ('ido-programming-education-t3', 'ido-programming-education', 'AIがコードを書く時代にプログラミングを学ぶ意味はあるか'),
  ('ido-digital-textbook-t1', 'ido-digital-textbook', '紙の教科書を全面的にデジタルへ移行すべきか'),
  ('ido-digital-textbook-t2', 'ido-digital-textbook', 'デジタル教科書は子どもの読解力に影響するか'),
  ('ido-digital-textbook-t3', 'ido-digital-textbook', 'デジタルと紙はどう使い分けるべきか'),
  ('ido-giga-one-device-t1', 'ido-giga-one-device', 'GIGA端末の家庭への持ち帰りを認めるべきか'),
  ('ido-giga-one-device-t2', 'ido-giga-one-device', '端末更新の費用を誰がどう負担すべきか'),
  ('ido-giga-one-device-t3', 'ido-giga-one-device', '1人1台端末は本当に学力を高めたか'),
  ('ido-school-dx-t1', 'ido-school-dx', '校務支援システムは教員の負担を減らしたか'),
  ('ido-school-dx-t2', 'ido-school-dx', '保護者連絡をどこまでデジタル化すべきか'),
  ('ido-school-dx-t3', 'ido-school-dx', '出欠・成績データの一元管理はどこまで進めるべきか'),
  ('ido-data-driven-education-t1', 'ido-data-driven-education', '学習ログを指導にどこまで活用すべきか'),
  ('ido-data-driven-education-t2', 'ido-data-driven-education', '学習データの蓄積は子どもの監視につながらないか'),
  ('ido-data-driven-education-t3', 'ido-data-driven-education', 'データに基づく個別指導は教師の勘より優れているか'),
  ('ido-edtech-adoption-t1', 'ido-edtech-adoption', '学校はEdTechサービスをどう選定すべきか'),
  ('ido-edtech-adoption-t2', 'ido-edtech-adoption', '民間サービスへの依存はどこまで許容されるか'),
  ('ido-edtech-adoption-t3', 'ido-edtech-adoption', '無料サービスの利用に潜むリスクをどう考えるか'),
  ('ido-online-remote-learning-t1', 'ido-online-remote-learning', 'オンライン授業は対面授業の代わりになるか'),
  ('ido-online-remote-learning-t2', 'ido-online-remote-learning', 'ハイブリッド授業をどう設計すべきか'),
  ('ido-online-remote-learning-t3', 'ido-online-remote-learning', '不登校児へのオンライン学習を出席扱いにすべきか'),
  ('ido-ai-literacy-moral-t1', 'ido-ai-literacy-moral', 'AIリテラシー教育は何歳から始めるべきか'),
  ('ido-ai-literacy-moral-t2', 'ido-ai-literacy-moral', 'フェイク情報への対応をどう教えるか'),
  ('ido-ai-literacy-moral-t3', 'ido-ai-literacy-moral', '情報モラル教育は学校と家庭のどちらが担うべきか'),
  ('ido-personalized-learning-t1', 'ido-personalized-learning', '個別最適化学習は学びを豊かにするか、孤立させるか'),
  ('ido-personalized-learning-t2', 'ido-personalized-learning', 'アダプティブ教材と一斉授業をどう両立させるか'),
  ('ido-personalized-learning-t3', 'ido-personalized-learning', '「最適化」を誰の基準で決めるべきか'),
  ('ido-national-achievement-test-t1', 'ido-national-achievement-test', '全国学力調査の結果を学校間で公開すべきか'),
  ('ido-national-achievement-test-t2', 'ido-national-achievement-test', '学力テストは教育の質を正しく測れるか'),
  ('ido-national-achievement-test-t3', 'ido-national-achievement-test', 'テスト対策に偏った指導をどう防ぐか'),
  ('ido-grade-evaluation-t1', 'ido-grade-evaluation', '数値による成績評価は必要か'),
  ('ido-grade-evaluation-t2', 'ido-grade-evaluation', '観点別評価は現場で機能しているか'),
  ('ido-grade-evaluation-t3', 'ido-grade-evaluation', '評価の主目的は選別か、成長支援か'),
  ('ido-entrance-exam-reform-t1', 'ido-entrance-exam-reform', '一発勝負の入試は公平か'),
  ('ido-entrance-exam-reform-t2', 'ido-entrance-exam-reform', '総合型選抜（旧AO）をどこまで広げるべきか'),
  ('ido-entrance-exam-reform-t3', 'ido-entrance-exam-reform', '入試にAI・デジタルツールの使用を認めるべきか'),
  ('ido-inquiry-pbl-t1', 'ido-inquiry-pbl', '探究学習は本当に学力を伸ばすか'),
  ('ido-inquiry-pbl-t2', 'ido-inquiry-pbl', '探究の成果をどう評価すべきか'),
  ('ido-inquiry-pbl-t3', 'ido-inquiry-pbl', '教科学習と探究学習のバランスをどう取るか'),
  ('ido-steam-education-t1', 'ido-steam-education', 'STEAM教育は文系・理系の枠を越えられるか'),
  ('ido-steam-education-t2', 'ido-steam-education', '芸術（Art）をSTEMに加える意義は何か'),
  ('ido-steam-education-t3', 'ido-steam-education', 'STEAM教育に必要な教員をどう確保するか'),
  ('ido-reading-literacy-t1', 'ido-reading-literacy', 'デジタル時代に読解力をどう育てるか'),
  ('ido-reading-literacy-t2', 'ido-reading-literacy', '読書習慣を学校はどこまで促すべきか'),
  ('ido-reading-literacy-t3', 'ido-reading-literacy', '「正しく読む力」と「批判的に読む力」のどちらを重視すべきか'),
  ('ido-homework-t1', 'ido-homework', '宿題は必要か、あるとすればどうあるべきか'),
  ('ido-homework-t2', 'ido-homework', '宿題の丸つけ・管理は教師が担うべきか'),
  ('ido-homework-t3', 'ido-homework', '家庭環境による格差を宿題はどう助長するか'),
  ('ido-mastery-based-instruction-t1', 'ido-mastery-based-instruction', '習熟度別クラス編成は是か非か'),
  ('ido-mastery-based-instruction-t2', 'ido-mastery-based-instruction', '習熟度別指導は格差を固定しないか'),
  ('ido-mastery-based-instruction-t3', 'ido-mastery-based-instruction', 'できる子・つまずく子のどちらに重点を置くべきか'),
  ('ido-course-of-study-revision-t1', 'ido-course-of-study-revision', '学習指導要領は現場の自由度を奪っているか'),
  ('ido-course-of-study-revision-t2', 'ido-course-of-study-revision', '「詰め込み」と「ゆとり」のバランスをどう取るか'),
  ('ido-course-of-study-revision-t3', 'ido-course-of-study-revision', '次期改訂で何を増やし、何を減らすべきか'),
  ('ido-non-cognitive-skills-t1', 'ido-non-cognitive-skills', '非認知能力は学校で育てられるか'),
  ('ido-non-cognitive-skills-t2', 'ido-non-cognitive-skills', '非認知能力を評価することは可能か、すべきか'),
  ('ido-non-cognitive-skills-t3', 'ido-non-cognitive-skills', '認知能力と非認知能力のどちらを優先すべきか'),
  ('ido-school-rules-guidance-t1', 'ido-school-rules-guidance', '校則をどこまで子ども自身に決めさせるべきか'),
  ('ido-school-rules-guidance-t2', 'ido-school-rules-guidance', 'ブラック校則の見直しをどう進めるか'),
  ('ido-school-rules-guidance-t3', 'ido-school-rules-guidance', '校則は何のために存在するのか'),
  ('ido-bullying-prevention-t1', 'ido-bullying-prevention', 'いじめの「重大事態」をどう線引きするか'),
  ('ido-bullying-prevention-t2', 'ido-bullying-prevention', '加害児童への指導と被害児童の保護をどう両立するか'),
  ('ido-bullying-prevention-t3', 'ido-bullying-prevention', 'いじめ防止にAI・通報アプリは有効か'),
  ('ido-school-refusal-support-t1', 'ido-school-refusal-support', '不登校の子に学校以外の学びをどこまで認めるか'),
  ('ido-school-refusal-support-t2', 'ido-school-refusal-support', '「学校復帰」を支援の目標とすべきか'),
  ('ido-school-refusal-support-t3', 'ido-school-refusal-support', '不登校を「問題」と捉える見方は適切か'),
  ('ido-children-rights-voice-t1', 'ido-children-rights-voice', '子どもの声を学校運営にどう反映させるか'),
  ('ido-children-rights-voice-t2', 'ido-children-rights-voice', '校則や行事の決定に子どもをどこまで関与させるか'),
  ('ido-children-rights-voice-t3', 'ido-children-rights-voice', '「子どもの権利」と「指導」はどう両立するか'),
  ('ido-smartphone-sns-t1', 'ido-smartphone-sns', 'スマホの校内持ち込みを認めるべきか'),
  ('ido-smartphone-sns-t2', 'ido-smartphone-sns', 'SNSトラブルに学校はどこまで介入すべきか'),
  ('ido-smartphone-sns-t3', 'ido-smartphone-sns', 'デジタルとの付き合い方は誰が教えるべきか'),
  ('ido-uniform-dress-code-t1', 'ido-uniform-dress-code', '制服は必要か'),
  ('ido-uniform-dress-code-t2', 'ido-uniform-dress-code', 'ジェンダーレス制服をどう導入するか'),
  ('ido-uniform-dress-code-t3', 'ido-uniform-dress-code', '服装の自由は学習に影響するか'),
  ('ido-club-activities-t1', 'ido-club-activities', '部活動の強制加入は是か非か'),
  ('ido-club-activities-t2', 'ido-club-activities', '勝利至上主義をどう見直すか'),
  ('ido-club-activities-t3', 'ido-club-activities', '部活動は学校教育の一部であるべきか'),
  ('ido-mental-health-t1', 'ido-mental-health', '学校はメンタルヘルスにどこまで踏み込むべきか'),
  ('ido-mental-health-t2', 'ido-mental-health', 'スクールカウンセラーの役割をどう位置づけるか'),
  ('ido-mental-health-t3', 'ido-mental-health', '「休む権利」を子どもに認めるべきか'),
  ('ido-child-abuse-protection-t1', 'ido-child-abuse-protection', '学校はどこまで家庭に介入すべきか'),
  ('ido-child-abuse-protection-t2', 'ido-child-abuse-protection', '虐待の早期発見に学校は何ができるか'),
  ('ido-child-abuse-protection-t3', 'ido-child-abuse-protection', '通告の判断を教師が担う負担をどう考えるか'),
  ('ido-corporal-punishment-guidance-t1', 'ido-corporal-punishment-guidance', '厳しい指導と体罰の線引きをどこに置くか'),
  ('ido-corporal-punishment-guidance-t2', 'ido-corporal-punishment-guidance', '「指導死」を防ぐために何が必要か'),
  ('ido-corporal-punishment-guidance-t3', 'ido-corporal-punishment-guidance', '毅然とした指導はどこまで許されるか'),
  ('ido-inclusive-special-needs-t1', 'ido-inclusive-special-needs', '障害のある子への合理的配慮をどこまで提供すべきか'),
  ('ido-inclusive-special-needs-t2', 'ido-inclusive-special-needs', '通常学級と特別支援学級の学びの場をどう考えるか'),
  ('ido-inclusive-special-needs-t3', 'ido-inclusive-special-needs', 'インクルーシブ教育を支える人員をどう確保するか'),
  ('ido-multicultural-foreign-roots-t1', 'ido-multicultural-foreign-roots', '日本語指導をどう充実させるか'),
  ('ido-multicultural-foreign-roots-t2', 'ido-multicultural-foreign-roots', '母語・母文化の保持を学校はどこまで支援すべきか'),
  ('ido-multicultural-foreign-roots-t3', 'ido-multicultural-foreign-roots', '多言語対応をどこまで進めるべきか'),
  ('ido-gifted-talent-education-t1', 'ido-gifted-talent-education', '特異な才能のある子への支援は必要か'),
  ('ido-gifted-talent-education-t2', 'ido-gifted-talent-education', '才能教育は「えこひいき」か「合理的配慮」か'),
  ('ido-gifted-talent-education-t3', 'ido-gifted-talent-education', '飛び級を柔軟に認めるべきか'),
  ('ido-educational-poverty-gap-t1', 'ido-educational-poverty-gap', '貧困家庭の子の学習支援を学校はどこまで担うべきか'),
  ('ido-educational-poverty-gap-t2', 'ido-educational-poverty-gap', '教育格差の是正に何が最も有効か'),
  ('ido-educational-poverty-gap-t3', 'ido-educational-poverty-gap', '無償化はどこまで進めるべきか'),
  ('ido-gender-education-t1', 'ido-gender-education', '名簿・呼称・制服のジェンダー配慮をどう進めるか'),
  ('ido-gender-education-t2', 'ido-gender-education', '「男女平等」と「区別」の線引きをどこに置くか'),
  ('ido-gender-education-t3', 'ido-gender-education', 'ジェンダー教育はどこまで踏み込むべきか'),
  ('ido-sex-education-t1', 'ido-sex-education', '性教育をどこまで踏み込んで行うべきか'),
  ('ido-sex-education-t2', 'ido-sex-education', '「はどめ規定」をどう考えるか'),
  ('ido-sex-education-t3', 'ido-sex-education', '性の多様性をどう教えるか'),
  ('ido-multicultural-coexistence-t1', 'ido-multicultural-coexistence', '多文化共生をどう学校文化に根づかせるか'),
  ('ido-multicultural-coexistence-t2', 'ido-multicultural-coexistence', '宗教・文化的配慮（給食・服装等）をどこまで行うか'),
  ('ido-multicultural-coexistence-t3', 'ido-multicultural-coexistence', '「同化」と「共生」の違いをどう考えるか'),
  ('ido-night-junior-high-t1', 'ido-night-junior-high', '学び直しの機会をどう保障するか'),
  ('ido-night-junior-high-t2', 'ido-night-junior-high', '夜間中学を全自治体に設置すべきか'),
  ('ido-night-junior-high-t3', 'ido-night-junior-high', '義務教育未修了者への支援をどう広げるか'),
  ('ido-medical-care-children-t1', 'ido-medical-care-children', '医療的ケア児の通常学級での学びをどう支えるか'),
  ('ido-medical-care-children-t2', 'ido-medical-care-children', '看護師・人員配置をどう確保するか'),
  ('ido-medical-care-children-t3', 'ido-medical-care-children', '保護者の付き添い負担をどう軽減するか'),
  ('ido-diverse-learning-places-t1', 'ido-diverse-learning-places', 'フリースクールを正式な学びの場と認めるべきか'),
  ('ido-diverse-learning-places-t2', 'ido-diverse-learning-places', 'ホームスクーリングをどこまで認めるか'),
  ('ido-diverse-learning-places-t3', 'ido-diverse-learning-places', '「学校に通う」以外の選択肢をどう保障するか'),
  ('ido-teacher-work-style-reform-t1', 'ido-teacher-work-style-reform', '教員の働き方改革のために何を削るべきか'),
  ('ido-teacher-work-style-reform-t2', 'ido-teacher-work-style-reform', '残業の上限規制を実効性あるものにするには'),
  ('ido-teacher-work-style-reform-t3', 'ido-teacher-work-style-reform', '「子どものため」という言葉が長時間労働を生んでいないか'),
  ('ido-teacher-shortage-recruitment-t1', 'ido-teacher-shortage-recruitment', '教員不足をどう解消するか'),
  ('ido-teacher-shortage-recruitment-t2', 'ido-teacher-shortage-recruitment', '社会人・民間人材の登用をどう進めるか'),
  ('ido-teacher-shortage-recruitment-t3', 'ido-teacher-shortage-recruitment', '教員の待遇改善に何が最も必要か'),
  ('ido-teacher-licensure-t1', 'ido-teacher-licensure', '教員免許制度は今のままでよいか'),
  ('ido-teacher-licensure-t2', 'ido-teacher-licensure', '教職課程に何を加え、何を減らすべきか'),
  ('ido-teacher-licensure-t3', 'ido-teacher-licensure', '免許更新制の廃止は妥当だったか'),
  ('ido-teacher-training-t1', 'ido-teacher-training', '教員研修は教育の質向上に役立っているか'),
  ('ido-teacher-training-t2', 'ido-teacher-training', '研修の時間をどう確保するか'),
  ('ido-teacher-training-t3', 'ido-teacher-training', '研修内容を誰が決めるべきか'),
  ('ido-club-community-transition-t1', 'ido-club-community-transition', '部活動の地域移行を進めるべきか'),
  ('ido-club-community-transition-t2', 'ido-club-community-transition', '地域移行の費用を誰が負担すべきか'),
  ('ido-club-community-transition-t3', 'ido-club-community-transition', '地域移行で部活動の教育的意義は保たれるか'),
  ('ido-school-consolidation-t1', 'ido-school-consolidation', '小規模校の統廃合をどう判断すべきか'),
  ('ido-school-consolidation-t2', 'ido-school-consolidation', '学校は地域コミュニティの核として残すべきか'),
  ('ido-school-consolidation-t3', 'ido-school-consolidation', '統廃合による通学負担をどう考えるか'),
  ('ido-school-family-community-t1', 'ido-school-family-community', '学校・家庭・地域の役割分担をどう設計するか'),
  ('ido-school-family-community-t2', 'ido-school-family-community', 'コミュニティ・スクールは機能しているか'),
  ('ido-school-family-community-t3', 'ido-school-family-community', '地域人材の活用をどこまで進めるべきか'),
  ('ido-parent-demands-t1', 'ido-parent-demands', '過剰な保護者要求に学校はどこまで応じるべきか'),
  ('ido-parent-demands-t2', 'ido-parent-demands', '保護者対応の負担を誰がどう支えるか'),
  ('ido-parent-demands-t3', 'ido-parent-demands', '学校と保護者の「信頼関係」をどう築くか'),
  ('ido-principal-leadership-t1', 'ido-principal-leadership', '管理職に求められるリーダーシップとは何か'),
  ('ido-principal-leadership-t2', 'ido-principal-leadership', '管理職のなり手不足をどう解消するか'),
  ('ido-principal-leadership-t3', 'ido-principal-leadership', '学校の意思決定をどこまで民主化すべきか'),
  ('ido-education-governance-t1', 'ido-education-governance', '教育委員会は形骸化していないか'),
  ('ido-education-governance-t2', 'ido-education-governance', '教育の政治的中立性をどう保つか'),
  ('ido-education-governance-t3', 'ido-education-governance', '現場の裁量と行政の統制のバランスをどう取るか'),
  ('ido-japanese-language-t1', 'ido-japanese-language', '国語でAIをどう活用するか'),
  ('ido-japanese-language-t2', 'ido-japanese-language', '漢字の手書き指導はどこまで必要か'),
  ('ido-japanese-language-t3', 'ido-japanese-language', '話す・書く力をどう評価するか'),
  ('ido-mathematics-t1', 'ido-mathematics', '算数・数学でAIをどう活用するか'),
  ('ido-mathematics-t2', 'ido-mathematics', '電卓・数式アプリを授業でどこまで使わせるか'),
  ('ido-mathematics-t3', 'ido-mathematics', '「なぜ数学を学ぶのか」にどう答えるか'),
  ('ido-science-t1', 'ido-science', '理科でAIをどう活用するか'),
  ('ido-science-t2', 'ido-science', '知識の習得と探究的な学びのバランスをどう取るか'),
  ('ido-science-t3', 'ido-science', '理科離れをどう食い止めるか'),
  ('ido-social-studies-t1', 'ido-social-studies', '社会でAIをどう活用するか'),
  ('ido-social-studies-t2', 'ido-social-studies', '現代の論争的なテーマをどこまで扱うべきか'),
  ('ido-social-studies-t3', 'ido-social-studies', '主権者教育・シティズンシップをどう育てるか'),
  ('ido-english-foreign-language-t1', 'ido-english-foreign-language', '英語でAIをどう活用するか'),
  ('ido-english-foreign-language-t2', 'ido-english-foreign-language', '文法・読解と会話のどちらを優先すべきか'),
  ('ido-english-foreign-language-t3', 'ido-english-foreign-language', 'AI翻訳がある時代に英語を学ぶ意味は何か'),
  ('ido-moral-education-t1', 'ido-moral-education', '道徳でAIをどう活用するか'),
  ('ido-moral-education-t2', 'ido-moral-education', '「正解のある道徳」になっていないか'),
  ('ido-moral-education-t3', 'ido-moral-education', '価値観の多様性をどう扱うか'),
  ('ido-pe-health-t1', 'ido-pe-health', '体育・保健でAIをどう活用するか'),
  ('ido-pe-health-t2', 'ido-pe-health', '競争・順位づけは体育に必要か'),
  ('ido-pe-health-t3', 'ido-pe-health', '保健（性・健康・安全）をどこまで踏み込むか'),
  ('ido-music-art-t1', 'ido-music-art', '音楽・美術でAIをどう活用するか'),
  ('ido-music-art-t2', 'ido-music-art', '技能の習得と自由な表現のどちらを重視すべきか'),
  ('ido-music-art-t3', 'ido-music-art', '芸術教育の時間削減をどう考えるか'),
  ('ido-home-economics-technology-t1', 'ido-home-economics-technology', '技術家庭科でAIをどう活用するか'),
  ('ido-home-economics-technology-t2', 'ido-home-economics-technology', '生活スキルの教育を学校はどこまで担うべきか'),
  ('ido-home-economics-technology-t3', 'ido-home-economics-technology', '技術科とプログラミング・ものづくりをどう統合するか'),
  ('ido-integrated-inquiry-time-t1', 'ido-integrated-inquiry-time', '総合的な学習でAIをどう活用するか'),
  ('ido-integrated-inquiry-time-t2', 'ido-integrated-inquiry-time', '教科横断の学びをどう設計するか'),
  ('ido-integrated-inquiry-time-t3', 'ido-integrated-inquiry-time', '成果をどう評価し、何を学びとするか'),
  ('ido-information-subject-t1', 'ido-information-subject', '情報でAIをどう活用するか'),
  ('ido-information-subject-t2', 'ido-information-subject', '情報モラルと情報技術のどちらを重視すべきか'),
  ('ido-information-subject-t3', 'ido-information-subject', '大学入試科目「情報」をどう位置づけるか'),
  ('ido-career-guidance-t1', 'ido-career-guidance', '進路指導でAIをどう活用するか'),
  ('ido-career-guidance-t2', 'ido-career-guidance', '進路指導は「偏差値」から脱却できるか'),
  ('ido-career-guidance-t3', 'ido-career-guidance', '変化の激しい時代に何を基準に進路を示すか')
) AS v(topic_id, room_id, title)
ON CONFLICT (id) DO UPDATE SET
  room_id = EXCLUDED.room_id,
  title = EXCLUDED.title,
  period_start = EXCLUDED.period_start;

-- ---------------------------------------------------------------------------
-- 4. CSV「◎」優先カテゴリを人気表示に設定（hot_override）
-- ---------------------------------------------------------------------------
UPDATE public.forum_rooms
SET hot_override = true, updated_at = now()
WHERE id IN (
  'ido-digital-textbook',       -- No.3
  'ido-edtech-adoption',        -- No.7
  'ido-ai-literacy-moral',      -- No.9
  'ido-personalized-learning',  -- No.10
  'ido-inquiry-pbl',            -- No.14
  'ido-homework',               -- No.17
  'ido-course-of-study-revision', -- No.19
  'ido-non-cognitive-skills',   -- No.20
  'ido-school-rules-guidance',  -- No.21
  'ido-bullying-prevention',    -- No.22
  'ido-school-refusal-support', -- No.23
  'ido-smartphone-sns',         -- No.25
  'ido-inclusive-special-needs', -- No.31
  'ido-multicultural-foreign-roots', -- No.32
  'ido-teacher-work-style-reform', -- No.41
  'ido-school-consolidation',   -- No.46
  'ido-japanese-language',      -- No.51
  'ido-mathematics',            -- No.52
  'ido-science',                -- No.53
  'ido-social-studies',         -- No.54
  'ido-english-foreign-language', -- No.55
  'ido-moral-education',        -- No.56
  'ido-pe-health',              -- No.57
  'ido-music-art',              -- No.58
  'ido-home-economics-technology', -- No.59
  'ido-integrated-inquiry-time', -- No.60
  'ido-information-subject',    -- No.61
  'ido-career-guidance'         -- No.62
);

COMMIT;

-- ---------------------------------------------------------------------------
-- 投入後の確認クエリ
-- ---------------------------------------------------------------------------
-- SELECT description AS major, count(*) AS categories
-- FROM forum_categories
-- WHERE slug LIKE 'ido-%' AND is_active = true
-- GROUP BY description
-- ORDER BY min(sort_order);
--
-- SELECT count(*) FROM forum_rooms WHERE id LIKE 'ido-%';
-- SELECT count(*) FROM forum_room_topics WHERE room_id LIKE 'ido-%';
-- 期待値: categories=62, rooms=62, topics=186
