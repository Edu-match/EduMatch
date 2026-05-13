-- 井戸端会議 + 人材マッチング登録項目（公開ページなし）
-- 実行場所: Supabase SQL Editor / supabase db push
--
-- スキーマの正: EduMatchPJ-Prod2（rlgaflpkkonsamsmxprt）。開発で実データが乗っている前提。
-- 他 Supabase プロジェクトはこのファイルで Prod2 相当の DDL / RLS / トリガーに冪等で揃える。
--
-- セキュリティ方針:
-- - 投稿・返信・部屋作成はログインユーザー本人に紐づける
-- - author_id / author_name / author_role / ai_kentei_passed / created_by は
--   DBトリガーでサーバー側の信頼できる値に上書きする
-- - ai_kentei_passed は方針B: 投稿・返信作成時点の Profile.ai_kentei_passed をコピーする
-- - 匿名Likeは JWT の forum_session_id または session_id クレームを前提に同一セッションだけ削除可能にする
--   ただし現在のアプリAPIはログインLikeのみを使うため、匿名LikeはカスタムJWTを発行した場合だけ有効

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;
GRANT USAGE ON SCHEMA app_private TO anon, authenticated;

ALTER TABLE public."Profile"
  ADD COLUMN IF NOT EXISTS ai_kentei_passed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public."GeneralProfile"
  ADD COLUMN IF NOT EXISTS talent_matching_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS talent_matching_description TEXT,
  ADD COLUMN IF NOT EXISTS talent_badges TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS talent_hourly_rate TEXT;

ALTER TABLE public."CorporateProfile"
  ADD COLUMN IF NOT EXISTS talent_matching_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS talent_matching_description TEXT,
  ADD COLUMN IF NOT EXISTS talent_badges TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS talent_hourly_rate TEXT;

ALTER TABLE public."Service"
  ADD COLUMN IF NOT EXISTS provider_display_avatar_url TEXT;

CREATE TABLE IF NOT EXISTS public.forum_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '',
  weekly_topic TEXT NOT NULL DEFAULT '',
  ai_discussion BOOLEAN NOT NULL DEFAULT FALSE,
  ai_weekly_topic_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public."Profile"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 既存の forum_rooms があると CREATE がスキップされ is_hidden 等が欠ける
ALTER TABLE public.forum_rooms
  ADD COLUMN IF NOT EXISTS ai_weekly_topic_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.forum_room_topics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  room_id TEXT NOT NULL REFERENCES public.forum_rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  room_id TEXT NOT NULL REFERENCES public.forum_rooms(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES public.forum_room_topics(id) ON DELETE SET NULL,
  author_id UUID REFERENCES public."Profile"(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT '一般',
  body TEXT NOT NULL,
  related_article_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ai_kentei_passed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 既存の forum_posts があると CREATE がスキップされ topic_id / is_hidden 等が欠ける
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS topic_id TEXT REFERENCES public.forum_room_topics(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS related_article_url TEXT,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_kentei_passed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS public.forum_replies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  post_id TEXT NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public."Profile"(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT '一般',
  body TEXT NOT NULL,
  ai_kentei_passed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.forum_likes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  target_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  user_id UUID REFERENCES public."Profile"(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT forum_likes_has_identity CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'forum_likes_target_type_check'
      AND conrelid = 'public.forum_likes'::regclass
  ) THEN
    ALTER TABLE public.forum_likes
      ADD CONSTRAINT forum_likes_target_type_check
      CHECK (target_type IN ('post', 'reply'));
  END IF;
END $$;

-- 既存データがある環境でユニークインデックス作成に失敗しないよう、重複Likeを1件に正規化する。
DELETE FROM public.forum_likes a
USING public.forum_likes b
WHERE a.user_id IS NOT NULL
  AND b.user_id IS NOT NULL
  AND a.target_id = b.target_id
  AND a.target_type = b.target_type
  AND a.user_id = b.user_id
  AND (
    a.created_at < b.created_at
    OR (a.created_at = b.created_at AND a.id < b.id)
  );

DELETE FROM public.forum_likes a
USING public.forum_likes b
WHERE a.user_id IS NULL
  AND b.user_id IS NULL
  AND a.session_id IS NOT NULL
  AND b.session_id IS NOT NULL
  AND a.target_id = b.target_id
  AND a.target_type = b.target_type
  AND a.session_id = b.session_id
  AND (
    a.created_at < b.created_at
    OR (a.created_at = b.created_at AND a.id < b.id)
  );

DROP INDEX IF EXISTS public.forum_likes_user_unique_idx;
CREATE UNIQUE INDEX IF NOT EXISTS forum_likes_user_unique_idx
  ON public.forum_likes (target_id, target_type, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS forum_likes_session_unique_idx
  ON public.forum_likes (target_id, target_type, session_id)
  WHERE user_id IS NULL AND session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS forum_rooms_created_at_idx
  ON public.forum_rooms (created_at ASC);
CREATE INDEX IF NOT EXISTS forum_room_topics_room_period_idx
  ON public.forum_room_topics (room_id, period_start DESC);
CREATE INDEX IF NOT EXISTS forum_posts_room_id_created_at_idx
  ON public.forum_posts (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS forum_posts_topic_id_idx
  ON public.forum_posts (topic_id);
CREATE INDEX IF NOT EXISTS forum_replies_post_id_idx
  ON public.forum_replies (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS forum_likes_target_idx
  ON public.forum_likes (target_id, target_type);

CREATE OR REPLACE FUNCTION app_private.current_forum_session_id()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB := '{}'::JSONB;
BEGIN
  BEGIN
    claims := NULLIF(current_setting('request.jwt.claims', TRUE), '')::JSONB;
  EXCEPTION WHEN OTHERS THEN
    claims := '{}'::JSONB;
  END;

  RETURN NULLIF(
    COALESCE(
      claims ->> 'forum_session_id',
      claims ->> 'session_id',
      claims #>> '{app_metadata,forum_session_id}'
    ),
    ''
  );
END;
$$;

CREATE OR REPLACE FUNCTION app_private.is_forum_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."Profile"
    WHERE id = auth.uid()
      AND role = 'ADMIN'
  );
$$;

CREATE OR REPLACE FUNCTION app_private.forum_author_role_for_profile(profile_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  org_type TEXT;
  org_other TEXT;
  role_text TEXT;
BEGIN
  SELECT
    CASE
      WHEN p.manual_profile_kind = 'corporate' THEN cp.organization_type
      WHEN p.manual_profile_kind = 'general' THEN gp.organization_type
      ELSE COALESCE(cp.organization_type, gp.organization_type)
    END,
    CASE
      WHEN p.manual_profile_kind = 'corporate' THEN cp.organization_type_other
      WHEN p.manual_profile_kind = 'general' THEN gp.organization_type_other
      ELSE COALESCE(cp.organization_type_other, gp.organization_type_other)
    END
  INTO org_type, org_other
  FROM public."Profile" p
  LEFT JOIN public."GeneralProfile" gp ON gp.id = p.id
  LEFT JOIN public."CorporateProfile" cp ON cp.id = p.id
  WHERE p.id = profile_id;

  IF org_type IS NULL OR btrim(org_type) = '' THEN
    RETURN '一般';
  END IF;

  IF org_type = 'other' AND org_other IS NOT NULL AND btrim(org_other) <> '' THEN
    role_text := 'その他（' || btrim(org_other) || '）';
    RETURN LEFT(role_text, 120);
  END IF;

  RETURN LEFT(org_type, 120);
END;
$$;

CREATE OR REPLACE FUNCTION app_private.apply_forum_room_insert_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- PostgREST/Supabase client 経由では JWT の本人IDに固定する。
  -- Prisma 等の信頼済みサーバー接続では auth.uid() が NULL になるため、
  -- サーバーが設定した created_by を保持する（RLS直アクセスではポリシーで拒否される）。
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.apply_forum_post_author_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id UUID;
  profile_name TEXT;
  profile_ai_kentei_passed BOOLEAN;
BEGIN
  actor_id := COALESCE(auth.uid(), NEW.author_id);

  SELECT name, ai_kentei_passed
  INTO profile_name, profile_ai_kentei_passed
  FROM public."Profile"
  WHERE id = actor_id;

  IF profile_name IS NULL THEN
    RAISE EXCEPTION 'profile not found for forum post author';
  END IF;

  -- なりすまし防止:
  -- - PostgREST/Supabase client 経由では auth.uid() 本人に固定
  -- - Prisma 等の信頼済みサーバー接続では API が検証済みの NEW.author_id を使い、
  --   表示名・ロール・AI検定フラグはDB側で必ず Profile からコピーする。
  NEW.author_id := actor_id;
  NEW.author_name := profile_name;
  NEW.author_role := app_private.forum_author_role_for_profile(actor_id);
  NEW.ai_kentei_passed := COALESCE(profile_ai_kentei_passed, FALSE);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.apply_forum_reply_author_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor_id UUID;
  profile_name TEXT;
  profile_ai_kentei_passed BOOLEAN;
BEGIN
  actor_id := COALESCE(auth.uid(), NEW.author_id);

  SELECT name, ai_kentei_passed
  INTO profile_name, profile_ai_kentei_passed
  FROM public."Profile"
  WHERE id = actor_id;

  IF profile_name IS NULL THEN
    RAISE EXCEPTION 'profile not found for forum reply author';
  END IF;

  -- なりすまし防止:
  -- - PostgREST/Supabase client 経由では auth.uid() 本人に固定
  -- - Prisma 等の信頼済みサーバー接続では API が検証済みの NEW.author_id を使い、
  --   表示名・ロール・AI検定フラグはDB側で必ず Profile からコピーする。
  NEW.author_id := actor_id;
  NEW.author_name := profile_name;
  NEW.author_role := app_private.forum_author_role_for_profile(actor_id);
  NEW.ai_kentei_passed := COALESCE(profile_ai_kentei_passed, FALSE);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.forum_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION app_private.current_forum_session_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.is_forum_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION app_private.forum_author_role_for_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.current_forum_session_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_forum_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.forum_author_role_for_profile(UUID) TO authenticated;

DROP TRIGGER IF EXISTS forum_rooms_apply_insert_defaults ON public.forum_rooms;
CREATE TRIGGER forum_rooms_apply_insert_defaults
  BEFORE INSERT ON public.forum_rooms
  FOR EACH ROW EXECUTE FUNCTION app_private.apply_forum_room_insert_defaults();

DROP TRIGGER IF EXISTS forum_posts_apply_author_defaults ON public.forum_posts;
CREATE TRIGGER forum_posts_apply_author_defaults
  BEFORE INSERT OR UPDATE OF author_id, author_name, author_role, ai_kentei_passed ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION app_private.apply_forum_post_author_defaults();

DROP TRIGGER IF EXISTS forum_replies_apply_author_defaults ON public.forum_replies;
CREATE TRIGGER forum_replies_apply_author_defaults
  BEFORE INSERT OR UPDATE OF author_id, author_name, author_role, ai_kentei_passed ON public.forum_replies
  FOR EACH ROW EXECUTE FUNCTION app_private.apply_forum_reply_author_defaults();

DROP TRIGGER IF EXISTS forum_rooms_set_updated_at ON public.forum_rooms;
CREATE TRIGGER forum_rooms_set_updated_at
  BEFORE UPDATE ON public.forum_rooms
  FOR EACH ROW EXECUTE FUNCTION public.forum_set_updated_at();

DROP TRIGGER IF EXISTS forum_posts_set_updated_at ON public.forum_posts;
CREATE TRIGGER forum_posts_set_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.forum_set_updated_at();

ALTER TABLE public.forum_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_room_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS forum_rooms_select ON public.forum_rooms;
DROP POLICY IF EXISTS forum_rooms_insert ON public.forum_rooms;
DROP POLICY IF EXISTS forum_rooms_update ON public.forum_rooms;
DROP POLICY IF EXISTS forum_rooms_delete ON public.forum_rooms;

CREATE POLICY forum_rooms_select ON public.forum_rooms
FOR SELECT
USING (
  is_hidden = FALSE
  OR app_private.is_forum_admin()
);

CREATE POLICY forum_rooms_insert ON public.forum_rooms
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);

CREATE POLICY forum_rooms_update ON public.forum_rooms
FOR UPDATE
USING (app_private.is_forum_admin())
WITH CHECK (app_private.is_forum_admin());

CREATE POLICY forum_rooms_delete ON public.forum_rooms
FOR DELETE
USING (app_private.is_forum_admin());

DROP POLICY IF EXISTS forum_room_topics_select ON public.forum_room_topics;
DROP POLICY IF EXISTS forum_room_topics_admin_all ON public.forum_room_topics;

CREATE POLICY forum_room_topics_select ON public.forum_room_topics
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.forum_rooms r
    WHERE r.id = room_id
      AND (r.is_hidden = FALSE OR app_private.is_forum_admin())
  )
);

CREATE POLICY forum_room_topics_admin_all ON public.forum_room_topics
FOR ALL
USING (app_private.is_forum_admin())
WITH CHECK (app_private.is_forum_admin());

DROP POLICY IF EXISTS forum_posts_select ON public.forum_posts;
DROP POLICY IF EXISTS forum_posts_insert ON public.forum_posts;
DROP POLICY IF EXISTS forum_posts_update ON public.forum_posts;
DROP POLICY IF EXISTS forum_posts_delete ON public.forum_posts;

CREATE POLICY forum_posts_select ON public.forum_posts
FOR SELECT
USING (
  is_hidden = FALSE
  OR app_private.is_forum_admin()
);

CREATE POLICY forum_posts_insert ON public.forum_posts
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND author_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public."Profile" p
    WHERE p.id = auth.uid()
      AND author_name = p.name
      AND ai_kentei_passed = p.ai_kentei_passed
  )
  AND EXISTS (
    SELECT 1
    FROM public.forum_rooms r
    WHERE r.id = room_id
      AND r.is_hidden = FALSE
  )
);

CREATE POLICY forum_posts_update ON public.forum_posts
FOR UPDATE
USING (app_private.is_forum_admin())
WITH CHECK (app_private.is_forum_admin());

CREATE POLICY forum_posts_delete ON public.forum_posts
FOR DELETE
USING (app_private.is_forum_admin());

DROP POLICY IF EXISTS forum_replies_select ON public.forum_replies;
DROP POLICY IF EXISTS forum_replies_insert ON public.forum_replies;
DROP POLICY IF EXISTS forum_replies_delete ON public.forum_replies;

CREATE POLICY forum_replies_select ON public.forum_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.forum_posts p
    WHERE p.id = post_id
      AND (p.is_hidden = FALSE OR app_private.is_forum_admin())
  )
);

CREATE POLICY forum_replies_insert ON public.forum_replies
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND author_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public."Profile" p
    WHERE p.id = auth.uid()
      AND author_name = p.name
      AND ai_kentei_passed = p.ai_kentei_passed
  )
  AND EXISTS (
    SELECT 1
    FROM public.forum_posts p
    WHERE p.id = post_id
      AND p.is_hidden = FALSE
  )
);

CREATE POLICY forum_replies_delete ON public.forum_replies
FOR DELETE
USING (app_private.is_forum_admin());

DROP POLICY IF EXISTS forum_likes_select ON public.forum_likes;
DROP POLICY IF EXISTS forum_likes_insert ON public.forum_likes;
DROP POLICY IF EXISTS forum_likes_delete ON public.forum_likes;

CREATE POLICY forum_likes_select ON public.forum_likes
FOR SELECT
USING (TRUE);

CREATE POLICY forum_likes_insert ON public.forum_likes
FOR INSERT
WITH CHECK (
  (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
    AND session_id IS NULL
  )
  OR (
    auth.uid() IS NULL
    AND user_id IS NULL
    AND session_id IS NOT NULL
    AND session_id = app_private.current_forum_session_id()
  )
);

CREATE POLICY forum_likes_delete ON public.forum_likes
FOR DELETE
USING (
  app_private.is_forum_admin()
  OR (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  )
  OR (
    auth.uid() IS NULL
    AND user_id IS NULL
    AND session_id IS NOT NULL
    AND session_id = app_private.current_forum_session_id()
  )
);

INSERT INTO public.forum_rooms (id, name, description, emoji, weekly_topic, ai_discussion)
VALUES
  ('ai-lesson', 'AI×授業設計', '授業にAIを取り入れるとしたら、どこから始めますか？', '🤖', '授業にAIを取り入れるとしたら、どこから始めますか？', TRUE),
  ('giga-school', 'GIGAスクールのリアル', '端末が配られた。それで、現場は変わりましたか？', '💻', '端末が配られた。それで、現場は変わりましたか？', FALSE),
  ('diverse-learning', '不登校と多様な学び', '学校以外の学びの場は、どこまで認められるべきか？', '🌈', '学校以外の学びの場は、どこまで認められるべきか？', FALSE),
  ('teacher-work', '教員の働き方とテクノロジー', 'AIは教員の仕事を楽にしますか？それとも増やしますか？', '🏫', 'AIは教員の仕事を楽にしますか？それとも増やしますか？', FALSE),
  ('education-gap', '教育格差とEdTech', 'テクノロジーは教育格差を縮めますか？広げますか？', '📊', 'テクノロジーは教育格差を縮めますか？広げますか？', FALSE),
  ('ai-literacy', '子どもとAIリテラシー', 'AIと付き合う力を、学校でどう育てればいいか？', '🧠', 'AIと付き合う力を、学校でどう育てればいいか？', TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  emoji = EXCLUDED.emoji,
  weekly_topic = EXCLUDED.weekly_topic,
  ai_discussion = EXCLUDED.ai_discussion;
