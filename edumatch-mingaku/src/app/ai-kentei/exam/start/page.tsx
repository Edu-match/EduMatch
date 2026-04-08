'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, Brain, AlertCircle, FlaskConical, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const EXAM_START_PATH = '/ai-kentei/exam/start'

export default function ExamStartPage() {
  const router = useRouter()
  const [authReady, setAuthReady] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        if (!data?.profile) {
          toast.info('AI検定を受けるには、無料会員登録（ログイン）が必要です。')
          router.replace(`/login?next=${encodeURIComponent(EXAM_START_PATH)}`)
          return
        }
        setAuthReady(true)
        if (data.profile.role === 'ADMIN') setIsAdmin(true)
      })
      .catch(() => {
        if (cancelled) return
        toast.info('AI検定を受けるには、無料会員登録（ログイン）が必要です。')
        router.replace(`/login?next=${encodeURIComponent(EXAM_START_PATH)}`)
      })
    return () => {
      cancelled = true
    }
  }, [router])

  const handleStartExam = async () => {
    if (!agreed) {
      toast.error('受験規約に同意してください')
      return
    }
    setLoading(true)
    try {
      const response = await fetch('/api/ai-kentei/exam/start', { method: 'POST' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? '試験の開始に失敗しました')
      }
      const data = await response.json()
      router.push(`/ai-kentei/exam/${data.sessionId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '試験の開始に失敗しました。')
      setLoading(false)
    }
  }

  const handleAdminTest = async () => {
    setTestLoading(true)
    try {
      const response = await fetch('/api/ai-kentei/exam/test', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))
      console.log('Test API response:', { status: response.status, data })
      if (!response.ok) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'テストセッションの作成に失敗しました'
        )
      }
      if (!data.sessionId) {
        throw new Error('セッションIDが返されていません')
      }
      toast.success('テスト合格セッションを作成しました')
      console.log('Navigating to:', `/ai-kentei/exam/${data.sessionId}/result`)
      router.push(`/ai-kentei/exam/${data.sessionId}/result`)
    } catch (err) {
      console.error('Test skip error:', err)
      toast.error(err instanceof Error ? err.message : 'テストの作成に失敗しました。')
    } finally {
      setTestLoading(false)
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-label="読み込み中" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sub Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/ai-kentei" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Brain className="h-6 w-6 text-primary" />
            <span className="font-medium text-sm">一般社団法人 教育AI活用協会</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/ai-kentei"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            トップに戻る
          </Link>

          {/* ADMIN: 問題バンクが空でも合格フローを試せる */}
          {isAdmin && (
            <div className="mb-6 p-4 bg-accent/20 border border-accent/30 rounded-lg">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <FlaskConical className="h-5 w-5 text-accent-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-accent-foreground">ADMINテストモード</p>
                    <p className="text-xs text-muted-foreground">
                      問題の有無に関係なく、合格済みセッションを作成して認定証フローを確認できます
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleAdminTest()}
                  disabled={testLoading}
                  className="shrink-0"
                >
                  {testLoading ? '作成中...' : '問題スキップ'}
                </Button>
              </div>
            </div>
          )}

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-2xl">検定試験を開始</CardTitle>
              <CardDescription>
                試験を開始する前に、以下の内容をご確認ください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exam Info */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <h3 className="font-medium text-foreground">試験概要</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>出題数：25問（50問の問題バンクからランダム出題）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>形式：4択の選択式問題</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>合格基準：80%以上（20問以上正解）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>目安時間：約15分</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>何度でも受験可能</span>
                  </li>
                </ul>
              </div>

              {/* Caution */}
              <div className="bg-accent/20 border border-accent/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-accent-foreground mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <h3 className="font-medium text-accent-foreground">注意事項</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• 試験中にブラウザを閉じると、回答が失われる場合があります</li>
                      <li>• 静かな環境で受験することをお勧めします</li>
                      <li>• 合格後は認定証を発行できます</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Agreement */}
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="agreement"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked as boolean)}
                />
                <Label htmlFor="agreement" className="text-sm leading-relaxed cursor-pointer">
                  上記の内容を確認し、検定試験を開始することに同意します
                </Label>
              </div>

              {/* Start Button */}
              <Button
                onClick={handleStartExam}
                disabled={!agreed || loading}
                size="lg"
                className="w-full text-base"
              >
                {loading ? (
                  '準備中...'
                ) : (
                  <>
                    試験を開始する
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
