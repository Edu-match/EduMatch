-- 井戸端会議の本番移行 + 人材マッチング登録項目（公開ページなし）
-- 実行場所: Supabase SQL Editor / supabase db push

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

CREATE UNIQUE INDEX IF NOT EXISTS forum_likes_user_unique_idx
  ON public.forum_likes (target_id, user_id)
  WHERE user_id IS NOT NULL;

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

CREATE OR REPLACE FUNCTION public.forum_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_rooms' AND policyname = 'forum_rooms_select') THEN
    CREATE POLICY forum_rooms_select ON public.forum_rooms FOR SELECT USING (
      is_hidden = FALSE
      OR EXISTS (SELECT 1 FROM public."Profile" WHERE id = auth.uid() AND role = 'ADMIN')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_rooms' AND policyname = 'forum_rooms_insert') THEN
    CREATE POLICY forum_rooms_insert ON public.forum_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_rooms' AND policyname = 'forum_rooms_update') THEN
    CREATE POLICY forum_rooms_update ON public.forum_rooms FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public."Profile" WHERE id = auth.uid() AND role = 'ADMIN')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_rooms' AND policyname = 'forum_rooms_delete') THEN
    CREATE POLICY forum_rooms_delete ON public.forum_rooms FOR DELETE USING (
      EXISTS (SELECT 1 FROM public."Profile" WHERE id = auth.uid() AND role = 'ADMIN')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_room_topics' AND policyname = 'forum_room_topics_select') THEN
    CREATE POLICY forum_room_topics_select ON public.forum_room_topics FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_room_topics' AND policyname = 'forum_room_topics_admin_all') THEN
    CREATE POLICY forum_room_topics_admin_all ON public.forum_room_topics FOR ALL USING (
      EXISTS (SELECT 1 FROM public."Profile" WHERE id = auth.uid() AND role = 'ADMIN')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_posts' AND policyname = 'forum_posts_select') THEN
    CREATE POLICY forum_posts_select ON public.forum_posts FOR SELECT USING (
      is_hidden = FALSE
      OR EXISTS (SELECT 1 FROM public."Profile" WHERE id = auth.uid() AND role = 'ADMIN')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_posts' AND policyname = 'forum_posts_insert') THEN
    CREATE POLICY forum_posts_insert ON public.forum_posts FOR INSERT WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_posts' AND policyname = 'forum_posts_update') THEN
    CREATE POLICY forum_posts_update ON public.forum_posts FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public."Profile" WHERE id = auth.uid() AND role = 'ADMIN')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_posts' AND policyname = 'forum_posts_delete') THEN
    CREATE POLICY forum_posts_delete ON public.forum_posts FOR DELETE USING (
      EXISTS (SELECT 1 FROM public."Profile" WHERE id = auth.uid() AND role = 'ADMIN')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_replies' AND policyname = 'forum_replies_select') THEN
    CREATE POLICY forum_replies_select ON public.forum_replies FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_replies' AND policyname = 'forum_replies_insert') THEN
    CREATE POLICY forum_replies_insert ON public.forum_replies FOR INSERT WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_replies' AND policyname = 'forum_replies_delete') THEN
    CREATE POLICY forum_replies_delete ON public.forum_replies FOR DELETE USING (
      EXISTS (SELECT 1 FROM public."Profile" WHERE id = auth.uid() AND role = 'ADMIN')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_likes' AND policyname = 'forum_likes_select') THEN
    CREATE POLICY forum_likes_select ON public.forum_likes FOR SELECT USING (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_likes' AND policyname = 'forum_likes_insert') THEN
    CREATE POLICY forum_likes_insert ON public.forum_likes FOR INSERT WITH CHECK (TRUE);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'forum_likes' AND policyname = 'forum_likes_delete') THEN
    CREATE POLICY forum_likes_delete ON public.forum_likes FOR DELETE USING (
      user_id = auth.uid()
      OR user_id IS NULL
      OR EXISTS (SELECT 1 FROM public."Profile" WHERE id = auth.uid() AND role = 'ADMIN')
    );
  END IF;
END $$;

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
