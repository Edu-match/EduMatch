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

/** サービス比較 UI を出すのは forum-dev デプロイ（または ENABLE_SERVICE_COMPARE）。 */
export function isServiceCompareEnabled(): boolean {
  if (process.env.ENABLE_SERVICE_COMPARE === "true") return true;
  return getDeployBranch() === "forum-dev";
}
