import type {
  ThumbnailStyleKind,
  ThumbnailTemplateKind,
} from "@/lib/thumbnail-template";
import { resolveThumbnailStyle } from "@/lib/thumbnail-template";

const NOTO_FAMILY = '"Noto Sans JP", sans-serif';

/** OG 画像サイズ（1200×630） */
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;

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

/* ------------------------------------------------------------------ */
/* 日本語向けの自然な折り返し                                          */
/* ------------------------------------------------------------------ */

/** 全角スペース（U+3000）：この位置では必ず改行する */
const IDEOGRAPHIC_SPACE = "　";

/** 行頭に来てはいけない文字（閉じ括弧・句読点など） */
const LINE_START_FORBIDDEN = "、。，．・：；？！ゝゞヽヾー々〜…‥ぁぃぅぇぉっゃゅょァィゥェォッャュョ）」』】〕》〉,.?!:;)]}";

/** 行末に来てはいけない文字（開き括弧など） */
const LINE_END_FORBIDDEN = "（「『【〔《〈([{";

/** この助詞の直後は改行しやすい（自然な切れ目） */
const PARTICLES = new Set(["は", "が", "の", "を", "に", "で", "と", "も", "へ", "や"]);

/** 読点・句点など、この直後は改行しやすい */
const PUNCT_BREAK = "、。！？，．";

/**
 * タイトルを折り返し単位のチャンクに分割する。
 * 英単語・数字・カタカナ語は途中で切らないよう 1 チャンクにまとめる。
 */
function tokenizeTitle(text: string): string[] {
  const re = /[A-Za-z0-9_@#$%&+./:'’’-]+|[ァ-ヴーヵヶ]+|[０-９]+|\s+|./gu;
  return text.match(re) ?? [];
}

/**
 * チャンク i の直後で改行できるかの品質を返す。
 * 0 = 禁止 / 1 = 可 / 2 = 自然な切れ目（優先）
 */
function breakQualityAfter(chunks: string[], i: number): number {
  if (i >= chunks.length - 1) return 0;
  const cur = chunks[i];
  const next = chunks[i + 1];
  const curLast = cur[cur.length - 1];
  if (LINE_END_FORBIDDEN.includes(curLast)) return 0;
  if (LINE_START_FORBIDDEN.includes(next[0])) return 0;
  if (PUNCT_BREAK.includes(curLast)) return 2;
  if (/^\s+$/.test(cur)) return 2;
  // 助詞の直後（ただし助詞が連続する場合は最後の助詞の後で切る）
  if (
    cur.length === 1 &&
    PARTICLES.has(cur) &&
    !(next.length === 1 && PARTICLES.has(next))
  ) {
    return 2;
  }
  return 1;
}

/**
 * 幅に収まるよう自然な位置で折り返す。
 * - 句読点・助詞の直後を優先して改行
 * - 英単語・カタカナ語の途中では改行しない
 * - 行頭禁則（句読点・閉じ括弧が行頭に来ない）
 */
function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const chunks = tokenizeTitle(text);
  const quality = chunks.map((_, i) => breakQualityAfter(chunks, i));
  const lines: string[] = [];
  let start = 0;

  while (start < chunks.length) {
    let lineStr = "";
    let lastPreferred = -1;
    let lastAllowed = -1;
    let i = start;

    for (; i < chunks.length; i++) {
      const test = lineStr + chunks[i];
      if (ctx.measureText(test.trimEnd()).width > maxWidth) break;
      lineStr = test;
      if (quality[i] === 2) lastPreferred = i;
      else if (quality[i] === 1) lastAllowed = i;
    }

    if (i >= chunks.length) {
      lines.push(lineStr);
      break;
    }

    // 改行位置の決定
    let breakAfter = -1;
    if (lastPreferred >= start) {
      const w = ctx.measureText(
        chunks.slice(start, lastPreferred + 1).join("").trimEnd()
      ).width;
      // 早すぎる位置で切ると行がスカスカになるため、幅の半分以上を条件にする
      if (w >= maxWidth * 0.5) breakAfter = lastPreferred;
    }
    if (breakAfter < 0 && lastAllowed >= start) breakAfter = lastAllowed;
    if (breakAfter < 0 && lastPreferred >= start) breakAfter = lastPreferred;

    if (breakAfter < 0) {
      if (i > start) {
        // 禁則を守れる位置がない場合は直前で切る（最終手段）
        breakAfter = i - 1;
      } else {
        // 1 チャンクだけで幅を超える長い単語：文字単位で分割
        const chunk = chunks[start];
        let part = "";
        let idx = 0;
        for (; idx < chunk.length; idx++) {
          const t = part + chunk[idx];
          if (part && ctx.measureText(t).width > maxWidth) break;
          part = t;
        }
        lines.push(part);
        chunks[start] = chunk.slice(idx);
        continue;
      }
    }

    lines.push(chunks.slice(start, breakAfter + 1).join(""));
    start = breakAfter + 1;
  }

  return lines.map((l) => l.trim()).filter((l) => l.length > 0);
}

/**
 * 全角スペースの位置で必ず改行し、各ブロックは自然な位置で折り返す
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

/* ------------------------------------------------------------------ */
/* スタイル別の背景描画                                                */
/* ------------------------------------------------------------------ */

interface TextLayout {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  /** 1 行目の中心 Y */
  firstLineCenterY: number;
  /** テキストの描画 X（align に応じて中心 or 左端） */
  textX: number;
  align: "center" | "left";
}

interface StyleRenderer {
  textColor: string;
  align: "center" | "left";
  padLeft: number;
  padRight: number;
  drawBackground: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  /** テキスト配置決定後に描く装飾（アクセントバーなど） */
  drawAccent?: (ctx: CanvasRenderingContext2D, layout: TextLayout) => void;
}

/** 決定論的な擬似乱数（スプラッシュ配置用） */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawSoftGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** 有機的なブロブ（ゆるいイラスト風の丸） */
function drawBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  seed: number
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  const points = 8;
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * Math.PI * 2;
    const wobble = 1 + (pseudoRandom(seed + i) - 0.5) * 0.25;
    const px = cx + Math.cos(angle) * r * wobble;
    const py = cy + Math.sin(angle) * r * wobble;
    if (i === 0) ctx.moveTo(px, py);
    else {
      const prevAngle = ((i - 0.5) / points) * Math.PI * 2;
      const midWobble = 1 + (pseudoRandom(seed + i + 100) - 0.5) * 0.25;
      const mx = cx + Math.cos(prevAngle) * r * midWobble * 1.05;
      const my = cy + Math.sin(prevAngle) * r * midWobble * 1.05;
      ctx.quadraticCurveTo(mx, my, px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

/** 絵の具のスプラッシュ（中心ブロブ＋飛沫） */
function drawSplash(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
  seed: number
): void {
  ctx.fillStyle = color;
  drawBlob(ctx, cx, cy, r, color, seed);
  const drops = 7;
  for (let i = 0; i < drops; i++) {
    const angle = pseudoRandom(seed * 3 + i) * Math.PI * 2;
    const dist = r * (1.2 + pseudoRandom(seed * 5 + i) * 1.4);
    const dr = r * (0.08 + pseudoRandom(seed * 7 + i) * 0.18);
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, dr, 0, Math.PI * 2);
    ctx.fill();
  }
}

const STYLE_RENDERERS: Record<ThumbnailStyleKind, StyleRenderer> = {
  /* 1. やわらかいパステルグラデーション */
  gradient: {
    textColor: "#41365a",
    align: "center",
    padLeft: 110,
    padRight: 110,
    drawBackground: (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#fcd3e1");
      g.addColorStop(0.5, "#e6d6f5");
      g.addColorStop(1, "#c5d8f7");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // 柔らかい光のにじみ
      drawSoftGlow(ctx, w * 0.2, h * 0.15, 320, "rgba(255,255,255,0.45)");
      drawSoftGlow(ctx, w * 0.85, h * 0.85, 380, "rgba(255,255,255,0.35)");
      drawSoftGlow(ctx, w * 0.75, h * 0.1, 220, "rgba(255,240,250,0.4)");
    },
  },

  /* 2. ゆるくて温かい手描きイラスト風 */
  illustration: {
    textColor: "#5b4636",
    align: "center",
    padLeft: 130,
    padRight: 130,
    drawBackground: (ctx, w, h) => {
      ctx.fillStyle = "#fff6e9";
      ctx.fillRect(0, 0, w, h);
      // 大きなミントのブロブ（左上・見切れ）
      drawBlob(ctx, w * 0.06, h * 0.08, 190, "#cdeedd", 11);
      // ピーチのブロブ（右下・見切れ）
      drawBlob(ctx, w * 0.94, h * 0.92, 210, "#ffd9c0", 23);
      // 小さなクリーム色の太陽っぽい丸（右上）
      drawBlob(ctx, w * 0.88, h * 0.14, 80, "#ffe6a8", 31);
      // 小さなミントのアクセント（左下）
      drawBlob(ctx, w * 0.12, h * 0.86, 60, "#d9f0e4", 43);
      // 手描き風の点々
      ctx.fillStyle = "rgba(91,70,54,0.18)";
      const dots: Array<[number, number]> = [
        [0.26, 0.12],
        [0.3, 0.16],
        [0.72, 0.85],
        [0.68, 0.9],
      ];
      for (const [dx, dy] of dots) {
        ctx.beginPath();
        ctx.arc(w * dx, h * dy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },

  /* 3. ダーク×グリッドのテック調 */
  tech: {
    textColor: "#eef5ff",
    align: "left",
    padLeft: 110,
    padRight: 110,
    drawBackground: (ctx, w, h) => {
      // ダークネイビーの下地（わずかにグラデーション）
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#0b1220");
      g.addColorStop(1, "#101a30");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // グリッド
      ctx.strokeStyle = "rgba(94,168,255,0.10)";
      ctx.lineWidth = 1;
      const step = 48;
      for (let x = step; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = step; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      // 回路パターン（右上）
      ctx.strokeStyle = "rgba(34,211,238,0.35)";
      ctx.lineWidth = 2;
      const traces: number[][][] = [
        [
          [w - 48, 96],
          [w - 192, 96],
          [w - 192, 192],
          [w - 336, 192],
        ],
        [
          [w - 96, 48],
          [w - 96, 144],
          [w - 240, 144],
          [w - 240, 240],
        ],
        // 左下にも少し
        [
          [48, h - 96],
          [192, h - 96],
          [192, h - 192],
        ],
      ];
      for (const trace of traces) {
        ctx.beginPath();
        trace.forEach(([x, y], i) => {
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        // 端点にノード
        ctx.fillStyle = "rgba(34,211,238,0.5)";
        for (const [x, y] of [trace[0], trace[trace.length - 1]]) {
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 下部のアクセントライン
      const line = ctx.createLinearGradient(0, 0, w, 0);
      line.addColorStop(0, "#22d3ee");
      line.addColorStop(1, "#3b82f6");
      ctx.fillStyle = line;
      ctx.fillRect(0, h - 10, w, 10);
    },
    drawAccent: (ctx, layout) => {
      // タイトル上の小さなアクセントバー
      const topY =
        layout.firstLineCenterY - layout.lineHeight / 2 - layout.fontSize * 0.6;
      ctx.fillStyle = "#22d3ee";
      ctx.fillRect(layout.textX, Math.max(40, topY), 96, 8);
    },
  },

  /* 4. 白基調×アクセントバーのコーポレート調 */
  professional: {
    textColor: "#1f2937",
    align: "left",
    padLeft: 160,
    padRight: 110,
    drawBackground: (ctx, w, h) => {
      ctx.fillStyle = "#f6f8fb";
      ctx.fillRect(0, 0, w, h);
      // 左の太いアクセントバー
      ctx.fillStyle = "#1d5bd8";
      ctx.fillRect(0, 0, 84, h);
      // アクセントバーの内側に細いセカンダリライン
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(84, 0, 10, h);
      // 右下にごく薄いブランド帯
      ctx.fillStyle = "rgba(29,91,216,0.06)";
      ctx.fillRect(0, h - 72, w, 72);
    },
    drawAccent: (ctx, layout) => {
      // タイトル下の短いアンダーライン
      const bottomY =
        layout.firstLineCenterY +
        (layout.lines.length - 1) * layout.lineHeight +
        layout.lineHeight / 2 +
        layout.fontSize * 0.45;
      ctx.fillStyle = "#1d5bd8";
      ctx.fillRect(layout.textX, Math.min(bottomY, CANVAS_HEIGHT - 100), 120, 8);
    },
  },

  /* 5. 絵の具スプラッシュのクリエイティブ調 */
  creative: {
    textColor: "#24252d",
    align: "center",
    padLeft: 150,
    padRight: 150,
    drawBackground: (ctx, w, h) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.globalAlpha = 0.9;
      drawSplash(ctx, w * 0.08, h * 0.14, 70, "#ff5a7a", 7);
      drawSplash(ctx, w * 0.92, h * 0.16, 58, "#ffc233", 17);
      drawSplash(ctx, w * 0.9, h * 0.86, 74, "#00b8a9", 29);
      drawSplash(ctx, w * 0.1, h * 0.84, 56, "#7c4dff", 41);
      ctx.restore();
      // 中央付近を白く保つためのビネット
      const g = ctx.createRadialGradient(
        w / 2,
        h / 2,
        h * 0.2,
        w / 2,
        h / 2,
        h * 0.75
      );
      g.addColorStop(0, "rgba(255,255,255,0.7)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
  },
};

/* ------------------------------------------------------------------ */
/* サムネイル生成                                                      */
/* ------------------------------------------------------------------ */

function renderThumbnailCanvas(
  templateKind: ThumbnailTemplateKind,
  rawTitle: string
): HTMLCanvasElement {
  const style = resolveThumbnailStyle(templateKind);
  const renderer = STYLE_RENDERERS[style];
  const title = rawTitle.trim().slice(0, 80) || "タイトル未設定";

  const w = CANVAS_WIDTH;
  const h = CANVAS_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas が利用できません");

  renderer.drawBackground(ctx, w, h);

  const maxWidth = w - renderer.padLeft - renderer.padRight;
  /** 下部はロゴ帯として少し空け、全体の見た目の中心に近づける */
  const marginTop = h * 0.1;
  const marginBottom = h * 0.22;
  const textAreaHeight = h - marginTop - marginBottom;
  const centerY = marginTop + textAreaHeight / 2;

  let fontSize = 64;
  const minSize = 28;
  let lines: string[] = [];

  while (fontSize >= minSize) {
    ctx.font = `700 ${fontSize}px ${NOTO_FAMILY}`;
    lines = wrapTitleForThumbnail(ctx, title, maxWidth);
    const lineHeight = fontSize * 1.4;
    const totalH = lines.length * lineHeight;
    if (totalH <= textAreaHeight) break;
    fontSize -= 2;
  }

  ctx.font = `700 ${fontSize}px ${NOTO_FAMILY}`;
  lines = wrapTitleForThumbnail(ctx, title, maxWidth);
  const lineHeight = fontSize * 1.4;

  const align = renderer.align;
  const textX = align === "center" ? w / 2 : renderer.padLeft;
  const firstLineCenterY = centerY - ((lines.length - 1) * lineHeight) / 2;

  const layout: TextLayout = {
    lines,
    fontSize,
    lineHeight,
    firstLineCenterY,
    textX,
    align,
  };

  renderer.drawAccent?.(ctx, layout);

  ctx.fillStyle = renderer.textColor;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px ${NOTO_FAMILY}`;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], textX, firstLineCenterY + i * lineHeight, maxWidth);
  }

  return canvas;
}

export interface GenerateThumbnailOptions {
  /** 新スタイル（gradient 等）または旧カテゴリ（domestic 等）を指定可能 */
  templateKind: ThumbnailTemplateKind;
  title: string;
}

/**
 * スタイル背景＋タイトルの PNG を生成（ブラウザのみ）
 */
export async function generateArticleThumbnailPng(
  options: GenerateThumbnailOptions
): Promise<Blob> {
  await ensureNotoSansJpBold();
  const canvas = renderThumbnailCanvas(options.templateKind, options.title);
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

/**
 * ライブプレビュー用に Data URL で生成（ブラウザのみ）
 */
export async function generateArticleThumbnailDataUrl(
  options: GenerateThumbnailOptions
): Promise<string> {
  await ensureNotoSansJpBold();
  const canvas = renderThumbnailCanvas(options.templateKind, options.title);
  return canvas.toDataURL("image/png");
}
