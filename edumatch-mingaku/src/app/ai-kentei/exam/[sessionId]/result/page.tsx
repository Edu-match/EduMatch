'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, XCircle, RotateCcw, Award, ChevronDown, ChevronUp, Home, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

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
        console.log('Fetching result for session:', resolvedParams.sessionId)
        const response = await fetch(`/api/ai-kentei/exam/${resolvedParams.sessionId}/result`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Result fetch failed:', { status: response.status, error: errorData })
          throw new Error(errorData.error || 'Failed to fetch result data')
        }
        const data = await response.json()
        console.log('Result data:', data)
        setResultData(data)
      } catch (err) {
        console.error('Error fetching result:', err)
        toast.error(err instanceof Error ? err.message : '結果の取得に失敗しました')
        router.push('/ai-kentei')
      } finally {
        setLoading(false)
      }
    }

    fetchResultData()
  }, [resolvedParams.sessionId, router])

  const toggleQuestion = (questionId: string) => {
    const newExpanded = new Set(expandedQuestions)
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId)
    } else {
      newExpanded.add(questionId)
    }
    setExpandedQuestions(newExpanded)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!resultData) {
    return null
  }

  const { session, questions } = resultData
  const totalQuestions = questions.length > 0 ? questions.length : 25
  const percentage = Math.round((session.score / totalQuestions) * 100)

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Result Card */}
          <Card className={`border-2 mb-8 ${session.passed ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' : 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20'}`}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4">
                {session.passed ? (
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Trophy className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                  </div>
                )}
              </div>
              <CardTitle className="text-2xl md:text-3xl">
                {session.passed ? '合格おめでとうございます！' : '残念ながら不合格です'}
              </CardTitle>
              <CardDescription className="text-base">
                {session.passed
                  ? '認定証を発行できます'
                  : '80%以上の正解で合格です。再挑戦してみましょう！'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-foreground">{session.score}</p>
                  <p className="text-sm text-muted-foreground">正解数</p>
                </div>
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-foreground">{totalQuestions}</p>
                  <p className="text-sm text-muted-foreground">出題数</p>
                </div>
                <div>
                  <p className="text-3xl md:text-4xl font-bold text-foreground">{percentage}%</p>
                  <p className="text-sm text-muted-foreground">正答率</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
                {session.passed && (
                  <Button asChild size="lg">
                    <Link href={`/ai-kentei/exam/${resolvedParams.sessionId}/certificate`}>
                      <Award className="mr-2 h-5 w-5" />
                      認定証を発行する
                    </Link>
                  </Button>
                )}
                <Button asChild variant={session.passed ? 'outline' : 'default'} size="lg">
                  <Link href="/ai-kentei/exam/start">
                    <RotateCcw className="mr-2 h-5 w-5" />
                    もう一度挑戦する
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/ai-kentei">
                    <Home className="mr-2 h-5 w-5" />
                    トップへ
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-8 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">受験お疲れさまでした。</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                アンケートにご協力ください。
                いただいたご意見は、今後の問題改善・資格の充実に活用させていただきます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">所要時間：約1分</p>
              <Button asChild variant="outline" size="lg">
                <a
                  href="https://forms.gle/uXVaTN9788rUG1yJ6"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  アンケートに回答する
                </a>
              </Button>
              <p className="text-xs break-all text-muted-foreground">
                https://forms.gle/uXVaTN9788rUG1yJ6
              </p>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          {questions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">解答詳細</h2>

              {questions.map((question, index) => {
                const userAnswer = session.answers[question.id]
                const isCorrect = userAnswer === question.correct_answer
                const isExpanded = expandedQuestions.has(question.id)

                return (
                  <Collapsible
                    key={question.id}
                    open={isExpanded}
                    onOpenChange={() => toggleQuestion(question.id)}
                  >
                    <Card className={`border ${isCorrect ? 'border-green-500/30' : 'border-red-500/30'}`}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={isCorrect ? 'default' : 'destructive'} className={isCorrect ? 'bg-green-600' : ''}>
                                  {isCorrect ? '正解' : '不正解'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">問題 {index + 1}</span>
                                {question.tag && (
                                  <Badge variant="outline" className="text-xs">
                                    {question.tag}
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-base font-medium leading-relaxed">
                                {question.question_text}
                              </CardTitle>
                            </div>
                            <Button variant="ghost" size="icon" className="shrink-0">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => {
                              const isUserAnswer = userAnswer === option
                              const isCorrectAnswer = question.correct_answer === option

                              return (
                                <div
                                  key={optionIndex}
                                  className={`p-3 rounded-lg border ${
                                    isCorrectAnswer
                                      ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                                      : isUserAnswer && !isCorrect
                                      ? 'border-red-500 bg-red-50 dark:bg-red-950/30'
                                      : 'border-border'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isCorrectAnswer && (
                                      <Badge variant="default" className="bg-green-600 text-xs">正解</Badge>
                                    )}
                                    {isUserAnswer && !isCorrect && (
                                      <Badge variant="destructive" className="text-xs">あなたの回答</Badge>
                                    )}
                                    {isUserAnswer && isCorrect && (
                                      <Badge variant="default" className="bg-green-600 text-xs">あなたの回答</Badge>
                                    )}
                                    <span className={isCorrectAnswer ? 'font-medium' : ''}>{option}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {question.explanation && (
                            <div className="bg-muted/50 rounded-lg p-4">
                              <p className="text-sm font-medium text-foreground mb-1">解説</p>
                              <p className="text-sm text-muted-foreground">{question.explanation}</p>
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
        </div>
      </main>
    </div>
  )
}
