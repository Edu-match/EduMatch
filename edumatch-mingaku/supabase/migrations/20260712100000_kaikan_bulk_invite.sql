-- 招待コードを一括（共通）コードに対応させる。
-- 1コードを複数ユーザーで使用可能にするためのjoinテーブル。

CREATE TABLE IF NOT EXISTS public.kaikan_invite_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.kaikan_invite_codes(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_id, profile_id)
);

CREATE INDEX IF NOT EXISTS kaikan_invite_redemptions_profile_idx
  ON public.kaikan_invite_redemptions(profile_id);
CREATE INDEX IF NOT EXISTS kaikan_invite_redemptions_code_idx
  ON public.kaikan_invite_redemptions(code_id);

-- 既存の個別使用データを移行
INSERT INTO public.kaikan_invite_redemptions (code_id, profile_id, redeemed_at)
SELECT id, redeemed_by, COALESCE(redeemed_at, now())
FROM public.kaikan_invite_codes
WHERE redeemed_by IS NOT NULL
ON CONFLICT DO NOTHING;
