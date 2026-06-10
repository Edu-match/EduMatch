-- ============================================================
-- Interop 教育AIサミット 特設ページ — フルセットアップ SQL
-- Supabase SQL Editor にそのまま貼り付けて実行してください。
-- 冪等（何度実行してもOK）。既存データは消しません。
-- ============================================================

-- 1) 大カテゴリ
create table if not exists interop_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text not null default '',
  color       text not null default '#C9D4F6',
  is_primary  boolean not null default false,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) サブカテゴリ
create table if not exists interop_sub_categories (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references interop_categories(id) on delete cascade,
  name         text not null,
  slug         text not null unique,
  description  text not null default '',
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- 関連コンテンツ（自動抽出）の設定列
alter table interop_sub_categories
  add column if not exists content_kinds text[] not null default '{}',
  add column if not exists content_query text not null default '';

-- 3) 掲示板の投稿
create table if not exists interop_posts (
  id              uuid primary key default gen_random_uuid(),
  sub_category_id uuid not null references interop_sub_categories(id) on delete cascade,
  author_name     text not null default '匿名',
  author_role     text not null default '',
  body            text not null,
  is_hidden       boolean not null default false,
  is_pinned       boolean not null default false,
  created_at      timestamptz not null default now()
);
alter table interop_posts
  add column if not exists is_pinned boolean not null default false;
create index if not exists interop_posts_sub_created_idx
  on interop_posts (sub_category_id, created_at desc);

-- 4) サイト設定（テキスト・テーマ・ジオフェンス等の key-value）
create table if not exists interop_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 5) 関連コンテンツの手動キュレーション（ピン留め／除外）
create table if not exists interop_content_pins (
  id              uuid primary key default gen_random_uuid(),
  sub_category_id uuid not null references interop_sub_categories(id) on delete cascade,
  source_type     text not null,
  source_id       text not null,
  title           text not null,
  description     text not null default '',
  thumbnail_url   text,
  href            text not null,
  meta            text,
  is_hidden       boolean not null default false,
  rank_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists interop_content_pins_sub_rank_idx
  on interop_content_pins (sub_category_id, rank_order);

-- ============================================================
-- 初期データ（カテゴリ6＋サブカテゴリ24）。管理画面から編集可能。
-- ============================================================
insert into interop_categories (name, slug, description, color, is_primary, sort_order) values
  ('インフォメーション', 'information', '総合案内・タイムテーブル',  '#BDE8FB', false, 0),
  ('議員会館',          'giin-kaikan', '議員会館での取り組み・連携', '#FBC9D4', false, 1),
  ('AI検定',            'ai-kentei',   'AI活用スキルの検定',         '#C7EFC0', false, 2),
  ('インタロップ',      'interop',     'Interop Tokyo 2026',         '#C9D4F6', true,  3),
  ('エデュマッチ',      'edumatch',    '教育×AIのプラットフォーム',  '#F6EBB0', false, 4),
  ('AI部',              'ai-bu',       'AI部の活動',                 '#E7CCF4', false, 5)
on conflict (slug) do nothing;

-- 既存DB：インタロップを中心ハブに
update interop_categories set is_primary = false where slug <> 'interop';
update interop_categories set is_primary = true where slug = 'interop';

insert into interop_sub_categories (category_id, name, slug, description, sort_order)
select c.id, s.name, s.slug, s.description, s.sort_order
from interop_categories c
join (values
  ('information', 'タイムテーブル',        'information-timetable',  '3日間のセッション・展示スケジュール一覧',      0),
  ('information', 'アクセス・会場案内',    'information-access',     '幕張メッセへのアクセス方法・ホール配置図',    1),
  ('information', '出展者一覧',            'information-exhibitors', '教育AIサミット参加企業・団体の紹介',          2),
  ('information', '来場者へのご案内',      'information-visitor',    '入場方法・注意事項・よくある質問',            3),
  ('giin-kaikan', 'AI×教育研究会について', 'giin-about',            '超党派の議員によるAI×教育の立法・政策研究会', 0),
  ('giin-kaikan', '政策提言',              'giin-policy',           '文部科学省・デジタル庁への提言内容',          1),
  ('giin-kaikan', '登壇セッション',        'giin-session',          'Interop会期中の議員・専門家パネル',           2),
  ('giin-kaikan', '連携・賛同団体',        'giin-partners',         '共同声明・協定を結ぶ教育・産業団体一覧',      3),
  ('ai-kentei',   '検定概要',              'ai-kentei-about',       'AI検定の目的・レベル区分・認定基準',          0),
  ('ai-kentei',   '試験スケジュール',      'ai-kentei-schedule',    '会期中の受験日時・ブース申込方法',            1),
  ('ai-kentei',   'サンプル問題体験',      'ai-kentei-demo',        'ブースで実際に体験できるデモ問題',            2),
  ('ai-kentei',   '合格特典・活用事例',    'ai-kentei-benefits',    '合格者の活用事例と特典プログラム',            3),
  ('interop',     'Interop Tokyo 2026とは','interop-overview',      '世界最大級のネットワーク&IT展示会の概要',     0),
  ('interop',     'Education×AIゾーン',    'interop-edu-ai-zone',   '教育AI専用の展示エリアとブース紹介',          1),
  ('interop',     '展示会場内セミナー',    'interop-seminars',      'AIと教育をテーマにした無料セミナー一覧',      2),
  ('interop',     'ShowNet展示',           'interop-shownet',       'Interop名物・ライブネットワーク構築デモ',     3),
  ('edumatch',    'エデュマッチとは',      'edumatch-about',        '教育サービスと学習者をつなぐプラットフォーム',0),
  ('edumatch',    'ブースデモ体験',        'edumatch-demo',         '会場でその場から使えるライブデモのご案内',    1),
  ('edumatch',    'みんがくとの連携',      'edumatch-mingaku',      '通信制高校向けエドテック連携の詳細',          2),
  ('edumatch',    'お問い合わせ',          'edumatch-contact',      '掲載・提携・取材のお問い合わせ先',            3),
  ('ai-bu',       'AI部の活動紹介',        'ai-bu-about',           '青楓館高等学院 AI部の設立経緯と活動内容',     0),
  ('ai-bu',       '展示・発表内容',        'ai-bu-presentation',    'Interop会場でのプロジェクト発表の詳細',       1),
  ('ai-bu',       '青楓館高等学院とは',    'ai-bu-school',          '通信制高校で学ぶPBL・探究活動の紹介',         2),
  ('ai-bu',       '体験・見学のご案内',    'ai-bu-visit',           '生徒によるデモ体験・学校説明の申込方法',      3)
) as s(cat_slug, name, slug, description, sort_order)
  on c.slug = s.cat_slug
on conflict (slug) do update
  set name = excluded.name, description = excluded.description,
      sort_order = excluded.sort_order, updated_at = now();

-- ============================================================
-- 各トピックの初期コンテンツ（運営からのお知らせ＝上部固定の本文）
-- サブカテゴリごとに1件の固定投稿を作成。冪等：既に固定投稿があれば追加しない。
-- 文言は管理画面（/admin/interop）からいつでも編集できます。
-- ============================================================
insert into interop_posts (sub_category_id, author_name, author_role, body, is_pinned)
select s.id, '教育AIサミット運営', '事務局', v.body, true
from interop_sub_categories s
join (values
  ('information-timetable',
   E'「教育AIサミット in Interop Tokyo 2026」は6/10（水）〜6/12（金）の3日間、幕張メッセで開催します。\n各日とも、議員会館連携セッション・AI検定の体験・エデュマッチのライブデモ・AI部の発表を予定しています。\n最新のセッション時刻は会場のデジタルサイネージと本ページ各トピックでご確認ください。気になるセッションは早めのご来場・着席がおすすめです。'),
  ('information-access',
   E'会場は幕張メッセ（千葉県千葉市美浜区中瀬2-1）です。JR京葉線「海浜幕張駅」から徒歩約5分、東京駅から快速で約30分です。\nお車の場合は周辺駐車場をご利用ください。教育AIサミットの展示は「Education×AIゾーン」に集約しています。\n会場入口で配布のフロアマップ、または本ページの「Education×AIゾーン」トピックをご覧ください。'),
  ('information-exhibitors',
   E'教育AIサミットには、青楓館高等学院・みんがく・AI検定協会・AI部をはじめ、教育×AIに取り組む企業・団体が参加します。\n各出展者の展示内容やデモは、本ページの該当カテゴリ（エデュマッチ／AI検定／AI部 など）でご紹介しています。\n気になる団体のトピックをタップして、詳細をご覧ください。'),
  ('information-visitor',
   E'入場にはInterop Tokyo 2026の来場登録（無料）が必要です。本ページ右上の「来場登録」からお手続きください。\n会場内には撮影が可能なエリアと不可のエリアがあります。各ブースの掲示に従ってください。\nご不明な点はインフォメーションカウンター、またはこの掲示板でお気軽にお尋ねください。'),
  ('giin-about',
   E'超党派の国会議員が参加する「AI×教育研究会」は、AIを活用した新しい学びのあり方と、それを支える制度・ルールづくりを議論する場です。\n現場の教員・生徒・事業者の声を政策へ反映することを目的に、定期的な勉強会とヒアリングを重ねています。\n本サミットでは、研究会のこれまでの成果と今後の方向性をご紹介します。'),
  ('giin-policy',
   E'AI×教育研究会では、文部科学省・デジタル庁などに向けた提言をまとめています。\n学校現場でのAI活用ガイドライン、教員の負担軽減、生徒のデータ保護とプライバシー、地域間の教育格差の是正などがテーマです。\n提言の詳細や最新版は、登壇セッションおよび会場配布資料をご覧ください。'),
  ('giin-session',
   E'会期中、国会議員と教育・AIの専門家によるパネルディスカッションを開催します。\n「AIは学びをどう変えるか」「公教育とAIの両立」などをテーマに、立場を超えた率直な議論をお届けします。質疑の時間も設けています。\nご意見・ご質問はこの掲示板にもお寄せください。登壇者が会場で取り上げることがあります。'),
  ('giin-partners',
   E'AI×教育研究会の趣旨に賛同し、共同声明や連携協定を結ぶ教育機関・産業団体が広がっています。\n学校法人、エドテック企業、自治体など、多様な立場のパートナーとともに、AI時代の学びを社会全体で支える枠組みづくりを進めています。\n連携にご関心のある団体は、エデュマッチのお問い合わせ窓口までご連絡ください。'),
  ('ai-kentei-about',
   E'AI検定は、AIを「正しく・安全に・創造的に」使いこなす力を測る検定です。\n基礎的なリテラシーから、実務での活用・プロンプト設計まで、レベル別に区分しています。学生から社会人まで、年齢や職種を問わず挑戦できます。\n本サミットでは、検定の目的と認定基準をわかりやすくご案内します。'),
  ('ai-kentei-schedule',
   E'会期中、AI検定協会ブースで検定のミニ体験・受験案内を実施しています。\n実際の受験申込方法、開催回、受験料についてはブーススタッフがご案内します。団体受験・学校単位での導入をご検討の方も、お気軽にお声がけください。\n最新の受験日程は、AI検定協会の公式案内をご確認ください。'),
  ('ai-kentei-demo',
   E'ブースでは、AI検定の出題形式を体験できるサンプル問題をご用意しています。\n実際の生成AIを使いながら解く実技形式の問題もあり、「使える力」がどう問われるのかを体感できます。所要時間は数分程度です。\n体験後はその場でフィードバックもお渡しします。ぜひお気軽にチャレンジしてください。'),
  ('ai-kentei-benefits',
   E'AI検定の合格者は、スキルの証明としてプロフィールや履歴書に活用できるほか、提携プログラムでの優遇を受けられます。\n学校の探究学習や、企業の人材育成に取り入れた事例も増えています。\n具体的な活用事例は会場の展示パネル、またはこの掲示板でのご質問にお答えする形でご紹介します。'),
  ('interop-overview',
   E'Interop Tokyoは、インターネットとITの最新技術が一堂に会する、国内最大級のイベントです。\nネットワーク、クラウド、セキュリティ、AIなど幅広い分野の展示・セミナーが行われます。\n教育AIサミットは、このInteropの中で「教育×AI」にフォーカスした特設の取り組みとして開催しています。'),
  ('interop-edu-ai-zone',
   E'「Education×AIゾーン」は、教育とAIの最前線が集まる特設エリアです。\n青楓館高等学院・みんがく・AI検定協会・AI部の展示やデモを、まとめて体験できます。\n実際に手を動かせるハンズオン展示が中心です。教育関係者はもちろん、保護者・学生の方も気軽にお立ち寄りください。'),
  ('interop-seminars',
   E'会期中、展示会場内のセミナーステージで、AIと教育をテーマにした無料セッションを開催します。\n現場での実践事例、AI活用の最新動向、これからの学校づくりなど、すぐに役立つ内容をお届けします。\n事前申込不要・先着順のセッションが中心です。気になるテーマは早めにお席の確保を。'),
  ('interop-shownet',
   E'ShowNetは、Interopの会場そのものに最新の巨大ネットワークをライブで構築する、Interop名物の展示です。\n世界中の機器とエンジニアが集まり、実際に動くネットワークを目の前で見学できます。\n「学びを支えるインフラ」がどう作られているのか、教育関係者にも刺激的な展示です。'),
  ('edumatch-about',
   E'エデュマッチは、教育サービスと学習者・保護者・学校をつなぐプラットフォームです。\n塾・通信制高校・教材・イベントなど、多様な学びの選択肢を、口コミやAIのサポートとともに探せます。「自分に合った学び」に出会える場所を目指しています。\n会場では、その場で実際に使えるデモをご用意しています。'),
  ('edumatch-demo',
   E'エデュマッチのブースでは、スマートフォンからその場で使えるライブデモを体験できます。\nAIに相談しながら、条件に合った教育サービスを探したり、気になるサービスをキープしたりできます。会場限定の使い方ガイドもお渡しします。\nスタッフが操作をサポートしますので、初めての方もご安心ください。'),
  ('edumatch-mingaku',
   E'エデュマッチは、通信制高校・オンライン学習を支える「みんがく」と連携しています。\n学校運営のDX、生徒一人ひとりに合わせた学習サポート、保護者との連携など、現場の課題に寄り添うエドテックの取り組みを進めています。\n連携の詳細や導入のご相談は、ブーススタッフまでお声がけください。'),
  ('edumatch-contact',
   E'エデュマッチへの掲載・提携・取材のご相談は、info@edu-match.com までお気軽にご連絡ください。\n会場では、ブーススタッフが直接ご相談を承ります。サービスを掲載したい教育事業者の方、連携をご検討の団体・自治体の方など、どなたでも歓迎です。\nこの掲示板へのご投稿でもお問い合わせいただけます。'),
  ('ai-bu-about',
   E'AI部は、青楓館高等学院の生徒が中心となって活動する、AIを「学び・作り・社会に届ける」部活動です。\n生成AIを使ったプロダクト開発、地域や企業との協働プロジェクト、発表・登壇など、教科の枠を超えた実践に挑戦しています。\n本サミットでは、生徒たちが自らの取り組みを発表します。'),
  ('ai-bu-presentation',
   E'Interop会場では、AI部の生徒が手がけたプロジェクトを展示・発表します。\n実際に動くアプリやAIを使った作品、企画の裏側まで、生徒自身の言葉でご紹介します。来場者のみなさんとの対話も大歓迎です。\n感想やフィードバックは、ぜひこの掲示板にお寄せください。発表者の励みになります。'),
  ('ai-bu-school',
   E'青楓館高等学院は、PBL（課題解決型学習）や探究活動を軸に、「自分の好き」を社会とつなげる学びを大切にする通信制高校です。\nAIやテクノロジーを当たり前に使いこなしながら、生徒が主体的にプロジェクトを進めます。\nAI部の活動は、その学びの象徴的な一例です。'),
  ('ai-bu-visit',
   E'ブースでは、AI部の生徒によるデモ体験や、青楓館高等学院の学校説明を受けられます。\n「どんな学校なのか」「どうやってAIを学ぶのか」を、生徒や先生から直接聞けるチャンスです。\n学校見学・個別相談のお申し込みも会場で受け付けています。進路を考える中学生・保護者の方は、ぜひお立ち寄りください。')
) as v(slug, body) on v.slug = s.slug
where not exists (
  select 1 from interop_posts p
  where p.sub_category_id = s.id and p.is_pinned = true
);
