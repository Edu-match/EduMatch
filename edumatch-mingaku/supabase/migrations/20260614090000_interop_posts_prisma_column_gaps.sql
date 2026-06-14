-- Prod2 / preview 環境で Prisma スキーマ(InteropPost)より DB が古いときの穴埋め。
-- interop_posts に Prisma が要求する is_ai_reply / auto_flagged / flag_reason が無いと
-- AI返信生成・モデレーション・掲示板表示がランタイムエラーになるため追加する。

ALTER TABLE public.interop_posts
  ADD COLUMN IF NOT EXISTS is_ai_reply  BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.interop_posts
  ADD COLUMN IF NOT EXISTS auto_flagged BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.interop_posts
  ADD COLUMN IF NOT EXISTS flag_reason  TEXT NOT NULL DEFAULT '';

-- Prisma の @@index([parent_post_id]) / @@index([topic_id]) に対応
CREATE INDEX IF NOT EXISTS interop_posts_parent_post_id_idx ON public.interop_posts (parent_post_id);
CREATE INDEX IF NOT EXISTS interop_posts_topic_id_idx       ON public.interop_posts (topic_id);

-- 本番DBの is_ai_reply=true（AIファシリテーター返信）27件をバックフィル
UPDATE public.interop_posts SET is_ai_reply = TRUE
WHERE id IN (
  'ad2f0b6a-7362-4d5f-947d-f2f61bfdc268'::uuid,'c11c820d-1d4f-407e-941b-4a9f831a1496'::uuid,
  '15d64bec-e343-44ec-b706-ec286099e490'::uuid,'4e851e99-3a60-481c-b440-9ee242af40a4'::uuid,
  '0f2139e0-3b4d-46c5-bb0f-b5c6713392c6'::uuid,'299ae6c5-2312-46b6-b114-d7d0c5c2fa46'::uuid,
  '0305063f-d0d1-451d-891d-ce8fa42552d3'::uuid,'e6bc1016-c13c-4d88-8f23-c28bd4a6e554'::uuid,
  '5c177bf6-b254-4592-b755-072160c8a031'::uuid,'5d4d3740-8255-46e8-8b70-f4925c9802e9'::uuid,
  '586c020a-1042-4c9c-84dc-3d74cfbd5f42'::uuid,'a9ffc3c1-607b-42a2-9896-e673f8b01775'::uuid,
  '46552b57-f8ee-4996-a688-7137a00b86e1'::uuid,'397cb17b-24db-42df-8c25-94ac9239f544'::uuid,
  '5ded5a05-f7dd-4bbd-ac01-d94a97c54da0'::uuid,'245a9137-066e-4df9-9244-2f52d781b9ea'::uuid,
  'd10921df-15e6-456f-9461-967a98ecc319'::uuid,'54fb7db6-295b-452c-8775-7fb59391a7c0'::uuid,
  'b21c8019-46e1-4fbd-8a33-d96c100e36c7'::uuid,'c0ca0072-139a-4af9-92b3-6f4e2b539996'::uuid,
  'f6843f41-48bd-4c72-adf4-7e503cc25273'::uuid,'85f746c9-5d70-4e52-908f-4ed3eb0f6b05'::uuid,
  '6c840cd2-b322-46c3-b650-6ea2701e427d'::uuid,'bc6cb8e2-224d-4139-b7b5-d9845b3ff98b'::uuid,
  '35668b5b-7ad8-4c3e-bebe-2234a6ebcdab'::uuid,'2b8f935e-bb10-4397-9305-d2f090f77975'::uuid,
  '91454919-e77d-4160-9177-44aface1366a'::uuid
);
