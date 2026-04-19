import { createClient } from '@/utils/supabase/server'
import { getAiKenteiDb } from '@/lib/ai-kentei-db'
import { NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

const EXAM_QUESTION_COUNT = 25

/** Fisher-Yates shuffle (in-place) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * タグごとにバランスよく出題する。
 * 全タグから比例配分し、端数は多いタグから1問ずつ補填する。
 * タグなしの問題は独立したグループとして扱う。
 */
function selectBalanced(
  questions: Array<{ id: string; tag: string | null }>,
  total: number
): string[] {
  // グループ化
  const groups = new Map<string, string[]>()
  for (const q of questions) {
    const key = q.tag ?? '__untagged__'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(q.id)
  }

  // 各グループをシャッフル
  for (const ids of groups.values()) shuffle(ids)

  const groupKeys = [...groups.keys()]
  const n = groupKeys.length
  if (n === 0) return []

  // 比例配分（floor）
  const baseCount = Math.floor(total / n)
  const remainder = total - baseCount * n

  // グループサイズ降順でソートして余り分を割り当て
  const sorted = groupKeys
    .map((k) => ({ key: k, size: groups.get(k)!.length }))
    .sort((a, b) => b.size - a.size)

  const selected: string[] = []
  for (let i = 0; i < sorted.length; i++) {
    const extra = i < remainder ? 1 : 0
    const want = baseCount + extra
    const ids = groups.get(sorted[i].key)!
    selected.push(...ids.slice(0, want))
  }

  // 合計が total に満たない場合（グループが小さすぎる）、残りを他グループから補填
  if (selected.length < total) {
    const selectedSet = new Set(selected)
    for (const [, ids] of groups) {
      for (const id of ids) {
        if (!selectedSet.has(id)) {
          selected.push(id)
          selectedSet.add(id)
          if (selected.length >= total) break
        }
      }
      if (selected.length >= total) break
    }
  }

  return shuffle(selected.slice(0, total))
}

export async function POST() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()

    const supabase = await getAiKenteiDb()

    // 公開済み問題をタグ含めて全件取得（上限を広めに）
    const { data: questions, error: questionsError } = await supabase
      .from('ai_kentei_questions')
      .select('id, tag')
      .eq('status', 'published')
      .limit(500)

    if (questionsError || !questions || questions.length < EXAM_QUESTION_COUNT) {
      console.error('Error fetching questions:', questionsError)
      return NextResponse.json(
        { error: '問題の取得に失敗しました。問題が不足しています。' },
        { status: 500 }
      )
    }

    // タグごとにバランスよく25問選択
    const selectedQuestionIds = selectBalanced(questions, EXAM_QUESTION_COUNT)

    const sessionId = nanoid(12)

    const { error: sessionError } = await supabase
      .from('ai_kentei_exam_sessions')
      .insert({
        session_id: sessionId,
        user_id: user?.id ?? null,
        selected_question_ids: selectedQuestionIds,
        answers: {},
      })

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return NextResponse.json(
        { error: 'セッションの作成に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessionId })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
