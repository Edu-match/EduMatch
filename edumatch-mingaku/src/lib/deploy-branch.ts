import { execSync } from "node:child_process";

/** CI / Vercel などのブランチ名。未設定時はローカルで git を参照する。 */
export function getDeployBranch(): string {
  const raw =
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.GITHUB_REF_NAME ||
    process.env.BRANCH_NAME ||
    "";
  const trimmed = raw.replace(/^refs\/heads\//, "").trim();
  if (trimmed) return trimmed;
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

/** レーダー・AIスコア・エクスポート等「フル」比較（forum-dev または ENABLE_SERVICE_COMPARE） */
export function isServiceCompareRadarEnabled(): boolean {
  if (process.env.ENABLE_SERVICE_COMPARE === "true") return true;
  return getDeployBranch() === "forum-dev";
}

/** main / 本番向け: 詳細比較表＋選択のみ（レーダー・AIスコアなし） */
export function isServiceCompareTableOnMain(): boolean {
  if (process.env.ENABLE_SERVICE_COMPARE_TABLE_ON_MAIN === "true") return true;
  if (process.env.ENABLE_SERVICE_COMPARE_TABLE_ON_MAIN === "false") return false;

  const branch = getDeployBranch().toLowerCase();
  if (branch === "main" || branch === "master") return true;

  // Vercel Production で VERCEL_GIT_COMMIT_REF が空・または想定外でも本番サイトは表付き比較を出す
  if (process.env.VERCEL_ENV === "production" && branch !== "forum-dev") {
    return true;
  }

  return false;
}

/** 比較ページを表示するか（フルまたは表のみ） */
export function isServiceComparePageEnabled(): boolean {
  return isServiceCompareRadarEnabled() || isServiceCompareTableOnMain();
}

/** @deprecated {@link isServiceCompareRadarEnabled} を使用 */
export function isServiceCompareEnabled(): boolean {
  return isServiceCompareRadarEnabled();
}
