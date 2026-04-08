'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Award, ExternalLink } from 'lucide-react'

interface Certificate {
  id: string
  certificate_id: string
  public_display_name: string
  score: number
  passed_at: string
  share_slug: string
  is_public: boolean
}

export function AiKenteiCertificatesCompact() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        const res = await fetch('/api/ai-kentei/certificates', {
          method: 'GET',
          cache: 'no-store',
        })
        const payload = await res.json()
        if (!res.ok) return
        setCertificates(payload.certificates ?? [])
      } catch {
        // Silent fail
      } finally {
        setLoading(false)
      }
    }

    fetchCertificates()
  }, [])

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (certificates.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        <p className="mb-3">まだ認定証がありません。</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/ai-kentei">
            <Award className="h-4 w-4 mr-2" />
            AI検定に挑戦する
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {certificates.map((cert) => (
        <div
          key={cert.id}
          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
            <Award className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              生成AI活用ガイドライン検定
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(cert.passed_at).toLocaleDateString('ja-JP')} ·{' '}
              <span className="font-medium text-foreground">{cert.score}/25問正解</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="default" className="bg-green-600 text-xs">合格</Badge>
            {cert.is_public && (
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={`/ai-kentei/c/${cert.share_slug}`} target="_blank">
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
