-- トリガー修正前に投稿者名で保存された AI 返信を補正する

UPDATE public.forum_replies AS r
SET
  author_id = NULL,
  author_name = 'AIファシリテーター',
  author_role = '専門家',
  ai_kentei_passed = FALSE
FROM public.forum_posts AS p
JOIN public.forum_rooms AS rm ON rm.id = p.room_id
WHERE r.post_id = p.id
  AND rm.ai_discussion = TRUE
  AND r.author_name <> 'AIファシリテーター'
  AND r.author_id IS NOT NULL
  AND r.author_id = p.author_id
  AND r.author_name = p.author_name
  AND r.created_at >= p.created_at
  AND r.created_at <= p.created_at + INTERVAL '10 minutes'
  AND r.id = (
    SELECT r2.id
    FROM public.forum_replies AS r2
    WHERE r2.post_id = p.id
    ORDER BY r2.created_at ASC
    LIMIT 1
  );
