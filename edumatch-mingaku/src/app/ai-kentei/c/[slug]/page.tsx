import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Award, Brain } from 'lucide-react'
import { CertificatePreview } from '@/components/ai-kentei/certificate-preview'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: certificate } = await supabase
    .from('ai_kentei_certificates')
    .select('*')
    .eq('share_slug', slug)
    .single()

  if (!certificate) {
    return { title: '認定証が見つかりません | エデュマッチ AI検定' }
  }

  return {
    title: `${certificate.public_display_name}さんの認定証 | エデュマッチ AI検定`,
    description: `${certificate.public_display_name}さんは生成AI活用ガイドライン検定に合格しました。スコア: ${certificate.score}/25`,
    openGraph: {
      title: `${certificate.public_display_name}さんの認定証`,
      description: `生成AI活用ガイドライン検定に合格しました！スコア: ${certificate.score}/25`,
      type: 'website',
    },
  }
}

export default async function PublicCertificatePage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: certificate, error } = await supabase
    .from('ai_kentei_certificates')
    .select('*')
    .eq('share_slug', slug)
    .eq('is_public', true)
    .single()

  if (error || !certificate) {
    notFound()
  }

  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-2xl mx-auto">
        {/* Verified Badge */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-4 py-2 text-sm font-semibold">
            <Award className="h-4 w-4" />
            認定証
          </div>
        </div>

        {/* Certificate */}
        <CertificatePreview
          name={certificate.public_display_name}
          photoUrl={certificate.photo_url}
          score={certificate.score}
          totalQuestions={25}
          date={new Date(certificate.passed_at)}
          certificateId={certificate.certificate_id}
        />

        {/* CTA */}
        <div className="mt-10 text-center bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-8">
          <Brain className="h-10 w-10 text-blue-200 mx-auto mb-3" />
          <p className="font-semibold text-lg mb-1">あなたも挑戦しませんか？</p>
          <p className="text-blue-200 text-sm mb-5">
            生成AI活用ガイドライン検定は無料で何度でも受験できます
          </p>
          <Button asChild size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold">
            <Link href="/ai-kentei/exam/start">検定を受ける</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
