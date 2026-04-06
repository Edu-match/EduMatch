import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Award } from 'lucide-react'
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
        <div className="flex items-center justify-center gap-2 mb-6 text-primary">
          <Award className="h-5 w-5" />
          <span className="text-sm font-medium">認定証</span>
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
        <div className="mt-8 text-center space-y-4">
          <p className="text-muted-foreground">
            あなたも検定に挑戦してみませんか？
          </p>
          <Button asChild size="lg">
            <Link href="/ai-kentei/exam/start">検定を受ける</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
