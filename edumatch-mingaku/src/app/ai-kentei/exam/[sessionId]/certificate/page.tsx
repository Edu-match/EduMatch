'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Share2, Camera, Loader2, ArrowLeft, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { CertificatePreview } from '@/components/ai-kentei/certificate-preview'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'

interface CertificateData {
  sessionId: string
  score: number
  totalQuestions: number
  passedAt: string
}

interface ProfileInfo {
  displayName: string | null
  legalName: string | null
  email: string | null
}

type NameType = 'display' | 'legal' | 'custom'

export default function CertificatePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null)
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [nameType, setNameType] = useState<NameType>('custom')
  const [customName, setCustomName] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [certificateId, setCertificateId] = useState<string | null>(null)
  const [shareSlug, setShareSlug] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resolvedName = (() => {
    if (nameType === 'display') return profileInfo?.displayName ?? customName
    if (nameType === 'legal') return profileInfo?.legalName ?? customName
    return customName
  })()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 試験結果取得
        const response = await fetch(`/api/ai-kentei/exam/${resolvedParams.sessionId}/result`)
        if (!response.ok) throw new Error('Failed to fetch data')
        const data = await response.json()

        if (!data.session.passed) {
          toast.error('合格者のみ認定証を発行できます')
          router.push(`/ai-kentei/exam/${resolvedParams.sessionId}/result`)
          return
        }

        setCertificateData({
          sessionId: data.session.sessionId,
          score: data.session.score,
          totalQuestions: data.questions.length,
          passedAt: new Date().toISOString(),
        })

        // ログインユーザー情報取得
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const res = await fetch('/api/ai-kentei/profile')
          if (res.ok) {
            const profileData = await res.json()
            if (profileData.name) {
              const info: ProfileInfo = {
                displayName: profileData.name ?? null,
                legalName: profileData.legal_name ?? null,
                email: profileData.email ?? user.email ?? null,
              }
              setProfileInfo(info)
              setNameType('display')
            }
          }
        }
      } catch {
        toast.error('データの取得に失敗しました')
        router.push('/ai-kentei')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [resolvedParams.sessionId, router])

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('ファイルサイズは5MB以下にしてください')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => setPhotoUrl(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleGenerateCertificate = async () => {
    if (!resolvedName.trim()) {
      toast.error('お名前を入力してください')
      return
    }

    setGenerating(true)
    try {
      const response = await fetch('/api/ai-kentei/certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: resolvedParams.sessionId,
          displayName: resolvedName.trim(),
          photoUrl,
          nameType,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Failed to generate certificate')
      }

      const data = await response.json()
      setCertificateId(data.certificateId)
      setShareSlug(data.shareSlug)
      toast.success('認定証を発行しました！')
      if (profileInfo?.email) {
        toast.success(`認定証をメール（${profileInfo.email}）に送信しました`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '認定証の発行に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleShare = async () => {
    if (!shareSlug) return
    const shareUrl = `${window.location.origin}/ai-kentei/c/${shareSlug}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: '生成AI活用ガイドライン検定 認定証',
          text: `${resolvedName}さんが生成AI活用ガイドライン検定に合格しました！`,
          url: shareUrl,
        })
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('共有URLをコピーしました')
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!certificateData) return null

  return (
    <div className="container py-8 md:py-12">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/ai-kentei/exam/${resolvedParams.sessionId}/result`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          結果に戻る
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Form */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-xl">認定証の発行</CardTitle>
              <CardDescription>
                認定証に表示する情報を入力してください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name selection */}
              <div className="space-y-3">
                <Label>認定証に表示する名前</Label>

                {profileInfo ? (
                  <RadioGroup
                    value={nameType}
                    onValueChange={(v) => setNameType(v as NameType)}
                    className="space-y-2"
                  >
                    {profileInfo.displayName && (
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="display" id="name-display" disabled={!!certificateId} />
                        <Label htmlFor="name-display" className="cursor-pointer flex-1">
                          <span className="text-xs text-muted-foreground block">表示名</span>
                          <span className="font-medium">{profileInfo.displayName}</span>
                        </Label>
                      </div>
                    )}
                    {profileInfo.legalName && (
                      <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="legal" id="name-legal" disabled={!!certificateId} />
                        <Label htmlFor="name-legal" className="cursor-pointer flex-1">
                          <span className="text-xs text-muted-foreground block">本名</span>
                          <span className="font-medium">{profileInfo.legalName}</span>
                        </Label>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="custom" id="name-custom" disabled={!!certificateId} />
                      <Label htmlFor="name-custom" className="cursor-pointer flex-1">
                        <span className="text-xs text-muted-foreground block">手動入力</span>
                      </Label>
                    </div>
                  </RadioGroup>
                ) : null}

                {(!profileInfo || nameType === 'custom') && (
                  <Input
                    placeholder="山田 太郎"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    disabled={!!certificateId}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  認定証に表示される名前です。本名でなくても構いません。
                </p>
                {profileInfo?.email && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    ✉ 発行後、{profileInfo.email} に認定証をメール送信します
                  </p>
                )}
              </div>

              {/* Photo upload */}
              <div className="space-y-2">
                <Label>プロフィール写真（任意）</Label>
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => !certificateId && fileInputRef.current?.click()}
                  >
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoUrl} alt="プロフィール" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={!!certificateId}
                  />
                  <div className="text-sm text-muted-foreground">
                    <p>クリックして写真をアップロード</p>
                    <p className="text-xs">JPG, PNG (最大5MB)</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!certificateId ? (
                <Button
                  onClick={handleGenerateCertificate}
                  disabled={generating || !resolvedName.trim()}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />発行中...</>
                  ) : '認定証を発行する'}
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button onClick={handleShare} className="w-full" size="lg">
                    <Share2 className="mr-2 h-4 w-4" />
                    共有する
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" asChild>
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/ai-kentei/c/${shareSlug}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                        </svg>
                        Facebook
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${resolvedName}さんが生成AI活用ガイドライン検定に合格しました！`)}&url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/ai-kentei/c/${shareSlug}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        X (Twitter)
                      </a>
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/ai-kentei/c/${shareSlug}`} target="_blank">
                      <Eye className="mr-2 h-4 w-4" />
                      認定証を表示
                    </Link>
                  </Button>

                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/mypage">
                      マイページで確認する
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">プレビュー</h3>
            <CertificatePreview
              name={resolvedName || 'お名前'}
              photoUrl={photoUrl}
              score={certificateData.score}
              totalQuestions={certificateData.totalQuestions}
              date={new Date(certificateData.passedAt)}
              certificateId={certificateId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
