'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Trophy, XCircle, RotateCcw, Award, ChevronDown, ChevronUp, Home, Loader2, Brain } from 'lucide-react'
import { toast } from 'sonner'

interface Question {
  id: string
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string | null
  tag: string | null
}

interface ResultData {
  session: {
    sessionId: string
    answers: Record<string, string>
    score: number
    passed: boolean
  }
  questions: Question[]
}

export default function ResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [resultData, setResultData] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchResultData = async () => {
      try {
        const response = await fetch(`/api/ai-kentei/exam/${resolvedParams.sessionId}/result`)
        if (!response.ok) throw new Error('Failed')
        const data = await response.json()
        setResultData(data)
      } catch {
        toast.error('結果の取得に失敗しました')
        router.push('/ai-kentei')
      } finally {
        setLoading(false)
      }
    }
    fetchResultData()
  }, [resolvedParams.sessionId, router])

  const toggleQuestion = (id: string) => {
    const next = new Set(expandedQuestions)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpandedQuestions(next)
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
          <Brain className="h-6 w-6 text-white animate-pulse" />
        </div>
        <p className="text-muted-foreground text-sm">結果を集計しています...</p>
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!resultData) return null

  const { session, questions } = resultData
  const totalQuestions = questions.length || 25
  const percentage = Math.round((session.score / totalQuestions) * 100)

  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Result Card */}
        <div className={`rounded-2xl border-2 mb-8 overflow-hidden ${
          session.passed
            ? 'border-green-500/40'
            : 'border-red-400/40'
        }`}>
          {/* Top banner */}
          <div className={`p-8 text-center text-white ${
            session.passed
              ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-rose-600'
          }`}>
            <div className="mx-auto w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
              {session.passed
                ? <Trophy className="h-10 w-10 text-white" />
                : <XCircle className="h-10 w-10 text-white" />}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              {session.passed ? '合格おめでとうございます！' : '残念ながら不合格です'}
            </h1>
            <p className={session.passed ? 'text-green-100' : 'text-red-100'}>
              {session.passed
                ? '認定証を発行できます'
                : '80%以上の正解で合格です。再挑戦してみましょう！'}
            </p>
          </div>

          {/* Score */}
          <div className={`p-6 ${session.passed ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              <div className="bg-white dark:bg-muted rounded-xl p-4 shadow-sm">
                <p className="text-3xl font-bold text-blue-600">{session.score}</p>
                <p className="text-xs text-muted-foreground mt-1">正解数</p>
              </div>
              <div className="bg-white dark:bg-muted rounded-xl p-4 shadow-sm">
                <p className="text-3xl font-bold text-muted-foreground">{totalQuestions}</p>
                <p className="text-xs text-muted-foreground mt-1">出題数</p>
              </div>
              <div className="bg-white dark:bg-muted rounded-xl p-4 shadow-sm">
                <p className={`text-3xl font-bold ${session.passed ? 'text-green-600' : 'text-red-500'}`}>{percentage}%</p>
                <p className="text-xs text-muted-foreground mt-1">正答率</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {session.passed && (
                <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
                  <Link href={`/ai-kentei/exam/${resolvedParams.sessionId}/certificate`}>
                    <Award className="mr-2 h-5 w-5" />
                    認定証を発行する
                  </Link>
                </Button>
              )}
              <Button asChild variant={session.passed ? 'outline' : 'default'} size="lg"
                className={!session.passed ? 'bg-blue-600 hover:bg-blue-700' : ''}>
                <Link href="/ai-kentei/exam/start">
                  <RotateCcw className="mr-2 h-5 w-5" />
                  もう一度挑戦する
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/ai-kentei">
                  <Home className="mr-2 h-5 w-5" />
                  AI検定トップ
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        {questions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              解答詳細
            </h2>

            {questions.map((question, index) => {
              const userAnswer = session.answers[question.id]
              const isCorrect = userAnswer === question.correct_answer
              const isExpanded = expandedQuestions.has(question.id)

              return (
                <Collapsible key={question.id} open={isExpanded} onOpenChange={() => toggleQuestion(question.id)}>
                  <Card className={`border-l-4 ${isCorrect ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge
                                className={`text-xs border-0 ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                              >
                                {isCorrect ? '✓ 正解' : '✗ 不正解'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">問題 {index + 1}</span>
                              {question.tag && (
                                <Badge variant="outline" className="text-xs border-blue-200 text-blue-600">{question.tag}</Badge>
                              )}
                            </div>
                            <CardTitle className="text-sm font-medium leading-relaxed">
                              {question.question_text}
                            </CardTitle>
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 space-y-3">
                        <div className="space-y-2">
                          {question.options.map((option, oi) => {
                            const isUserAnswer = userAnswer === option
                            const isCorrectAnswer = question.correct_answer === option
                            return (
                              <div
                                key={oi}
                                className={`p-3 rounded-lg text-sm border-2 ${
                                  isCorrectAnswer
                                    ? 'border-green-400 bg-green-50 dark:bg-green-950/30'
                                    : isUserAnswer && !isCorrect
                                    ? 'border-red-400 bg-red-50 dark:bg-red-950/30'
                                    : 'border-border'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isCorrectAnswer && (
                                    <Badge className="bg-green-500 text-xs shrink-0">正解</Badge>
                                  )}
                                  {isUserAnswer && !isCorrect && (
                                    <Badge variant="destructive" className="text-xs shrink-0">あなたの回答</Badge>
                                  )}
                                  {isUserAnswer && isCorrect && (
                                    <Badge className="bg-green-500 text-xs shrink-0">あなたの回答</Badge>
                                  )}
                                  <span className={isCorrectAnswer ? 'font-medium' : 'text-muted-foreground'}>{option}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {question.explanation && (
                          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg p-4">
                            <p className="text-xs font-semibold text-blue-600 mb-1">解説</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{question.explanation}</p>
                          </div>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )
            })}
          </div>
        )}

        {questions.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-4">
            （テストセッションのため解答詳細はありません）
          </div>
        )}
      </div>
    </div>
  )
}
