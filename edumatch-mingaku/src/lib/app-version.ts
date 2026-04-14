import { execSync } from "node:child_process";

const DEFAULT_MAJOR = 1;
const DEFAULT_BASE_MAIN_COMMIT_COUNT = 264;

function getBranchName(): string {
  return (
    process.env.VERCEL_GIT_COMMIT_REF ||
    process.env.GITHUB_REF_NAME ||
    process.env.BRANCH_NAME ||
    ""
  );
}

function getCommitCountFromGit(): number | null {
  try {
    const raw = execSync("git rev-list --count HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const count = Number.parseInt(raw, 10);
    return Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
}

function getFallbackMinorFromSha(): number {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "";
  if (!sha) return 0;
  const parsed = Number.parseInt(sha.slice(0, 7), 16);
  return Number.isFinite(parsed) ? parsed % 10000 : 0;
}

export function getAppVersionLabel(): string {
  const major = Number.parseInt(process.env.APP_VERSION_MAJOR ?? "", 10) || DEFAULT_MAJOR;
  const baseMainCount =
    Number.parseInt(process.env.APP_VERSION_BASE_MAIN_COUNT ?? "", 10) ||
    DEFAULT_BASE_MAIN_COMMIT_COUNT;

  const count = getCommitCountFromGit();
  const minor =
    count != null && count >= baseMainCount
      ? count - baseMainCount
      : getFallbackMinorFromSha();

  const branch = getBranchName();
  const suffix = branch && branch !== "main" ? ` (${branch})` : "";

  return `Ver${major}.${minor}${suffix}`;
}
