-- 既存の AI検定問題をすべて削除（Supabase SQL エディターで手動実行してよい）
-- exam_sessions は JSON で問題IDを保持しているだけなので参照整合性エラーにはなりませんが、
-- 古いセッションの問題表示は壊れる可能性があります。

TRUNCATE TABLE ai_kentei_questions RESTART IDENTITY;
