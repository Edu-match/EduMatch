-- 人材マッチング名鑑の掲載オプトイン（既定 false = 非掲載）。
-- プライバシー保護のため、本人が明示的に有効化した Profile のみ名鑑に掲載する。
ALTER TABLE "Profile" ADD COLUMN "directory_opt_in" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Profile_directory_opt_in_idx" ON "Profile"("directory_opt_in");
