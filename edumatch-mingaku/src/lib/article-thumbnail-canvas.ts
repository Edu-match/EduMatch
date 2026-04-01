import type { ThumbnailTemplateKind } from "@/lib/thumbnail-template";
import { getThumbnailTemplateImageUrl } from "@/lib/thumbnail-template";

const NOTO_FAMILY = '"Noto Sans JP", sans-serif';

/** Canvas 用に Google Fonts の Noto Sans JP (700) を読み込む */
async function ensureNotoSansJpBold(): Promise<void> {
  if (typeof document === "undefined") return;
  const id = "edumatch-noto-sans-jp-canvas";
  if (!document.getElementById(id)) {
    await new Promise<void>((resolve, reject) => {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=swap";
      link.onload = () => resolve();
      link.onerror = () => reject(new Error("フォントの読み込みに失敗しました"));
      document.head.appendChild(link);
    });
  }
  await document.fonts.ready;
  await document.fonts.load(`700 48px "Noto Sans JP"`);
}

/** 全角スペース（U+3000） */
const IDEOGRAPHIC_SPACE = "\u3000";

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * 全角スペースの位置で必ず改行し、各ブロックは幅に収まるよう折り返す
 */
function wrapTitleForThumbnail(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const segments = text
    .split(IDEOGRAPHIC_SPACE)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (segments.length === 0) {
    return wrapLines(ctx, text, maxWidth);
  }
  const out: string[] = [];
  for (const seg of segments) {
    out.push(...wrapLines(ctx, seg, maxWidth));
  }
  return out;
}

/**
 * テンプレ背景にタイトルを載せた PNG を生成（ブラウザのみ）
 * タイトルは上下左右ともセンター（ロゴ想定の下余白を除いたエリアの中央）
 */
export async function generateArticleThumbnailPng(options: {
  templateKind: ThumbnailTemplateKind;
  title: string;
}): Promise<Blob> {
  await ensureNotoSansJpBold();

  const title = options.title.trim().slice(0, 80) || "タイトル未設定";
  const src = getThumbnailTemplateImageUrl(options.templateKind);

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("テンプレート画像の読み込みに失敗しました"));
    el.src = src;
  });

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas が利用できません");

  ctx.drawImage(img, 0, 0);

  const padX = w * 0.08;
  const maxWidth = w - padX * 2;
  /** 下部はロゴ帯として少し空け、全体の見た目の中心に近づける */
  const marginTop = h * 0.1;
  const marginBottom = h * 0.22;
  const textAreaHeight = h - marginTop - marginBottom;
  const centerY = marginTop + textAreaHeight / 2;

  let fontSize = Math.min(48, Math.floor(w / 22));
  const minSize = 20;
  let lines: string[] = [];

  while (fontSize >= minSize) {
    ctx.font = `700 ${fontSize}px ${NOTO_FAMILY}`;
    lines = wrapTitleForThumbnail(ctx, title, maxWidth);
    const lineHeight = fontSize * 1.35;
    const totalH = lines.length * lineHeight;
    if (totalH <= textAreaHeight) break;
    fontSize -= 2;
  }

  ctx.font = `700 ${fontSize}px ${NOTO_FAMILY}`;
  lines = wrapTitleForThumbnail(ctx, title, maxWidth);
  const lineHeight = fontSize * 1.35;
  const totalH = lines.length * lineHeight;

  ctx.fillStyle = "rgba(30, 40, 60, 0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const cx = w / 2;
  const firstLineCenterY = centerY - ((lines.length - 1) * lineHeight) / 2;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, firstLineCenterY + i * lineHeight);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("画像の生成に失敗しました"));
      },
      "image/png",
      0.92
    );
  });
}
