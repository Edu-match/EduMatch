-- Interop Tokyo 2026 教育AIサミット — サブカテゴリシードデータ
-- 前提：supabase/migrations/20260608120000_interop_hub.sql が適用済みであること
-- Supabase SQL Editor で実行してください（何度実行しても冪等）

INSERT INTO interop_sub_categories (category_id, name, slug, description, sort_order)
SELECT c.id, s.name, s.slug, s.description, s.sort_order
FROM interop_categories c
JOIN (VALUES
  -- ── インフォメーション ──────────────────────────────────────────
  ('information', 'タイムテーブル',      'information-timetable',    '3日間のセッション・展示スケジュール一覧',       0),
  ('information', 'アクセス・会場案内',  'information-access',       '幕張メッセへのアクセス方法・ホール配置図',     1),
  ('information', '出展者一覧',          'information-exhibitors',   '教育AIサミット参加企業・団体の紹介',           2),
  ('information', '来場者へのご案内',    'information-visitor',      '入場方法・注意事項・よくある質問',             3),

  -- ── 議員会館 ────────────────────────────────────────────────────
  ('giin-kaikan', 'AI×教育研究会について', 'giin-about',             '超党派の議員によるAI×教育の立法・政策研究会',  0),
  ('giin-kaikan', '政策提言',            'giin-policy',              '文部科学省・デジタル庁への提言内容',           1),
  ('giin-kaikan', '登壇セッション',      'giin-session',             'Interop会期中の議員・専門家パネル',            2),
  ('giin-kaikan', '連携・賛同団体',      'giin-partners',            '共同声明・協定を結ぶ教育・産業団体一覧',       3),

  -- ── AI検定 ──────────────────────────────────────────────────────
  ('ai-kentei',   '検定概要',            'ai-kentei-about',          'AI検定の目的・レベル区分・認定基準',           0),
  ('ai-kentei',   '試験スケジュール',    'ai-kentei-schedule',       '会期中の受験日時・ブース申込方法',             1),
  ('ai-kentei',   'サンプル問題体験',    'ai-kentei-demo',           'ブースで実際に体験できるデモ問題',             2),
  ('ai-kentei',   '合格特典・活用事例',  'ai-kentei-benefits',       '合格者の活用事例と特典プログラム',             3),

  -- ── インタロップ ────────────────────────────────────────────────
  ('interop',     'Interop Tokyo 2026とは', 'interop-overview',      '世界最大級のネットワーク&IT展示会の概要',      0),
  ('interop',     'Education×AIゾーン',  'interop-edu-ai-zone',      '教育AI専用の展示エリアとブース紹介',           1),
  ('interop',     '展示会場内セミナー',  'interop-seminars',         'AIと教育をテーマにした無料セミナー一覧',       2),
  ('interop',     'ShowNet展示',         'interop-shownet',          'Interop名物・ライブネットワーク構築デモ',      3),

  -- ── エデュマッチ ────────────────────────────────────────────────
  ('edumatch',    'エデュマッチとは',    'edumatch-about',           '教育サービスと学習者をつなぐプラットフォーム', 0),
  ('edumatch',    'ブースデモ体験',      'edumatch-demo',            '会場でその場から使えるライブデモのご案内',     1),
  ('edumatch',    'みんがくとの連携',    'edumatch-mingaku',         '通信制高校向けエドテック連携の詳細',           2),
  ('edumatch',    'お問い合わせ',        'edumatch-contact',         '掲載・提携・取材のお問い合わせ先',             3),

  -- ── AI部 ────────────────────────────────────────────────────────
  ('ai-bu',       'AI部の活動紹介',      'ai-bu-about',              '青楓館高等学院 AI部の設立経緯と活動内容',      0),
  ('ai-bu',       '展示・発表内容',      'ai-bu-presentation',       'Interop会場でのプロジェクト発表の詳細',        1),
  ('ai-bu',       '青楓館高等学院とは',  'ai-bu-school',             '通信制高校で学ぶPBL・探究活動の紹介',          2),
  ('ai-bu',       '体験・見学のご案内',  'ai-bu-visit',              '生徒によるデモ体験・学校説明の申込方法',       3)

) AS s(cat_slug, name, slug, description, sort_order)
  ON c.slug = s.cat_slug
ON CONFLICT (slug) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      sort_order  = EXCLUDED.sort_order,
      updated_at  = now();
