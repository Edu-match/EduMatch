import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { requireAuth, getCurrentProfile } from '@/lib/auth'
import OpenAI from 'openai'

export async function POST(request: Request) {
  try {
    await requireAuth()
    const profile = await getCurrentProfile()
    if (profile?.role !== 'ADMIN') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const { topic } = body

    if (!topic) {
      return NextResponse.json({ error: 'トピックが指定されていません' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const prompt = `あなたは学校教育における生成AI活用ガイドラインの専門家です。
以下のトピックに関する4択問題を1つ作成してください。

トピック: ${topic}

以下のJSON形式のみで回答してください：
{
  "question_text": "問題文",
  "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
  "correct_answer": "正解の選択肢（上記の選択肢と完全一致）",
  "explanation": "解説文",
  "tag": "タグ（基本原則、情報リテラシー、著作権・法律、学習活動、発達段階、学校運営、教員活用、プライバシー、倫理、授業設計、特別支援、学術倫理のいずれか）",
  "difficulty": "難易度（easy、medium、hardのいずれか）"
}

注意事項：
- 問題は文部科学省のガイドラインに沿った内容にしてください
- JSONのみを出力し、他のテキストは含めないでください`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    })

    const text = completion.choices[0].message.content ?? ''

    let parsedQuestion
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsedQuestion = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'AIの応答を解析できませんでした' }, { status: 500 })
    }

    if (!parsedQuestion.question_text || !parsedQuestion.options || !parsedQuestion.correct_answer) {
      return NextResponse.json({ error: '生成された問題の形式が不正です' }, { status: 500 })
    }

    const supabase = await createClient()

    const { data: lastQuestion } = await supabase
      .from('ai_kentei_questions')
      .select('question_number')
      .order('question_number', { ascending: false })
      .limit(1)
      .single()

    const nextNumber = (lastQuestion?.question_number || 0) + 1

    const { data: question, error } = await supabase
      .from('ai_kentei_questions')
      .insert({
        question_number: nextNumber,
        question_text: parsedQuestion.question_text,
        options: parsedQuestion.options,
        correct_answer: parsedQuestion.correct_answer,
        explanation: parsedQuestion.explanation || null,
        tag: parsedQuestion.tag || null,
        difficulty: parsedQuestion.difficulty || 'medium',
        polarity: 'normal',
        status: 'draft',
        created_by_ai: true,
        reviewed_by_human: false,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: '問題の保存に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ question })
  } catch {
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
