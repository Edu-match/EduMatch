-- 井戸端 3Dビューの「第3軸」：週次ローカルLLM巡回が推測する軸の意味（ラベル）と、各トピックの第3軸値。
-- 2軸（X/Z 平面）は固定。動的に分布させるのは第3軸（高さ）のみ。

-- 第3軸の意味（ラベル）。週次でLLMが再評価して上書きする。id=1 の単一行。
create table if not exists public.interop_axis3_meta (
  id integer primary key default 1,
  label text not null default '停滞 ↔ 活発',
  updated_at timestamptz not null default now()
);
insert into public.interop_axis3_meta (id, label)
  values (1, '停滞 ↔ 活発')
  on conflict (id) do nothing;

-- 各トピックの第3軸値（0.0〜1.0。高いほど上へ）。週次で再計算。
create table if not exists public.interop_topic_axis3 (
  topic_no integer primary key,
  v double precision not null default 0,
  updated_at timestamptz not null default now()
);
