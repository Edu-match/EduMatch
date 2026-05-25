-- 【任意】テキスト編集モードの変更を「即時」に全ユーザーへ反映したい場合に実行します。
-- これを実行しなくても、アプリ側のポーリングにより約15秒以内に同期されます。
--
-- 仕組み: Supabase Realtime で text_overrides テーブルの変更を購読できるようにします。
-- 読み書きはアプリのサーバー(Prisma)経由で行うため、RLSを有効にしても通常の保存/取得には影響しません。

-- 1) Realtime 配信のために RLS を有効化し、閲覧(SELECT)を許可するポリシーを作成
ALTER TABLE text_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "text_overrides_select_for_realtime" ON text_overrides;
CREATE POLICY "text_overrides_select_for_realtime"
  ON text_overrides
  FOR SELECT
  USING (true);

-- 2) Realtime のパブリケーションにテーブルを追加
ALTER PUBLICATION supabase_realtime ADD TABLE text_overrides;
