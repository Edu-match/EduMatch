'use client'

import { useEffect, useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Share2, Camera, Loader2, ArrowLeft, Eye, Award, Info } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { CertificatePreview } from '@/components/ai-kentei/certificate-preview'
import { CertificateDownloadButton } from '@/components/ai-kentei/certificate-download-button'
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

/** 認定証に載せる写真: なし / アカウントの画像 / この場でアップロード */
type PhotoSource = 'none' | 'account' | 'upload'

export default function CertificatePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const [certificateData, setCertificateData] = useState<CertificateData | null>(null)
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [nameType, setNameType] = useState<NameType>('custom')
  const [customName, setCustomName] = useState('')
  /** アカウントに保存されているプロフィール画像URL */
  const [accountAvatarUrl, setAccountAvatarUrl] = useState<string | null>(null)
  /** アップロードした画像（data URL） */
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null)
  const [photoSource, setPhotoSource] = useState<PhotoSource>('none')
  const [generating, setGenerating] = useState(false)
  const [certificateId, setCertificateId] = useState<string | null>(null)
  const [shareSlug, setShareSlug] = useState<string | null>(null)
  /** 発行後の公開設定（API応答）。未発行時は isPublicPage を参照 */
  const [issuedIsPublic, setIssuedIsPublic] = useState<boolean | null>(null)
  /** 発行前：共有用URLで誰でも閲覧可能にするか（デフォルトON） */
  const [isPublicPage, setIsPublicPage] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const publicSharingEnabled = issuedIsPublic !== null ? issuedIsPublic : isPublicPage

  const resolvedName = (() => {
    if (nameType === 'display') return profileInfo?.displayName ?? customName
    if (nameType === 'legal') return profileInfo?.legalName ?? customName
    return customName
  })()

  const effectivePhotoUrl: string | null =
    photoSource === 'account'
      ? accountAvatarUrl
      : photoSource === 'upload'
        ? uploadedPhotoUrl
        : null

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Certificate page - fetching result for session:', resolvedParams.sessionId)
        const response = await fetch(`/api/ai-kentei/exam/${resolvedParams.sessionId}/result`)
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to fetch data')
        }
        const data = await response.json()
        console.log('Certificate - result data:', data)

        if (!data.session.passed) {
          toast.error('合格者のみ認定証を発行できます')
          router.push(`/ai-kentei/exam/${resolvedParams.sessionId}/result`)
          return
        }

        setCertificateData({
          sessionId: data.session.sessionId,
          score: data.session.score,
          totalQuestions: data.questions.length > 0 ? data.questions.length : 25,
          passedAt: new Date().toISOString(),
        })

        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const res = await fetch('/api/ai-kentei/profile')
          if (res.ok) {
            const profileData = await res.json()
            const av = typeof profileData.avatar_url === 'string' && profileData.avatar_url.trim() !== ''
              ? profileData.avatar_url.trim()
              : null
            setAccountAvatarUrl(av)
            if (av) {
              setPhotoSource('account')
            }
            if (profileData.name) {
              setProfileInfo({
                displayName: profileData.name ?? null,
                legalName: profileData.legal_name ?? null,
                email: profileData.email ?? user.email ?? null,
              })
              setNameType('display')
            }
          }
        }
      } catch (err) {
        console.error('Certificate fetch error:', err)
        toast.error(err instanceof Error ? err.message : 'データの取得に失敗しました')
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
      reader.onloadend = () => {
        setUploadedPhotoUrl(reader.result as string)
        setPhotoSource('upload')
      }
      reader.readAsDataURL(file)
    }
    event.target.value = ''
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
          photoUrl: effectivePhotoUrl,
          nameType,
          isPublic: isPublicPage,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? 'Failed to generate certificate')
      }

      const data = await response.json()
      setCertificateId(data.certificateId)
      setShareSlug(data.shareSlug)
      if (typeof data.isPublic === 'boolean') {
        setIssuedIsPublic(data.isPublic)
      }
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
    if (!publicSharingEnabled) {
      toast.info('公開ページが無効のため、共有用URLはありません。マイページからご確認ください。')
      return
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!certificateData) return null

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-6xl mx-auto">
          <Link
            href={`/ai-kentei/exam/${resolvedParams.sessionId}/result`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            結果に戻る
          </Link>

          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <Card className="border-border/50 h-fit min-w-0">
              <CardHeader>
                <CardTitle className="text-xl">認定証の発行</CardTitle>
                <CardDescription>
                  認定証に表示する情報を入力してください
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 公開範囲の説明 */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex gap-2">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
                    <div className="space-y-2 text-sm text-foreground/90">
                      <p className="font-medium">認定証の公開について</p>
                      <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                        <li>
                          サイトにログインした<strong>ご本人</strong>は、いつでも<strong>マイページ</strong>から認定証を確認できます。
                        </li>
                        <li>
                          下の「共有用の公開ページ」を<strong>オン</strong>にすると、発行後に表示される<strong>共有URL</strong>を知っている人は、ログインなしで認定証ページを閲覧できます（掲載一覧に載るわけではなく、URLを知っている人だけが見られます）。
                        </li>
                        <li>
                          <strong>オフ</strong>にすると、共有用ページは表示されず、マイページからのみ確認できます。SNS共有ボタンも利用できません。
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 公開ページのオン/オフ（未発行時のみ変更可） */}
                {!certificateId && (
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Checkbox
                      id="public-page"
                      checked={isPublicPage}
                      onCheckedChange={(c) => setIsPublicPage(c === true)}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="public-page" className="text-sm font-medium leading-snug cursor-pointer">
                        共有用の公開ページを有効にする
                      </Label>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        オフにすると、共有URLによる閲覧はできません。マイページでのみ確認できます。
                      </p>
                    </div>
                  </div>
                )}

                {certificateId && (
                  <div className={`rounded-md border px-3 py-2 text-sm ${publicSharingEnabled ? 'border-amber-200 bg-amber-50/80 dark:bg-amber-950/30' : 'border-muted bg-muted/40'}`}>
                    {publicSharingEnabled ? (
                      <p>
                        <strong>公開ページ：有効</strong> — 共有URLを知っている人が認定証を閲覧できます。URLの取り扱いにご注意ください。
                      </p>
                    ) : (
                      <p>
                        <strong>公開ページ：無効</strong> — 共有用URLでは閲覧できません。マイページからご確認ください。
                      </p>
                    )}
                  </div>
                )}

                {/* Name selection */}
                <div className="space-y-3">
                  <Label>認定証に表示する名前</Label>

                  {profileInfo && (
                    <RadioGroup
                      value={nameType}
                      onValueChange={(v) => setNameType(v as NameType)}
                      className="space-y-2"
                    >
                      {profileInfo.displayName && (
                        <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${nameType === 'display' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                          <RadioGroupItem value="display" id="name-display" disabled={!!certificateId} />
                          <Label htmlFor="name-display" className="cursor-pointer flex-1">
                            <span className="text-xs text-muted-foreground block">表示名</span>
                            <span className="font-medium">{profileInfo.displayName}</span>
                          </Label>
                        </div>
                      )}
                      {profileInfo.legalName && (
                        <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${nameType === 'legal' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                          <RadioGroupItem value="legal" id="name-legal" disabled={!!certificateId} />
                          <Label htmlFor="name-legal" className="cursor-pointer flex-1">
                            <span className="text-xs text-muted-foreground block">本名</span>
                            <span className="font-medium">{profileInfo.legalName}</span>
                          </Label>
                        </div>
                      )}
                      <div className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${nameType === 'custom' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <RadioGroupItem value="custom" id="name-custom" disabled={!!certificateId} />
                        <Label htmlFor="name-custom" className="cursor-pointer flex-1">
                          <span className="text-xs text-muted-foreground block">手動入力</span>
                        </Label>
                      </div>
                    </RadioGroup>
                  )}

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
                    <p className="text-xs text-primary">
                      ✉ 発行後、{profileInfo.email} に認定証をメール送信します
                    </p>
                  )}
                </div>

                {/* プロフィール写真 */}
                <div className="space-y-3">
                  <Label>認定証に載せる写真</Label>
                  <RadioGroup
                    value={photoSource}
                    onValueChange={(v) => {
                      if (certificateId) return
                      setPhotoSource(v as PhotoSource)
                    }}
                    className="space-y-2"
                    disabled={!!certificateId}
                  >
                    <div
                      className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors ${photoSource === 'none' ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <RadioGroupItem value="none" id="photo-none" disabled={!!certificateId} />
                      <Label htmlFor="photo-none" className="flex-1 cursor-pointer text-sm">
                        写真を載せない
                      </Label>
                    </div>
                    {accountAvatarUrl ? (
                      <div
                        className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors ${photoSource === 'account' ? 'border-primary bg-primary/5' : 'border-border'}`}
                      >
                        <RadioGroupItem value="account" id="photo-account" disabled={!!certificateId} />
                        <Label htmlFor="photo-account" className="flex-1 cursor-pointer">
                          <span className="text-xs text-muted-foreground block">アカウントのプロフィール画像</span>
                          <span className="text-sm">登録中の画像をそのまま使う</span>
                        </Label>
                      </div>
                    ) : null}
                    <div
                      className={`flex items-center space-x-3 rounded-lg border p-3 transition-colors ${photoSource === 'upload' ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <RadioGroupItem value="upload" id="photo-upload" disabled={!!certificateId} />
                      <Label htmlFor="photo-upload" className="flex-1 cursor-pointer text-sm">
                        この場で画像をアップロード
                      </Label>
                    </div>
                  </RadioGroup>

                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => !certificateId && photoSource === 'upload' && fileInputRef.current?.click()}
                      role={!certificateId && photoSource === 'upload' ? 'button' : undefined}
                    >
                      {effectivePhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={effectivePhotoUrl} alt="" className="h-full w-full object-cover" />
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
                      disabled={!!certificateId || photoSource !== 'upload'}
                    />
                    <div className="min-w-0 text-sm text-muted-foreground">
                      {photoSource === 'upload' ? (
                        <>
                          <p>プレビューをクリックして写真を選べます</p>
                          <p className="text-xs">JPG, PNG（最大5MB）</p>
                        </>
                      ) : photoSource === 'account' ? (
                        <p className="text-xs">マイページのプロフィール画像が認定証に表示されます</p>
                      ) : (
                        <p className="text-xs">認定証には写真を表示しません</p>
                      )}
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
                    ) : (
                      <>認定証を発行する</>
                    )}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <CertificateDownloadButton
                      targetId="ai-kentei-certificate-canvas"
                      fileName={`ai-kentei-certificate-${certificateId}.png`}
                      className="w-full"
                    />
                    {publicSharingEnabled ? (
                      <>
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
                            認定証ページを開く
                          </Link>
                        </Button>
                      </>
                    ) : null}

                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/mypage">
                        <Award className="mr-2 h-4 w-4" />
                        マイページで確認する
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 min-w-0 lg:sticky lg:top-24">
              <h3 className="text-lg font-semibold text-foreground">プレビュー</h3>
              <div id="ai-kentei-certificate-canvas">
                <CertificatePreview
                  name={resolvedName || 'お名前'}
                  photoUrl={effectivePhotoUrl}
                  score={certificateData.score}
                  totalQuestions={certificateData.totalQuestions}
                  date={new Date(certificateData.passedAt)}
                  certificateId={certificateId}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
