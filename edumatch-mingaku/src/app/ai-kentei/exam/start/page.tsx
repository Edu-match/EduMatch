'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function ExamStartPage() {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

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
      toast.error(err instanceof Error ? err.message : '試験の開始に失敗しました。もう一度お試しください。')
      setLoading(false)
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

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">検定試験を開始</CardTitle>
            <CardDescription>
              試験を開始する前に、以下の内容をご確認ください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exam Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">試験概要</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {[
                  '出題数：25問（50問の問題バンクからランダム出題）',
                  '形式：4択の選択式問題',
                  '合格基準：80%以上（20問以上正解）',
                  '目安時間：約15分（1問20秒のタイマーあり）',
                  '何度でも受験可能',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Caution */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h3 className="font-medium text-amber-800 dark:text-amber-300">注意事項</h3>
                  <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                    <li>• 試験中にブラウザを閉じると、回答が失われる場合があります</li>
                    <li>• 静かな環境で受験することをお勧めします</li>
                    <li>• ログイン中の場合、認定証がマイページから確認できます</li>
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
    </div>
  )
}
