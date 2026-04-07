'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
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
import { ChevronRight, AlertTriangle, Loader2, Clock, Brain } from 'lucide-react'
import { toast } from 'sonner'

interface Question {
  id: string
  question_text: string
  options: string[]
  tag: string | null
  difficulty: string
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
        if (!response.ok) throw new Error('Failed to fetch exam data')
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
    if (timerStarted && !submitting) setQuestionTimeRemaining(20)
  }, [currentIndex, timerStarted, submitting])

  useEffect(() => {
    if (examData && !timerStarted) setTimerStarted(true)
  }, [examData, timerStarted])

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
          if (!response.ok) throw new Error('Failed')
          router.push(`/ai-kentei/exam/${resolvedParams.sessionId}/result`)
        } catch {
          toast.error('提出に失敗しました')
          setSubmitting(false)
        }
      }
      submitExam()
    }
  }, [autoSubmitTriggered, submitting, resolvedParams.sessionId, router])

  const saveAnswers = async (newAnswers: Record<string, string>) => {
    try {
      await fetch(`/api/ai-kentei/exam/${resolvedParams.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: newAnswers }),
      })
    } catch { /* silent */ }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer }
    setAnswers(newAnswers)
    saveAnswers(newAnswers)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/ai-kentei/exam/${resolvedParams.sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersRef.current }),
      })
      if (!response.ok) throw new Error('Failed')
      router.push(`/ai-kentei/exam/${resolvedParams.sessionId}/result`)
    } catch {
      toast.error('提出に失敗しました')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
          <Brain className="h-6 w-6 text-white animate-pulse" />
        </div>
        <p className="text-muted-foreground text-sm">問題を読み込んでいます...</p>
      </div>
    )
  }

  if (!examData) return null

  const currentQuestion = examData.questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const progress = (answeredCount / examData.questions.length) * 100

  const timerColor =
    questionTimeRemaining <= 5
      ? 'bg-red-100 text-red-600 border-red-200 animate-pulse'
      : questionTimeRemaining <= 10
      ? 'bg-amber-100 text-amber-600 border-amber-200'
      : 'bg-blue-50 text-blue-600 border-blue-200'

  return (
    <div className="container py-4 md:py-6">
      <div className="max-w-3xl mx-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              問題 <span className="text-foreground font-bold">{currentIndex + 1}</span> / {examData.questions.length}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              ({answeredCount}問回答済み)
            </span>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold border ${timerColor}`}>
            <Clock className="h-4 w-4" />
            <span className="w-5 text-center">{questionTimeRemaining}</span>
            <span className="text-xs opacity-70">秒</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>進捗</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-5 border-0 shadow-md">
          <CardHeader className="pb-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-xl text-white">
            <div className="flex items-center gap-2 mb-2">
              {currentQuestion.tag && (
                <Badge className="bg-white/20 text-white border-0 text-xs hover:bg-white/20">
                  {currentQuestion.tag}
                </Badge>
              )}
              <Badge
                className={`text-xs border-0 ${
                  currentQuestion.difficulty === 'easy'
                    ? 'bg-green-500/30 text-green-100'
                    : currentQuestion.difficulty === 'hard'
                    ? 'bg-red-400/30 text-red-100'
                    : 'bg-amber-400/30 text-amber-100'
                }`}
              >
                {currentQuestion.difficulty === 'easy' ? '基本' : currentQuestion.difficulty === 'hard' ? '応用' : '標準'}
              </Badge>
            </div>
            <CardTitle className="text-base md:text-lg leading-relaxed text-white font-medium">
              {currentQuestion.question_text}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              className="space-y-3"
            >
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === option
                return (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/10'
                    }`}
                    onClick={() => handleAnswerChange(currentQuestion.id, option)}
                  >
                    <RadioGroupItem value={option} id={`option-${index}`} className="mt-0.5" />
                    <Label
                      htmlFor={`option-${index}`}
                      className={`flex-1 cursor-pointer leading-relaxed text-sm ${isSelected ? 'text-blue-700 dark:text-blue-300 font-medium' : ''}`}
                    >
                      {option}
                    </Label>
                  </div>
                )
              })}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            前の問題
          </Button>
          {currentIndex === examData.questions.length - 1 ? (
            <Button
              onClick={() => setShowSubmitDialog(true)}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />提出中...</> : '試験を提出する'}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentIndex(Math.min(examData.questions.length - 1, currentIndex + 1))}
              className="bg-blue-600 hover:bg-blue-700"
            >
              次の問題へ
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              試験を提出しますか？
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-1">
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
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {submitting ? '提出中...' : '提出する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
