/**
 * AI生成背景 + テキスト合成で YouTube 風サムネイルを生成（ブラウザ側）
 *
 * 背景画像はサーバー側（OpenAI gpt-image-1）で生成し、
 * タイトル文字・バッジはブラウザの Canvas で重ねて描画する。
 */

import {
  ensureNotoSansJpBold,
  wrapTitleForThumbnail,
} from "@/lib/article-thumbnail-canvas";

const NOTO_FAMILY = '"Noto Sans JP", sans-serif';

/** OG 画像サイズ（1200×630） */
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;

/** 背景画像を CORS 対応で読み込む（Canvas 汚染を避ける） */
function loadBackgroundImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error("背景画像の読み込みに失敗しました"));
    img.src = url;
  });
}

/** 背景をアスペクト比を保ったまま cover でキャンバス全面に描画する */
function drawBackgroundCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** 下部 60% に半透明の暗色グラデーションを重ねて文字の可読性を確保 */
function drawDarkOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const g = ctx.createLinearGradient(0, h * 0.4, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.4, "rgba(0,0,0,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h * 0.4, w, h * 0.6);
}

/** オレンジの角丸バッジを右下に描画 */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
): void {
  const fontSize = 30;
  ctx.font = `700 ${fontSize}px ${NOTO_FAMILY}`;
  const padX = 24;
  const padY = 14;
  const textWidth = ctx.measureText(text).width;
  const badgeW = textWidth + padX * 2;
  const badgeH = fontSize + padY * 2;
  const margin = 32;
  const x = w - margin - badgeW;
  const y = h - margin - badgeH;
  const radius = badgeH / 2;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.roundRect(x, y, badgeW, badgeH, radius);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + badgeW / 2, y + badgeH / 2 + 2);
}

/**
 * AI生成背景 + テキスト合成でYouTube風サムネイルを生成（ブラウザ側）
 */
export async function compositeYoutubeThumbnail(
  backgroundUrl: string,
  title: string,
  badgeText?: string,
): Promise<Blob> {
  await ensureNotoSansJpBold();
  const img = await loadBackgroundImage(backgroundUrl);

  const w = CANVAS_WIDTH;
  const h = CANVAS_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas が利用できません");

  // 1-2. 背景を cover で描画
  drawBackgroundCover(ctx, img, w, h);

  // 3. 下部の暗色オーバーレイ
  drawDarkOverlay(ctx, w, h);

  // 4. タイトルテキスト（太字白＋黒縁取り＋シャドウ）
  const cleanTitle = title.trim().slice(0, 80) || "タイトル未設定";
  const padLeft = 72;
  const padRight = 160;
  const maxWidth = w - padLeft - padRight;
  const textAreaHeight = h * 0.7;

  let fontSize = 72;
  const minSize = 36;
  let lines: string[] = [];
  let lineHeight = 0;

  while (fontSize >= minSize) {
    ctx.font = `900 ${fontSize}px ${NOTO_FAMILY}`;
    lines = wrapTitleForThumbnail(ctx, cleanTitle, maxWidth);
    lineHeight = fontSize * 1.35;
    if (lines.length * lineHeight <= textAreaHeight) break;
    fontSize -= 4;
  }

  ctx.font = `900 ${fontSize}px ${NOTO_FAMILY}`;
  lines = wrapTitleForThumbnail(ctx, cleanTitle, maxWidth);
  lineHeight = fontSize * 1.35;

  const centerY = h * 0.55;
  const firstLineCenterY = centerY - ((lines.length - 1) * lineHeight) / 2;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  for (let i = 0; i < lines.length; i++) {
    const y = firstLineCenterY + i * lineHeight;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    // 黒縁取り
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4 * 2; // stroke は中心線基準のため外側 4px を確保
    ctx.strokeText(lines[i], padLeft, y, maxWidth);
    ctx.restore();
    // 白本体
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(lines[i], padLeft, y, maxWidth);
  }

  // 5. バッジ（右下）
  if (badgeText?.trim()) {
    drawBadge(ctx, badgeText.trim(), w, h);
  }

  // 6. PNG Blob として返す
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error("画像の生成に失敗しました"));
      },
      "image/png",
      0.92,
    );
  });
}
