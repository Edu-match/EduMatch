import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Award } from 'lucide-react'
import { CertificatePreview } from '@/components/ai-kentei/certificate-preview'
import { CertificateDownloadButton } from '@/components/ai-kentei/certificate-download-button'
import type { Metadata } from 'next'
import { getAiKenteiDb } from '@/lib/ai-kentei-db'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await getAiKenteiDb()

  const { data: certificate } = await supabase
    .from('ai_kentei_certificates')
    .select('*')
    .eq('share_slug', slug)
    .single()

  if (!certificate) {
    return { title: '認定証が見つかりません | 一般社団法人 教育AI活用協会' }
  }

  return {
    title: `${certificate.public_display_name}さんの認定証 | 一般社団法人 教育AI活用協会`,
    description: `${certificate.public_display_name}さんは生成AI活用ガイドライン検定に合格しました。スコア: ${certificate.score}/25`,
    openGraph: {
      title: `${certificate.public_display_name}さんの認定証`,
      description: `生成AI活用ガイドライン検定に合格しました！スコア: ${certificate.score}/25`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${certificate.public_display_name}さんの認定証`,
      description: `生成AI活用ガイドライン検定に合格しました！スコア: ${certificate.score}/25`,
    },
  }
}

export default async function PublicCertificatePage({ params }: Props) {
  const { slug } = await params
  const supabase = await getAiKenteiDb()

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
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Verified Badge */}
          <div className="flex items-center justify-center gap-2 mb-6 text-primary">
            <Award className="h-5 w-5" />
            <span className="text-sm font-medium">認定証</span>
          </div>

          {/* Certificate */}
          <div id="ai-kentei-public-certificate-canvas">
            <CertificatePreview
              name={certificate.public_display_name}
              photoUrl={certificate.photo_url}
              score={certificate.score}
              totalQuestions={25}
              date={new Date(certificate.passed_at)}
              certificateId={certificate.certificate_id}
            />
          </div>

          {/* CTA */}
          <div className="mt-8 text-center space-y-4">
            <CertificateDownloadButton
              targetId="ai-kentei-public-certificate-canvas"
              fileName={`ai-kentei-certificate-${certificate.certificate_id}.png`}
              className="w-full sm:w-auto"
            />
            <p className="text-muted-foreground">
              あなたも検定に挑戦してみませんか？
            </p>
            <Button asChild size="lg">
              <Link href="/ai-kentei/exam/start">
                検定を受ける
              </Link>
            </Button>
          </div>
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
