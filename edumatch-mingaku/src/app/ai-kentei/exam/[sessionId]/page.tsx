'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Brain, ChevronRight, AlertTriangle, Loader2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Question {
  id: string
  question_text: string
  options: string[]
  tag: string | null
  difficulty: string
  polarity: string
}

interface ExamData {
  session: {
    sessionId: string
    answers: Record<string, string>
    isCompleted: boolean
    score: number | null
    passed: boolean | null
  }
  questions: Question[]
}

export default function ExamPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [examData, setExamData] = useState<ExamData | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitDialog, setShowSubmitDialog] = useState(false)
  const [questionTimeRemaining, setQuestionTimeRemaining] = useState(20)
  const [timerStarted, setTimerStarted] = useState(false)
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false)
  const answersRef = useRef(answers)
  answersRef.current = answers
  const currentIndexRef = useRef(currentIndex)
  currentIndexRef.current = currentIndex

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        const response = await fetch(`/api/ai-kentei/exam/${resolvedParams.sessionId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch exam data')
        }
        const data = await response.json()

        if (data.session.isCompleted) {
          router.push(`/ai-kentei/exam/${resolvedParams.sessionId}/result`)
          return
        }

        setExamData(data)
        setAnswers(data.session.answers || {})
      } catch {
        toast.error('試験データの取得に失敗しました')
        router.push('/ai-kentei')
      } finally {
        setLoading(false)
      }
    }

    fetchExamData()
  }, [resolvedParams.sessionId, router])

  // Timer effect - 20 seconds per question
  useEffect(() => {
    if (!timerStarted || loading || submitting) return

    const interval = setInterval(() => {
      setQuestionTimeRemaining((prev) => {
        if (prev <= 1) {
          if (examData && currentIndexRef.current < examData.questions.length - 1) {
            setCurrentIndex(currentIndexRef.current + 1)
            return 20
          } else {
            clearInterval(interval)
            setAutoSubmitTriggered(true)
            return 0
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timerStarted, loading, submitting, examData])

  useEffect(() => {
    if (timerStarted && !submitting) {
      setQuestionTimeRemaining(20)
    }
  }, [currentIndex, timerStarted, submitting])

  useEffect(() => {
    if (examData && !timerStarted) {
      setTimerStarted(true)
    }
  }, [examData, timerStarted])

  const saveAnswers = async (newAnswers: Record<string, string>) => {
    try {
      await fetch(`/api/ai-kentei/exam/${resolvedParams.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: newAnswers }),
      })
    } catch {
      // Silent fail for auto-save
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer }
    setAnswers(newAnswers)
    saveAnswers(newAnswers)
  }

  useEffect(() => {
    if (autoSubmitTriggered && !submitting) {
      const submitExam = async () => {
        setSubmitting(true)
        try {
          const response = await fetch(`/api/ai-kentei/exam/${resolvedParams.sessionId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: answersRef.current }),
          })

          if (!response.ok) {
            throw new Error('Failed to submit exam')
          }

          router.push(`/ai-kentei/exam/${resolvedParams.sessionId}/result`)
        } catch {
          toast.error('提出に失敗しました。もう一度お試しください。')
          setSubmitting(false)
        }
      }
      submitExam()
    }
  }, [autoSubmitTriggered, submitting, resolvedParams.sessionId, router])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/ai-kentei/exam/${resolvedParams.sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersRef.current }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit exam')
      }

      router.push(`/ai-kentei/exam/${resolvedParams.sessionId}/result`)
    } catch {
      toast.error('提出に失敗しました。もう一度お試しください。')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!examData) {
    return null
  }

  const currentQuestion = examData.questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const progress = (answeredCount / examData.questions.length) * 100

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-background">
      {/* Sub Header — below global fixed header (h-16); extra spacing in main avoids card clipping */}
      <header className="sticky top-16 z-40 shrink-0 border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/ai-kentei" className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <span className="font-medium text-sm hidden sm:inline">一般社団法人 教育AI活用協会</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Per-Question Timer Display */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-medium transition-colors ${
              questionTimeRemaining <= 5
                ? 'bg-destructive/10 text-destructive animate-pulse'
                : questionTimeRemaining <= 10
                ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                : 'bg-primary/10 text-primary'
            }`}>
              <Clock className="h-4 w-4" />
              <span className="w-6 text-center">{questionTimeRemaining}</span>
              <span className="text-xs opacity-70">秒</span>
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {answeredCount} / {examData.questions.length} 問回答済み
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 pb-8 pt-5 md:pb-10 md:pt-8">
        <div className="relative z-0 mx-auto max-w-3xl">
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                問題 {currentIndex + 1} / {examData.questions.length}
              </span>
              <span className="text-sm text-muted-foreground">
                進捗 {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <Card className="border-border/50 mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                {currentQuestion.tag && (
                  <Badge variant="secondary" className="text-xs">
                    {currentQuestion.tag}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    currentQuestion.difficulty === 'easy'
                      ? 'border-green-500 text-green-600'
                      : currentQuestion.difficulty === 'hard'
                      ? 'border-red-500 text-red-600'
                      : 'border-yellow-500 text-yellow-600'
                  }`}
                >
                  {currentQuestion.difficulty === 'easy' ? '基本' : currentQuestion.difficulty === 'hard' ? '応用' : '標準'}
                </Badge>
              </div>
              <CardTitle className="text-lg md:text-xl leading-relaxed">
                {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                className="space-y-3"
              >
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                      answers[currentQuestion.id] === option
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                    onClick={() => handleAnswerChange(currentQuestion.id, option)}
                  >
                    <RadioGroupItem value={option} id={`option-${index}`} className="mt-0.5" />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer leading-relaxed">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-end">
            {currentIndex === examData.questions.length - 1 ? (
              <Button
                onClick={() => setShowSubmitDialog(true)}
                disabled={submitting}
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    提出中...
                  </>
                ) : (
                  '試験を提出する'
                )}
              </Button>
            ) : (
              <Button
                onClick={() => setCurrentIndex(Math.min(examData.questions.length - 1, currentIndex + 1))}
                size="lg"
              >
                次の問題へ
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" />
              試験を提出しますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {answeredCount === examData.questions.length
                  ? 'すべての問題に回答済みです。'
                  : `${examData.questions.length - answeredCount}問が未回答です。`}
              </p>
              <p>提出後は回答の変更ができません。</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              {submitting ? '提出中...' : '提出する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
