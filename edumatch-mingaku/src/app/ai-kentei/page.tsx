'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Award, Clock, CheckCircle, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const EXAM_START_PATH = '/ai-kentei/exam/start'

export default function AiKenteiPage() {
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile) {
          setIsLoggedIn(true)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const goToExamStart = () => {
    if (!isLoggedIn) {
      toast.info('AI検定を受けるには、無料会員登録（ログイン）が必要です。')
      router.push(`/login?next=${encodeURIComponent(EXAM_START_PATH)}`)
      return
    }
    router.push(EXAM_START_PATH)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <section className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">
              学校教育向け
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
              生成AI活用ガイドライン検定
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
              学校における生成AIの適切な活用方法を学び、理解度を確認できる検定試験です。
              合格者には認定証を発行します。
            </p>
            <div className="flex flex-col items-center gap-4">
              {!loading ? (
                <div className="flex flex-col items-center gap-2">
                  <Button type="button" size="lg" className="text-base px-8" onClick={goToExamStart}>
                    <BookOpen className="mr-2 h-5 w-5" />
                    検定を受ける
                  </Button>
                  <p className="text-xs text-muted-foreground max-w-md">
                    受験にはエデュマッチへの無料会員登録（ログイン）が必要です。
                  </p>
                </div>
              ) : (
                <div className="h-10" aria-hidden />
              )}
            </div>
          </section>

          {/* Info Cards */}
          <section className="grid md:grid-cols-3 gap-6 mb-16">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">試験時間</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">約15分</p>
                <CardDescription className="mt-1">
                  全25問の選択式問題
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">合格基準</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">80%以上</p>
                <CardDescription className="mt-1">
                  25問中20問以上正解
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">認定証</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">即時発行</p>
                <CardDescription className="mt-1">
                  合格後すぐにダウンロード可能
                </CardDescription>
              </CardContent>
            </Card>
          </section>

          {/* Topics */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">出題範囲</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: '基本原則', description: 'AIの特性と教育利用の基本的な考え方' },
                { title: '情報リテラシー', description: '批判的思考と情報の検証方法' },
                { title: '著作権・法律', description: '著作権やプライバシーへの配慮' },
                { title: '学習活動', description: '各教科での適切な活用方法' },
                { title: '発達段階', description: '学年に応じた指導のポイント' },
                { title: '学校運営', description: 'ルール作りと保護者対応' },
              ].map((topic) => (
                <Card key={topic.title} className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{topic.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{topic.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center bg-card border border-border/50 rounded-2xl p-8 md:p-12">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-3">
              今すぐ検定に挑戦
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              50問の問題バンクからランダムに25問が出題されます。
              何度でも受験可能です。
            </p>
            {!loading ? (
              <div className="flex flex-col items-center gap-2">
                <Button type="button" size="lg" className="text-base px-8" onClick={goToExamStart}>
                  検定を開始する
                </Button>
                <p className="text-xs text-muted-foreground max-w-md">
                  受験にはエデュマッチへの無料会員登録（ログイン）が必要です。
                </p>
              </div>
            ) : (
              <div className="h-10" aria-hidden />
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">一般社団法人 教育AI活用協会</span>
            <p className="text-sm text-muted-foreground">
              文部科学省「初等中等教育段階における生成AIの利用に関する暫定的なガイドライン」に基づく
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
