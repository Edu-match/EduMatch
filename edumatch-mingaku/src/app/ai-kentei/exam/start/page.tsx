'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, ArrowRight, AlertCircle, Brain, FlaskConical } from 'lucide-react'
import { toast } from 'sonner'

export default function ExamStartPage() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.profile?.role === 'ADMIN') setIsAdmin(true)
      })
      .catch(() => {})
  }, [])

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
      const response = await fetch('/api/ai-kentei/exam/test', { method: 'POST' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'テストセッションの作成に失敗しました')
      }
      const data = await response.json()
      toast.success('テスト合格セッションを作成しました')
      router.push(`/ai-kentei/exam/${data.sessionId}/result`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'テストセッションの作成に失敗しました。')
      setTestLoading(false)
    }
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/ai-kentei"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          AI検定トップに戻る
        </Link>

        {/* ADMIN テストボタン */}
        {isAdmin && (
          <div className="mb-5 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-start gap-3">
              <FlaskConical className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm text-amber-800 dark:text-amber-300 mb-1">
                  管理者テスト機能
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                  問題なしで合格セッションを作成し、認定証の動作確認ができます。
                </p>
                <Button
                  onClick={handleAdminTest}
                  disabled={testLoading}
                  size="sm"
                  variant="outline"
                  className="border-amber-400 text-amber-700 hover:bg-amber-100 dark:text-amber-300"
                >
                  <FlaskConical className="h-4 w-4 mr-2" />
                  {testLoading ? '作成中...' : 'テスト合格を作成（問題スキップ）'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Card className="border-0 shadow-md">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">生成AI活用ガイドライン検定</Badge>
            </div>
            <CardTitle className="text-2xl">検定試験を開始</CardTitle>
            <CardDescription>
              試験を開始する前に、以下の内容をご確認ください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Exam Info */}
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-5 border border-blue-100 dark:border-blue-900">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                試験概要
              </h3>
              <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
                {[
                  '出題数：25問（50問の問題バンクからランダム出題）',
                  '形式：4択の選択式問題',
                  '合格基準：80%以上（20問以上正解）',
                  '目安時間：約15分（1問20秒のタイマーあり）',
                  '何度でも受験可能',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-blue-400">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Caution */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">注意事項</h3>
                  <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                    <li>• 試験中にブラウザを閉じると、回答が失われる場合があります</li>
                    <li>• 静かな環境で受験することをお勧めします</li>
                    <li>• ログイン中の場合、認定証がマイページから確認できます</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Agreement */}
            <div className="flex items-start space-x-3 p-4 border rounded-xl hover:bg-muted/30 transition-colors">
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
              className="w-full text-base bg-blue-600 hover:bg-blue-700"
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
    </div>
  )
}
