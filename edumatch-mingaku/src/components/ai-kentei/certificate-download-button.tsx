'use client'

import { useState } from 'react'
import { toPng } from 'html-to-image'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface CertificateDownloadButtonProps {
  targetId: string
  fileName: string
  className?: string
}

export function CertificateDownloadButton({
  targetId,
  fileName,
  className,
}: CertificateDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    const target = document.getElementById(targetId)
    if (!target) {
      toast.error('認定証の描画領域が見つかりませんでした')
      return
    }

    setIsDownloading(true)
    try {
      const dataUrl = await toPng(target, {
        cacheBust: true,
        pixelRatio: 2,
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = fileName
      a.click()
      toast.success('認定証をダウンロードしました')
    } catch (error) {
      console.error('certificate download failed', error)
      toast.error('ダウンロードに失敗しました。画像URLやネットワークをご確認ください。')
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
