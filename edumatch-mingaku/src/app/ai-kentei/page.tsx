import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Award, Clock, CheckCircle, Brain, Shield, Star, ChevronRight } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI検定 - 生成AI活用ガイドライン検定',
  description: '学校における生成AIの適切な活用方法を学び、理解度を確認できる検定試験です。合格者には認定証を発行します。',
}

export default function AiKenteiPage() {
  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white">
        <div className="container py-14 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
              <Brain className="h-4 w-4" />
              学校教育向け 生成AI検定
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
              生成AI活用ガイドライン検定
            </h1>
            <p className="text-lg text-blue-100 mb-8 max-w-2xl mx-auto leading-relaxed">
              学校における生成AIの適切な活用方法を学び、理解度を確認できる検定試験です。
              合格者には<span className="text-white font-semibold">デジタル認定証</span>を即時発行します。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-white text-blue-700 hover:bg-blue-50 font-semibold text-base px-8 shadow-lg"
              >
                <Link href="/ai-kentei/exam/start">
                  <BookOpen className="mr-2 h-5 w-5" />
                  検定を受ける
                </Link>
              </Button>
            </div>
            <p className="text-blue-200 text-sm mt-4">
              ※ ログイン後に受験すると認定証をマイページから確認できます
            </p>
          </div>
        </div>
      </div>

      <div className="container py-12 md:py-16">
        <div className="max-w-4xl mx-auto">

          {/* Info Cards */}
          <section className="grid md:grid-cols-3 gap-5 mb-16">
            {[
              {
                icon: Clock,
                iconBg: 'bg-blue-100 text-blue-600',
                title: '試験時間',
                value: '約15分',
                desc: '全25問の選択式問題',
              },
              {
                icon: CheckCircle,
                iconBg: 'bg-green-100 text-green-600',
                title: '合格基準',
                value: '80%以上',
                desc: '25問中20問以上正解',
              },
              {
                icon: Award,
                iconBg: 'bg-amber-100 text-amber-600',
                title: '認定証',
                value: '即時発行',
                desc: '合格後すぐにダウンロード',
              },
            ].map(({ icon: Icon, iconBg, title, value, desc }) => (
              <Card key={title} className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base text-muted-foreground font-medium">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                  <CardDescription className="mt-1">{desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Topics */}
          <section className="mb-16">
            <div className="text-center mb-8">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 mb-3">出題範囲</Badge>
              <h2 className="text-2xl font-bold">試験の出題カテゴリ</h2>
              <p className="text-muted-foreground mt-2">文部科学省ガイドラインに沿った6つの分野から出題</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: '基本原則', description: 'AIの特性と教育利用の基本的な考え方', color: 'bg-blue-50 border-blue-100' },
                { title: '情報リテラシー', description: '批判的思考と情報の検証方法', color: 'bg-indigo-50 border-indigo-100' },
                { title: '著作権・法律', description: '著作権やプライバシーへの配慮', color: 'bg-violet-50 border-violet-100' },
                { title: '学習活動', description: '各教科での適切な活用方法', color: 'bg-cyan-50 border-cyan-100' },
                { title: '発達段階', description: '学年に応じた指導のポイント', color: 'bg-teal-50 border-teal-100' },
                { title: '学校運営', description: 'ルール作りと保護者対応', color: 'bg-sky-50 border-sky-100' },
              ].map((topic) => (
                <div key={topic.title} className={`rounded-xl border p-5 ${topic.color}`}>
                  <h3 className="font-semibold text-foreground mb-1">{topic.title}</h3>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="grid md:grid-cols-3 gap-5 mb-16">
            {[
              { icon: Star, text: '何度でも受験可能', sub: '繰り返し挑戦できます' },
              { icon: Shield, text: 'ランダム出題', sub: '50問バンクから25問を抽選' },
              { icon: Award, text: 'デジタル認定証', sub: 'SNSで共有できます' },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} className="flex items-start gap-4 p-5 bg-muted/40 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold">{text}</p>
                  <p className="text-sm text-muted-foreground">{sub}</p>
                </div>
              </div>
            ))}
          </section>

          {/* CTA */}
          <section className="text-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-10 md:p-14">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">今すぐ検定に挑戦</h2>
            <p className="text-blue-100 mb-6 max-w-md mx-auto">
              50問の問題バンクからランダムに25問が出題されます。
            </p>
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 font-semibold text-base px-8"
            >
              <Link href="/ai-kentei/exam/start">
                検定を開始する
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </section>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            文部科学省「初等中等教育段階における生成AIの利用に関する暫定的なガイドライン」に基づく
          </p>
        </div>
      </div>
    </div>
  )
}
