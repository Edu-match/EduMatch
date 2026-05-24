/** 認定証テンプレート原寸（certificate-template.jpg） */
export const CERTIFICATE_WIDTH = 1024
export const CERTIFICATE_HEIGHT = 723

/** viewBox 座標（テンプレート上で合成確認済み） */
export const CERTIFICATE_TEXT_POS = {
  name: { x: 660, y: 430, fontSize: 32, fontWeight: 600 },
  date: { x: 520, y: 500, fontSize: 24, fontWeight: 400 },
  certificateId: { x: 520, y: 535, fontSize: 24, fontWeight: 400 },
} as const

const TEMPLATE_SRC = '/ai-kentei/certificate-template.jpg'
const MINCHO_FAMILY = '"Shippori Mincho", serif'

async function ensureShipporiMincho(): Promise<void> {
  if (typeof document === 'undefined') return

  const id = 'edumatch-shippori-mincho-canvas'
  if (!document.getElementById(id)) {
    await new Promise<void>((resolve, reject) => {
      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href =
        'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;600&display=swap'
      link.onload = () => resolve()
      link.onerror = () => reject(new Error('フォントの読み込みに失敗しました'))
      document.head.appendChild(link)
    })
  }

  await document.fonts.ready
  await Promise.all([
    document.fonts.load(`400 24px ${MINCHO_FAMILY}`),
    document.fonts.load(`600 32px ${MINCHO_FAMILY}`),
  ])
}

function formatCertificateDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function loadTemplateImage(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () =>
      reject(new Error('認定証テンプレート画像の読み込みに失敗しました'))
    img.src = TEMPLATE_SRC
  })
}

/**
 * 認定証テンプレートに氏名・日付・認定証番号を載せた PNG を生成（ブラウザのみ）
 */
export async function generateCertificatePng(options: {
  name: string
  date: Date | string
  certificateId: string
}): Promise<Blob> {
  await ensureShipporiMincho()

  const img = await loadTemplateImage()
  const canvas = document.createElement('canvas')
  canvas.width = CERTIFICATE_WIDTH
  canvas.height = CERTIFICATE_HEIGHT

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas が利用できません')

  ctx.drawImage(img, 0, 0, CERTIFICATE_WIDTH, CERTIFICATE_HEIGHT)

  const parsedDate =
    options.date instanceof Date ? options.date : new Date(options.date)

  const name = options.name.trim() || '受験者名'
  const dateText = formatCertificateDate(parsedDate)
  const { name: namePos, date: datePos, certificateId: idPos } =
    CERTIFICATE_TEXT_POS

  ctx.fillStyle = '#1a1a1a'
  ctx.textBaseline = 'alphabetic'

  ctx.font = `${namePos.fontWeight} ${namePos.fontSize}px ${MINCHO_FAMILY}`
  ctx.textAlign = 'right'
  ctx.fillText(name, namePos.x, namePos.y)

  ctx.font = `${datePos.fontWeight} ${datePos.fontSize}px ${MINCHO_FAMILY}`
  ctx.textAlign = 'left'
  ctx.fillText(dateText, datePos.x, datePos.y)

  ctx.font = `${idPos.fontWeight} ${idPos.fontSize}px ${MINCHO_FAMILY}`
  ctx.fillText(options.certificateId, idPos.x, idPos.y)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('画像の生成に失敗しました'))
      },
      'image/png',
      1
    )
  })
}
