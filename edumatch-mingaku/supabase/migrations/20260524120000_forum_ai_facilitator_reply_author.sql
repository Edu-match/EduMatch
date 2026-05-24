-- AIファシリテーター返信は author_id を NULL にし、表示名をトリガーで上書きしない

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
  IF NEW.author_name = 'AIファシリテーター' THEN
    NEW.author_id := NULL;
    NEW.author_role := '専門家';
    NEW.ai_kentei_passed := FALSE;
    RETURN NEW;
  END IF;

  actor_id := COALESCE(auth.uid(), NEW.author_id);

  SELECT name, ai_kentei_passed
  INTO profile_name, profile_ai_kentei_passed
  FROM public."Profile"
  WHERE id = actor_id;

  IF profile_name IS NULL THEN
    RAISE EXCEPTION 'profile not found for forum reply author';
  END IF;

  NEW.author_id := actor_id;
  NEW.author_name := profile_name;
  NEW.author_role := app_private.forum_author_role_for_profile(actor_id);
  NEW.ai_kentei_passed := COALESCE(profile_ai_kentei_passed, FALSE);

  RETURN NEW;
END;
$$;
