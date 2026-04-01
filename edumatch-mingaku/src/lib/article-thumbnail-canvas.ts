import type { ThumbnailTemplateKind } from "@/lib/thumbnail-template";
import { getThumbnailTemplateImageUrl } from "@/lib/thumbnail-template";

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
 * テンプレ背景にタイトルを載せた PNG を生成（ブラウザのみ）
 */
export async function generateArticleThumbnailPng(options: {
  templateKind: ThumbnailTemplateKind;
  title: string;
}): Promise<Blob> {
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
  const areaTop = h * 0.12;
  const areaBottom = h * 0.58;
  const maxHeight = areaBottom - areaTop;

  let fontSize = Math.min(48, Math.floor(w / 22));
  const minSize = 20;
  let lines: string[] = [];
  const fontFamily =
    '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic UI","Yu Gothic",Meiryo,sans-serif';

  while (fontSize >= minSize) {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    lines = wrapLines(ctx, title, maxWidth);
    const lineHeight = fontSize * 1.38;
    const totalH = lines.length * lineHeight;
    if (totalH <= maxHeight) break;
    fontSize -= 2;
  }

  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  lines = wrapLines(ctx, title, maxWidth);
  const lineHeight = fontSize * 1.38;
  const totalH = lines.length * lineHeight;
  let y = areaTop + (maxHeight - totalH) / 2 + fontSize * 0.88;

  ctx.fillStyle = "rgba(30, 40, 60, 0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const cx = w / 2;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += lineHeight;
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
