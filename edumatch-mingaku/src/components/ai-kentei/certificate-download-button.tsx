'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { generateCertificatePng } from '@/lib/certificate-canvas'

interface CertificateDownloadButtonProps {
  name: string
  date: Date | string
  certificateId: string
  fileName: string
  className?: string
}

export function CertificateDownloadButton({
  name,
  date,
  certificateId,
  fileName,
  className,
}: CertificateDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      const blob = await generateCertificatePng({ name, date, certificateId })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
      toast.success('認定証をダウンロードしました')
    } catch (error) {
      console.error('certificate download failed', error)
      toast.error('ダウンロードに失敗しました。しばらくしてから再度お試しください。')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          画像を生成中...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          ダウンロード
        </>
      )}
    </Button>
  )
}
