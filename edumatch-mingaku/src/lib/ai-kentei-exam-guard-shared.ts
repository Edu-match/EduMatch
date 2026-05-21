/** 受験画面（問題解答中）のみ。start / result / certificate は除外 */
export const AI_KENTEI_EXAM_IN_PROGRESS_PATH = /^\/ai-kentei\/exam\/[^/]+$/

export function isAiKenteiExamInProgressPath(pathname: string): boolean {
  return AI_KENTEI_EXAM_IN_PROGRESS_PATH.test(pathname)
}

export const AI_KENTEI_CHAT_BLOCKED_MESSAGE =
  'AI検定の受験中はAIチャットをご利用いただけません。検定終了後に再度お試しください。'
